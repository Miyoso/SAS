import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import { verifyToken } from './utils/auth.js';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 1. Vérifier le token
  const user = verifyToken(req);
  if (!user) {
    return res.status(401).json({ error: 'Session expirée' });
  }

  const { oldPassword, newPassword } = req.body;

  if (!oldPassword || !newPassword) {
    return res.status(400).json({ error: 'Champs manquants' });
  }

  try {
    // 2. Récupérer le mot de passe actuel hashé
    const result = await pool.query('SELECT password FROM agents WHERE id = $1', [user.userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Utilisateur introuvable' });
    }

    const currentHash = result.rows[0].password;

    // 3. Vérifier que l'ancien mot de passe est bon
    const match = await bcrypt.compare(oldPassword, currentHash);
    if (!match) {
      return res.status(403).json({ error: 'ANCIEN MOT DE PASSE INCORRECT' });
    }

    // 4. Hasher le nouveau mot de passe
    const newHash = await bcrypt.hash(newPassword, 10);

    // 5. Mettre à jour en base
    await pool.query('UPDATE agents SET password = $1 WHERE id = $2', [newHash, user.userId]);

    return res.status(200).json({ message: 'MOT DE PASSE MIS À JOUR' });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erreur Serveur' });
  }
}