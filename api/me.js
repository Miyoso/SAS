import { Pool } from 'pg';
import { verifyToken } from './utils/auth.js';

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

export default async function handler(req, res) {
    // 1. Vérifier qui est connecté grâce au token
    const decoded = verifyToken(req);
    if (!decoded) return res.status(401).json({ error: 'Non connecté' });

    try {
        // 2. Aller chercher les infos fraîches dans la BDD
        const result = await pool.query(
            'SELECT id, username, rank FROM agents WHERE id = $1',
            [decoded.userId]
        );

        if (result.rows.length === 0) return res.status(404).json({ error: 'Agent introuvable' });

        // 3. Renvoyer les infos à jour
        return res.status(200).json({ agent: result.rows[0] });
    } catch (error) {
        return res.status(500).json({ error: 'Erreur Serveur' });
    }
}