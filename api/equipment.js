import { Pool } from 'pg';
import { verifyToken } from './utils/auth.js';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

export default async function handler(req, res) {
  const user = verifyToken(req);

  // Sécurité de base
  if (!user) {
    return res.status(401).json({ error: 'Accès non autorisé' });
  }

  const { method } = req;

  if (method === 'GET') {
    try {
      // --- MODIFICATION POUR LE PROFIL ---
      // Si un paramètre 'assigned_to' est présent dans l'URL
      if (req.query.assigned_to) {
        const { assigned_to } = req.query;
        // On récupère uniquement le matériel de cet agent spécifique
        const result = await pool.query(
            'SELECT * FROM equipment WHERE assigned_to = $1 ORDER BY item_name',
            [assigned_to]
        );
        // IMPORTANT : On renvoie directement le tableau (result.rows)
        // Cela permet à profile-equipment.js de faire .map() sans erreur.
        return res.status(200).json(result.rows);
      }

      // --- COMPORTEMENT PAR DÉFAUT (Page Logistique) ---
      const inventory = await pool.query('SELECT * FROM equipment ORDER BY category, item_name');
      const logs = await pool.query('SELECT * FROM logistics_logs ORDER BY timestamp DESC LIMIT 50');

      res.status(200).json({
        inventory: inventory.rows,
        logs: logs.rows
      });
    } catch (error) {
      console.error("Database Error:", error);
      res.status(500).json({ error: error.message });
    }
  }

  else if (method === 'POST') {
    // Seul le niveau 3+ peut ajouter du matériel
    if (parseInt(user.rank) < 3) {
      return res.status(403).json({ error: 'Niveau 3 requis pour ajouter du stock.' });
    }

    const { name, category, serial_number, storage_location, added_by } = req.body;
    try {
      await pool.query(
          'INSERT INTO equipment (item_name, category, serial_number, storage_location, status) VALUES ($1, $2, $3, $4, $5)',
          [name, category, serial_number, storage_location, 'AVAILABLE']
      );
      await pool.query(
          'INSERT INTO logistics_logs (item_name, serial_number, action_type, agent_name) VALUES ($1, $2, $3, $4)',
          [name, serial_number, 'NEW_STOCK', added_by || user.username]
      );
      res.status(201).json({ message: 'Equipment added' });
    } catch (error) {
      console.error("Database Error:", error);
      res.status(500).json({ error: error.message });
    }
  }

  else if (method === 'PATCH') {
    const { id, action, agent } = req.body;

    try {
      const itemResult = await pool.query('SELECT item_name, serial_number FROM equipment WHERE id = $1', [id]);
      if (itemResult.rows.length === 0) return res.status(404).json({ error: 'Item not found' });
      const item = itemResult.rows[0];

      if (action === 'TAKE') {
        // VÉRIFICATION DU RANG
        if (parseInt(user.rank) < 3) {
          return res.status(403).json({ error: 'Permission refusée : Niveau 3 requis pour assigner.' });
        }

        await pool.query(
            "UPDATE equipment SET assigned_to = $1, status = 'ASSIGNED', last_updated = NOW() WHERE id = $2",
            [agent, id]
        );
        await pool.query(
            'INSERT INTO logistics_logs (item_name, serial_number, action_type, agent_name) VALUES ($1, $2, $3, $4)',
            [item.item_name, item.serial_number, 'CHECKOUT', user.username + ' -> ' + agent]
        );
      }
      else if (action === 'RETURN') {
        await pool.query(
            "UPDATE equipment SET assigned_to = NULL, status = 'AVAILABLE', last_updated = NOW() WHERE id = $1",
            [id]
        );
        await pool.query(
            'INSERT INTO logistics_logs (item_name, serial_number, action_type, agent_name) VALUES ($1, $2, $3, $4)',
            [item.item_name, item.serial_number, 'RETURN', user.username]
        );
      }

      res.status(200).json({ message: 'Update success' });
    } catch (error) {
      console.error("Database Error:", error);
      res.status(500).json({ error: error.message });
    }
  }

  else {
    res.setHeader('Allow', ['GET', 'POST', 'PATCH']);
    res.status(405).end(`Method ${method} Not Allowed`);
  }
}