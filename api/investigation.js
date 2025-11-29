import { Pool } from 'pg';
import Pusher from 'pusher';
import { verifyToken } from './utils/auth.js';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Initialisation sécurisée de Pusher
let pusher = null;
try {
  if (process.env.PUSHER_APP_ID && process.env.PUSHER_KEY && process.env.PUSHER_SECRET) {
    pusher = new Pusher({
      appId: process.env.PUSHER_APP_ID,
      key: process.env.PUSHER_KEY,
      secret: process.env.PUSHER_SECRET,
      cluster: process.env.PUSHER_CLUSTER || 'eu',
      useTLS: true
    });
  } else {
    console.warn("⚠️ PUSHER NON CONFIGURÉ (Variables manquantes)");
  }
} catch (e) {
  console.error("Erreur init Pusher:", e);
}

// Fonction utilitaire pour envoyer sans faire planter l'API
async function sendPusherEvent(channel, event, data) {
  if (!pusher) return;
  try {
    await pusher.trigger(channel, event, data);
  } catch (error) {
    console.error("Erreur envoi Pusher:", error);
  }
}

export default async function handler(req, res) {
  const user = verifyToken(req);

  if (!user) {
    return res.status(401).json({ error: 'UNAUTHORIZED: Secure Link Required' });
  }

  const method = req.method;

  try {
    if (method === 'GET') {
      const nodes = await pool.query('SELECT * FROM investigation_nodes ORDER BY id ASC');
      const links = await pool.query('SELECT * FROM investigation_links');
      return res.status(200).json({ nodes: nodes.rows, links: links.rows });
    }

    if (method === 'POST') {
      const { action } = req.body;

      if (action === 'create_link') {
        const { from_id, to_id, color } = req.body;

        const check = await pool.query('SELECT * FROM investigation_links WHERE from_id=$1 AND to_id=$2', [from_id, to_id]);
        if (check.rows.length > 0) return res.status(200).json({ message: 'Exists' });

        await pool.query(
            'INSERT INTO investigation_links (from_id, to_id, color) VALUES ($1, $2, $3)',
            [from_id, to_id, color || '#ff3333']
        );

        // Notification sécurisée
        await sendPusherEvent('investigation-board', 'link-created', {
          from_id, to_id, color: color || '#ff3333'
        });

        return res.status(200).json({ success: true });
      }
      else if (action === 'create_node') {
        const { type, label, sub_label, image_url, x, y } = req.body;
        const result = await pool.query(
            'INSERT INTO investigation_nodes (type, label, sub_label, image_url, x, y) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
            [type, label, sub_label, image_url, x, y]
        );
        const newNode = result.rows[0];

        // Notification sécurisée
        await sendPusherEvent('investigation-board', 'node-created', newNode);

        return res.status(200).json(newNode);
      }
    }

    if (method === 'PUT') {
      const { id, x, y } = req.body;
      await pool.query('UPDATE investigation_nodes SET x = $1, y = $2 WHERE id = $3', [x, y, id]);

      // Notification sécurisée
      await sendPusherEvent('investigation-board', 'node-moved', {
        id, x, y, mover_id: user.userId
      });

      return res.status(200).json({ success: true });
    }

    if (method === 'DELETE') {
      const { id } = req.body;
      await pool.query('DELETE FROM investigation_nodes WHERE id = $1', [id]);

      // Notification sécurisée
      await sendPusherEvent('investigation-board', 'node-deleted', { id });

      return res.status(200).json({ success: true });
    }

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Database Error' });
  }
}