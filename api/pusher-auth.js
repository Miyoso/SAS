// api/pusher-auth.js
import Pusher from 'pusher';
// Importe ta logique de session (adapte selon ton api/utils/auth.js)
// Ici je simule une récupération basique pour l'exemple
import { verifyToken } from './utils/auth.js';

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID,
  key: process.env.PUSHER_KEY,
  secret: process.env.PUSHER_SECRET,
  cluster: process.env.PUSHER_CLUSTER,
  useTLS: true
});

export default async function handler(req, res) {
  // 1. Vérifier que l'utilisateur est bien un agent connecté
  // (Adapte ceci à ton système de cookie/token actuel)
  const token = req.cookies.sas_token;
  if (!token) return res.status(403).send('Forbidden');

  // Décoder le token pour avoir le nom de l'agent (ex: "Graves")
  // const user = verifyToken(token);
  // Pour l'exemple, on imagine qu'on reçoit les infos dans le body
  // (dans la vraie vie, fie-toi au cookie sécurisé)
  const socketId = req.body.socket_id;
  const channel = req.body.channel_name;

  // Données de l'agent visible par les autres
  const presenceData = {
    user_id: "agent_" + Math.random().toString(36).substr(2, 9), // ID unique
    user_info: {
      name: req.body.username || "Agent Inconnu", // Nom affiché
      color: req.body.color || "#00ff9d" // Couleur du curseur
    }
  };

  // 2. Autoriser la connexion Pusher
  const authResponse = pusher.authorizeChannel(socketId, channel, presenceData);
  res.send(authResponse);
}