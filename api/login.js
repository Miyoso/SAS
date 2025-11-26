import { Pool } from 'pg';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

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
      'SELECT id, username, password, rank, created_at FROM agents WHERE username = $1',
      [username]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'ACCESS DENIED: User not found' });
    }

    const user = result.rows[0];
    const match = await bcrypt.compare(password, user.password);

    if (!match) {
      return res.status(401).json({ error: 'ACCESS DENIED: Invalid password' });
    }

    const token = jwt.sign(
      { userId: user.id, username: user.username, rank: user.rank },
      process.env.JWT_SECRET, 
      { expiresIn: '24h' }
    );

    return res.status(200).json({ 
      message: 'ACCESS GRANTED', 
      token: token,
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