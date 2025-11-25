import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

export default async function handler(req, res) {
  try {
    // On supprime l'ancienne table
    await pool.query('DROP TABLE IF EXISTS map_markers');

    // On crée la nouvelle table plus flexible
    await pool.query(`
      CREATE TABLE map_objects (
        id SERIAL PRIMARY KEY,
        type VARCHAR(20) NOT NULL, -- 'marker', 'polygon', 'line'
        data JSONB NOT NULL,       -- Contient {latlngs, desc, level, author}
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    return res.status(200).send("✅ BASE DE DONNÉES TACTIQUE : INITIALISÉE (V2)");
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}