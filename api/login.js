import { Pool } from 'pg';
import bcrypt from 'bcrypt';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { username, password } = req.body;

  try {
    // 1. On cherche l'utilisateur par son nom UNIQUEMENT
    const result = await pool.query(
      'SELECT id, username, password, rank, created_at FROM agents WHERE username = $1',
      [username]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'ACCESS DENIED: User not found' });
    }

    const user = result.rows[0];

    // 2. On compare le mot de passe envoyé avec le hash de la BDD
    const match = await bcrypt.compare(password, user.password);

    if (!match) {
      return res.status(401).json({ error: 'ACCESS DENIED: Invalid password' });
    }

    // 3. On renvoie les infos (sans le mot de passe pour la sécurité)
    return res.status(200).json({ 
      message: 'ACCESS GRANTED', 
      agent: {
        id: user.id,
        username: user.username,
        rank: user.rank,
        created_at: user.created_at
      }
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'DATABASE ERROR' });
  }
}