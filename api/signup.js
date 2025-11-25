import { Pool } from 'pg';

// Connexion à Neon
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false } // Nécessaire pour Neon
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { username, password } = req.body;

  try {
    // Attention: Pour un vrai site pro, on crypte le mot de passe ici (avec bcrypt)
    // Pour l'instant on fait simple pour apprendre.
    
    const result = await pool.query(
      'INSERT INTO agents (username, password) VALUES ($1, $2) RETURNING id, username, rank',
      [username, password]
    );

    return res.status(200).json({ 
      message: 'AGENT CREATED', 
      agent: result.rows[0] 
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'DATABASE ERROR: Username probably taken' });
  }
}