import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

export default async function handler(req, res) {
  const method = req.method;

  try {
    // 1. RÉCUPÉRER TOUS LES MARQUEURS (GET)
    if (method === 'GET') {
      const result = await pool.query('SELECT * FROM map_markers ORDER BY created_at ASC');
      return res.status(200).json(result.rows);
    }

    // 2. AJOUTER UN MARQUEUR (POST)
    if (method === 'POST') {
      const { x, y, type, desc, level, author } = req.body;
      
      const result = await pool.query(
        'INSERT INTO map_markers (x, y, type, description, level, author) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
        [x, y, type, desc, level, author]
      );
      
      return res.status(200).json({ message: 'Marker added', id: result.rows[0].id });
    }

    // 3. SUPPRIMER UN MARQUEUR (DELETE)
    if (method === 'DELETE') {
      const { id } = req.body; // On attend l'ID dans le corps de la requête
      await pool.query('DELETE FROM map_markers WHERE id = $1', [id]);
      return res.status(200).json({ message: 'Marker deleted' });
    }

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'DATABASE ERROR' });
  }
}