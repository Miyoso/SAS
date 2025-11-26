import { Pool } from 'pg';
import { verifyToken } from './utils/auth.js';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

export default async function handler(req, res) {
  const user = verifyToken(req);
  if (!user) return res.status(401).json({ error: 'Access Denied' });

  const method = req.method;

  try {
    if (method === 'GET') {
      const { search, assigned_to } = req.query;
      
      let query = 'SELECT * FROM equipment';
      let params = [];

      if (assigned_to) {
        query += ' WHERE assigned_to = $1 AND status = \'ISSUED\'';
        params.push(assigned_to);
      }
      else if (search) {
        query += ' WHERE serial_number ILIKE $1 OR item_name ILIKE $1 OR assigned_to ILIKE $1';
        params.push(`%${search}%`);
      }
      
      query += ' ORDER BY category, item_name';
      
      const result = await pool.query(query, params);
      return res.status(200).json(result.rows);
    }

    if (method === 'POST') {
      const { serial_number, item_name, category, storage_location } = req.body;
      
      const check = await pool.query('SELECT id FROM equipment WHERE serial_number = $1', [serial_number]);
      if (check.rows.length > 0) return res.status(400).json({ error: "Serial number exists" });

      await pool.query(
        `INSERT INTO equipment (serial_number, item_name, category, status, storage_location) 
         VALUES ($1, $2, $3, 'STOCK', $4)`,
        [serial_number.toUpperCase(), item_name.toUpperCase(), category, storage_location]
      );
      return res.status(200).json({ success: true });
    }

    if (method === 'PUT') {
      const { id, action, target } = req.body; 

      if (action === 'ASSIGN') {
        await pool.query(
            `UPDATE equipment SET status='ISSUED', assigned_to=$1, storage_location=NULL WHERE id=$2`,
            [target, id]
        );
      } 
      else if (action === 'STORE') {
        await pool.query(
            `UPDATE equipment SET status='STOCK', assigned_to=NULL, storage_location=$1 WHERE id=$2`,
            [target, id]
        );
      }

      return res.status(200).json({ success: true });
    }

    if (method === 'DELETE') {
        const { id } = req.body;
        await pool.query('DELETE FROM equipment WHERE id = $1', [id]);
        return res.status(200).json({ success: true });
    }

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Database Error' });
  }
}