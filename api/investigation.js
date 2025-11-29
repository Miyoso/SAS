import { Pool } from 'pg';
import { verifyToken } from './utils/auth.js';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

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
        return res.status(200).json({ success: true });
      }
      else {
        const { type, label, sub_label, image_url, x, y } = req.body;
        const result = await pool.query(
          'INSERT INTO investigation_nodes (type, label, sub_label, image_url, x, y) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
          [type, label, sub_label, image_url, x, y]
        );
        return res.status(200).json(result.rows[0]);
      }
    }

    if (method === 'PUT') {
      const { id, x, y } = req.body;
      await pool.query('UPDATE investigation_nodes SET x = $1, y = $2 WHERE id = $3', [x, y, id]);
      return res.status(200).json({ success: true });
    }

    if (method === 'DELETE') {
      const { id } = req.body;
      await pool.query('DELETE FROM investigation_nodes WHERE id = $1', [id]);
      return res.status(200).json({ success: true });
    }

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Database Error' });
  }
}