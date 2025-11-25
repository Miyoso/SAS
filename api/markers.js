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

    export default async function handler(req, res) {
  const method = req.method;

  try {
    if (method === 'GET') {
      const result = await pool.query('SELECT * FROM map_markers ORDER BY created_at ASC');
      return res.status(200).json(result.rows);
    }

    if (method === 'POST') {
      // On récupère aussi rotation et scale (avec valeurs par défaut)
      const { x, y, type, desc, level, author, rotation = 0, scale = 1 } = req.body;
      
      // Note: Si vous n'avez pas ajouté les colonnes SQL, retirez rotation/scale de la requête ci-dessous
      const result = await pool.query(
        'INSERT INTO map_markers (x, y, type, description, level, author, rotation, scale) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id',
        [x, y, type, desc, level, author, rotation, scale]
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