import { Pool } from 'pg';

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
    const result = await pool.query(
      'SELECT id, username, rank, created_at FROM agents WHERE username = $1 AND password = $2',
      [username, password]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'ACCESS DENIED: Invalid credentials' });
    }

    return res.status(200).json({ 
      message: 'ACCESS GRANTED', 
      agent: result.rows[0] 
    });

  } catch (error) {
    return res.status(500).json({ error: 'DATABASE ERROR' });
  }
}