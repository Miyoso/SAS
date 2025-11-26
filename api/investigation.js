import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

export default async function handler(req, res) {
  const method = req.method;

  try {
    // 1. GET : Récupérer tout le tableau (Nodes + Liens)
    if (method === 'GET') {
      const nodes = await pool.query('SELECT * FROM investigation_nodes');
      const links = await pool.query('SELECT * FROM investigation_links');
      
      return res.status(200).json({
        nodes: nodes.rows,
        links: links.rows
      });
    }

    // 2. POST : Créer un nouvel élément
    if (method === 'POST') {
      const { type, label, sub_label, image_url, x, y } = req.body;
      const result = await pool.query(
        'INSERT INTO investigation_nodes (type, label, sub_label, image_url, x, y) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
        [type, label, sub_label, image_url, x, y]
      );
      return res.status(200).json(result.rows[0]);
    }

    // 3. PUT : Déplacer un élément (Mise à jour X, Y)
    if (method === 'PUT') {
      const { id, x, y } = req.body;
      await pool.query(
        'UPDATE investigation_nodes SET x = $1, y = $2 WHERE id = $3',
        [x, y, id]
      );
      return res.status(200).json({ success: true });
    }

    // 4. DELETE : Supprimer un élément
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