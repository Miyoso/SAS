import { Pool } from 'pg';
import { verifyToken } from './utils/auth.js';

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

export default async function handler(req, res) {
    const user = verifyToken(req);
    if (!user) return res.status(401).json({ error: 'Accès non autorisé' });

    const method = req.method;

    try {
        if (method === 'GET') {
            const { agent_id } = req.query;

            if (agent_id) {
                const query = `
                    SELECT * FROM injuries 
                    WHERE agent_id = $1 AND status = 'active' 
                    ORDER BY created_at DESC
                `;
                const result = await pool.query(query, [agent_id]);
                return res.status(200).json(result.rows);
            }

            const query = `
                SELECT i.*, a.username, a.rank, a.stress_level
                FROM injuries i
                JOIN agents a ON i.agent_id = a.id
                WHERE i.status = 'active'
                ORDER BY i.severity DESC, i.created_at DESC
            `;
            const result = await pool.query(query);
            return res.status(200).json(result.rows);
        }

        if (method === 'POST') {
            const { agent_id, body_part, severity, description } = req.body;

            await pool.query(
                `INSERT INTO injuries (agent_id, body_part, severity, description) 
                 VALUES ($1, $2, $3, $4)`,
                [agent_id || user.userId, body_part, severity, description]
            );
            return res.status(200).json({ success: true });
        }

        if (method === 'PATCH') {
            if (parseInt(user.rank) < 3) {
                return res.status(403).json({ error: 'Niveau insuffisant pour valider les soins.' });
            }

            const { injury_id } = req.body;

            await pool.query(
                `UPDATE injuries SET status = 'healed', healed_at = NOW() WHERE id = $1`,
                [injury_id]
            );
            return res.status(200).json({ success: true });
        }

        return res.status(405).json({ error: 'Méthode non autorisée' });

    } catch (error) {
        console.error("Medical API Error:", error);
        return res.status(500).json({ error: 'Erreur serveur interne' });
    }
}