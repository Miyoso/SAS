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
    // On génère le hash (10 tours de salage)
    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      'INSERT INTO agents (username, password) VALUES ($1, $2) RETURNING id, username, rank',
      [username, hashedPassword]
    );

    return res.status(200).json({ 
      message: 'AGENT CREATED', 
      agent: result.rows[0] 
    });

  } catch (error) {
    return res.status(500).json({ error: 'DATABASE ERROR' });
  }
}