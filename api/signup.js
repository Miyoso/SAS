import { Pool } from 'pg';
import bcrypt from 'bcryptjs'; // [MODIFIÉ]

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
    // bcryptjs utilise la même syntaxe que bcrypt
    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      'INSERT INTO agents (username, password, rank) VALUES ($1, $2, $3) RETURNING id, username, rank',
      [username, hashedPassword, '1']
    );

    return res.status(200).json({ 
      message: 'AGENT CREATED', 
      agent: result.rows[0] 
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'DATABASE ERROR' });
  }
}