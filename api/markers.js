import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

export default async function handler(req, res) {
  const method = req.method;

  try {
    // --- LECTURE (GET) ---
    if (method === 'GET') {
      // On essaie de lire. Si ça échoue car la table n'existe pas, on renvoie une liste vide.
      try {
        const result = await pool.query('SELECT * FROM map_markers ORDER BY created_at ASC');
        return res.status(200).json(result.rows);
      } catch (err) {
        // Si la table n'existe pas, on renvoie un tableau vide au lieu de planter
        if (err.code === '42P01') return res.status(200).json([]);
        throw err;
      }
    }

    // --- AJOUT (POST) avec AUTO-REPARATION ---
    if (method === 'POST') {
      const { x, y, type, desc, level, author, rotation = 0, scale = 100 } = req.body;

      try {
        // Tentative d'insertion normale
        const result = await pool.query(
          'INSERT INTO map_markers (x, y, type, description, level, author, rotation, scale) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id',
          [x, y, type, desc, level, author, rotation, scale]
        );
        return res.status(200).json({ message: 'Marker added', id: result.rows[0].id });

      } catch (err) {
        // ERREUR DÉTECTÉE : Si c'est une erreur de colonne ou de table manquante
        if (err.code === '42703' || err.code === '42P01') {
          console.log("⚠️ Base de données incomplète. Tentative de réparation automatique...");
          
          // 1. On s'assure que la table existe
          await pool.query(`
            CREATE TABLE IF NOT EXISTS map_markers (
              id SERIAL PRIMARY KEY,
              x FLOAT NOT NULL,
              y FLOAT NOT NULL,
              type VARCHAR(50) NOT NULL,
              description TEXT,
              level VARCHAR(20) NOT NULL,
              author VARCHAR(100),
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
          `);

          // 2. On ajoute les colonnes manquantes (rotation et scale)
          await pool.query(`ALTER TABLE map_markers ADD COLUMN IF NOT EXISTS rotation INT DEFAULT 0;`);
          await pool.query(`ALTER TABLE map_markers ADD COLUMN IF NOT EXISTS scale FLOAT DEFAULT 100;`);

          // 3. On réessaie l'insertion maintenant que tout est propre
          const retryResult = await pool.query(
            'INSERT INTO map_markers (x, y, type, description, level, author, rotation, scale) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id',
            [x, y, type, desc, level, author, rotation, scale]
          );
          
          return res.status(200).json({ message: 'Marker added (DB Repaired)', id: retryResult.rows[0].id });
        } else {
          // Si c'est une autre erreur, on la renvoie
          throw err;
        }
      }
    }

    // --- SUPPRESSION (DELETE) ---
    if (method === 'DELETE') {
      const { id } = req.body;
      await pool.query('DELETE FROM map_markers WHERE id = $1', [id]);
      return res.status(200).json({ message: 'Marker deleted' });
    }

  } catch (error) {
    console.error("API ERROR:", error);
    return res.status(500).json({ error: 'DATABASE ERROR: ' + error.message });
  }
}