import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

export default async function handler(req, res) {
  const method = req.method;

  try {
    // LECTURE
    if (method === 'GET') {
      // Si la table n'existe pas encore (erreur 42P01), on renvoie vide
      try {
        const result = await pool.query('SELECT * FROM map_objects ORDER BY created_at ASC');
        return res.status(200).json(result.rows);
      } catch (err) {
        if (err.code === '42P01') return res.status(200).json([]);
        throw err;
      }
    }

    // AJOUT
    if (method === 'POST') {
      const { type, data } = req.body; // data contient { latlngs, desc, level, author }
      
      const result = await pool.query(
        'INSERT INTO map_objects (type, data) VALUES ($1, $2) RETURNING id',
        [type, data]
      );
      return res.status(200).json({ message: 'Added', id: result.rows[0].id });
    }

    // SUPPRESSION
    if (method === 'DELETE') {
      const { id } = req.body;
      await pool.query('DELETE FROM map_objects WHERE id = $1', [id]);
      return res.status(200).json({ message: 'Deleted' });
    }

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Server Error' });
  }
}