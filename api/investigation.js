import { Pool } from 'pg';
import Pusher from 'pusher';
import { verifyToken } from './utils/auth.js';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// CONFIGURATION PUSHER AVEC VOS CLÉS (Intégrées directement)
// Note : En production, ne laissez jamais le 'secret' dans le code visible.
const pusher = new Pusher({
  appId: "2084549",
  key: "51d51cc5bfc1c8ee90d4",
  secret: "b3a325fcecbfabc17f57",
  cluster: "eu",
  useTLS: true
});

export default async function handler(req, res) {
  const user = verifyToken(req);

  // Sécurité : On vérifie que l'utilisateur est connecté
  if (!user) {
    return res.status(401).json({ error: 'UNAUTHORIZED: Secure Link Required' });
  }

  const method = req.method;

  try {
    // --- GET : Récupérer les données ---
    if (method === 'GET') {
      const nodes = await pool.query('SELECT * FROM investigation_nodes ORDER BY id ASC');
      const links = await pool.query('SELECT * FROM investigation_links');
      return res.status(200).json({ nodes: nodes.rows, links: links.rows });
    }

    // --- POST : Créations (Liens ou Noeuds) ---
    if (method === 'POST') {
      const { action } = req.body;

      if (action === 'create_link') {
        const { from_id, to_id, color } = req.body;

        // Vérifier si le lien existe déjà
        const check = await pool.query('SELECT * FROM investigation_links WHERE from_id=$1 AND to_id=$2', [from_id, to_id]);
        if (check.rows.length > 0) return res.status(200).json({ message: 'Exists' });

        // Insérer en base
        await pool.query(
            'INSERT INTO investigation_links (from_id, to_id, color) VALUES ($1, $2, $3)',
            [from_id, to_id, color || '#ff3333']
        );

        // 📡 NOTIFIER TOUT LE MONDE
        try {
          await pusher.trigger('investigation-board', 'link-created', {
            from_id, to_id, color: color || '#ff3333'
          });
        } catch (e) { console.error("Erreur Pusher Link:", e); }

        return res.status(200).json({ success: true });
      }
      else if (action === 'create_node') {
        const { type, label, sub_label, image_url, x, y } = req.body;

        // Insérer en base
        const result = await pool.query(
            'INSERT INTO investigation_nodes (type, label, sub_label, image_url, x, y) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
            [type, label, sub_label, image_url, x, y]
        );
        const newNode = result.rows[0];

        // 📡 NOTIFIER TOUT LE MONDE
        try {
          await pusher.trigger('investigation-board', 'node-created', newNode);
        } catch (e) { console.error("Erreur Pusher Node:", e); }

        return res.status(200).json(newNode);
      }
    }

    // --- PUT : Déplacements ---
    if (method === 'PUT') {
      const { id, x, y } = req.body;
      await pool.query('UPDATE investigation_nodes SET x = $1, y = $2 WHERE id = $3', [x, y, id]);

      // 📡 NOTIFIER LE DÉPLACEMENT
      try {
        await pusher.trigger('investigation-board', 'node-moved', {
          id, x, y, mover_id: user.userId
        });
      } catch (e) { console.error("Erreur Pusher Move:", e); }

      return res.status(200).json({ success: true });
    }

    // --- DELETE : Suppressions ---
    if (method === 'DELETE') {
      const { id } = req.body;
      await pool.query('DELETE FROM investigation_nodes WHERE id = $1', [id]);

      // 📡 NOTIFIER LA SUPPRESSION
      try {
        await pusher.trigger('investigation-board', 'node-deleted', { id });
      } catch (e) { console.error("Erreur Pusher Delete:", e); }

      return res.status(200).json({ success: true });
    }

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Database Error' });
  }
}