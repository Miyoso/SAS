import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

export default async function handler(req, res) {
  const method = req.method;

  try {
    if (method === 'GET') {
      // Récupère tout
      try {
        const result = await pool.query('SELECT * FROM map_objects ORDER BY created_at ASC');
        return res.status(200).json(result.rows);
      } catch (err) {
        // Si la table n'existe pas encore, renvoie vide au lieu de planter
        if (err.code === '42P01') return res.status(200).json([]);
        throw err;
      }
    }

    if (method === 'POST') {
      // Sauvegarde le paquet de données complet (points, desc, couleur...)
      const { type, data } = req.body;
      const result = await pool.query(
        'INSERT INTO map_objects (type, data) VALUES ($1, $2) RETURNING id',
        [type, data]
      );
      return res.status(200).json({ message: 'Saved', id: result.rows[0].id });
    }

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