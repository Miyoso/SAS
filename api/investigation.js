import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

export default async function handler(req, res) {
  const method = req.method;

  try {
    // --- GET : TOUT RÉCUPÉRER ---
    if (method === 'GET') {
      const nodes = await pool.query('SELECT * FROM investigation_nodes ORDER BY id ASC');
      const links = await pool.query('SELECT * FROM investigation_links');
      return res.status(200).json({ nodes: nodes.rows, links: links.rows });
    }

    // --- POST : CRÉATION (NODE ou LINK) ---
    if (method === 'POST') {
      const { action } = req.body; // On regarde l'action demandée

      // 1. Créer un LIEN
      if (action === 'create_link') {
        const { from_id, to_id } = req.body;
        // Vérifier si le lien existe déjà pour éviter les doublons
        const check = await pool.query('SELECT * FROM investigation_links WHERE from_id=$1 AND to_id=$2', [from_id, to_id]);
        if (check.rows.length > 0) return res.status(200).json({ message: 'Exists' });

        await pool.query('INSERT INTO investigation_links (from_id, to_id) VALUES ($1, $2)', [from_id, to_id]);
        return res.status(200).json({ success: true });
      }

      // 2. Créer une FICHE (NODE)
      else {
        const { type, label, sub_label, image_url, x, y } = req.body;
        const result = await pool.query(
          'INSERT INTO investigation_nodes (type, label, sub_label, image_url, x, y) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
          [type, label, sub_label, image_url, x, y]
        );
        return res.status(200).json(result.rows[0]);
      }
    }

    // --- PUT : DÉPLACEMENT ---
    if (method === 'PUT') {
      const { id, x, y } = req.body;
      await pool.query('UPDATE investigation_nodes SET x = $1, y = $2 WHERE id = $3', [x, y, id]);
      return res.status(200).json({ success: true });
    }

    // --- DELETE : SUPPRESSION ---
    if (method === 'DELETE') {
      const { id, type } = req.body; // type = 'node' ou 'link' (optionnel si on delete par cascade)
      
      // Ici on supprime le node, les liens partiront grâce au "ON DELETE CASCADE" SQL
      await pool.query('DELETE FROM investigation_nodes WHERE id = $1', [id]);
      return res.status(200).json({ success: true });
    }

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Database Error' });
  }
}