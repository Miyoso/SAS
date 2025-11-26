import { Pool } from 'pg';
import { verifyToken } from './utils/auth.js';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

export default async function handler(req, res) {
  const user = verifyToken(req);
  if (!user) return res.status(401).json({ error: 'Accès refusé' });

  if (req.method === 'GET') {
    try {
      // Récupère tous les pseudos des utilisateurs triés par ordre alphabétique
      const result = await pool.query('SELECT username FROM users ORDER BY username ASC');
      const users = result.rows.map(row => row.username);
      return res.status(200).json(users);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erreur Base de données' });
    }
  }
}