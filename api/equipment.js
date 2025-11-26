import { Pool } from 'pg';
import { verifyToken } from './utils/auth.js';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

export default async function handler(req, res) {
  const user = verifyToken(req);
  if (!user) return res.status(401).json({ error: 'Accès refusé' });

  const method = req.method;

  try {
    // GET : Rechercher du matériel
    if (method === 'GET') {
      const { search } = req.query; // Pour chercher un matricule ou un nom
      
      let query = 'SELECT * FROM equipment';
      let params = [];

      if (search) {
        query += ' WHERE serial_number ILIKE $1 OR item_name ILIKE $1 OR assigned_to ILIKE $1';
        params.push(`%${search}%`);
      }
      
      query += ' ORDER BY category, item_name';
      
      const result = await pool.query(query, params);
      return res.status(200).json(result.rows);
    }

    // POST : Créer un nouvel objet (Entrée en stock)
    if (method === 'POST') {
      const { serial_number, item_name, category, storage_location } = req.body;
      
      // Vérif doublon
      const check = await pool.query('SELECT id FROM equipment WHERE serial_number = $1', [serial_number]);
      if (check.rows.length > 0) return res.status(400).json({ error: "Ce numéro de série existe déjà !" });

      await pool.query(
        `INSERT INTO equipment (serial_number, item_name, category, status, storage_location) 
         VALUES ($1, $2, $3, 'STOCK', $4)`,
        [serial_number.toUpperCase(), item_name.toUpperCase(), category, storage_location]
      );
      return res.status(200).json({ success: true });
    }

    // PUT : Mettre à jour (Sortir du stock / Rendre / Changer de place)
    if (method === 'PUT') {
      const { id, action, target } = req.body; 
      // action = 'ASSIGN' (donner à un agent) ou 'STORE' (mettre dans un stock) ou 'MOVE'

      if (action === 'ASSIGN') {
        // Sortie de stock vers un agent
        await pool.query(
            `UPDATE equipment SET status='ISSUED', assigned_to=$1, storage_location=NULL WHERE id=$2`,
            [target, id] // target est le nom de l'agent
        );
      } 
      else if (action === 'STORE') {
        // Retour en stock
        await pool.query(
            `UPDATE equipment SET status='STOCK', assigned_to=NULL, storage_location=$1 WHERE id=$2`,
            [target, id] // target est le nom du stock (ex: "Armurerie")
        );
      }

      return res.status(200).json({ success: true });
    }

    // DELETE : Sortie définitive (Destruction/Perte)
    if (method === 'DELETE') {
        const { id } = req.body;
        await pool.query('DELETE FROM equipment WHERE id = $1', [id]);
        return res.status(200).json({ success: true });
    }

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erreur SQL' });
  }
}