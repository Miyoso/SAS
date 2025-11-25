import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

export default async function handler(req, res) {
  try {
    // 1. On supprime l'ancienne table (ATTENTION : cela efface les points existants)
    await pool.query('DROP TABLE IF EXISTS map_markers');

    // 2. On recrée la table avec TOUTES les nouvelles colonnes nécessaires
    await pool.query(`
      CREATE TABLE map_markers (
        id SERIAL PRIMARY KEY,
        x FLOAT NOT NULL,
        y FLOAT NOT NULL,
        type VARCHAR(50) NOT NULL,
        description TEXT,
        level VARCHAR(20) NOT NULL,
        author VARCHAR(100),
        rotation INT DEFAULT 0,
        scale FLOAT DEFAULT 1.0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    return res.status(200).send("✅ SUCCÈS : Base de données réparée et mise à jour. Vous pouvez retourner sur la carte.");
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}