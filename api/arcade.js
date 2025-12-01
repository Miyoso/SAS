import { Pool } from 'pg';
import { verifyToken } from './utils/auth.js';

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

export default async function handler(req, res) {
    const user = verifyToken(req);
    const method = req.method;

    try {
        // --- GET: RÉCUPÉRER LE LEADERBOARD (TOP 5) ---
        if (method === 'GET') {
            const query = `
                SELECT 
                    s.score, 
                    s.created_at,
                    a.username 
                FROM arcade_scores s
                JOIN agents a ON s.agent_id = a.id
                ORDER BY s.score DESC
                LIMIT 5
            `;
            const result = await pool.query(query);

            // Formatage pour le front
            const leaderboard = result.rows.map((row, index) => ({
                rank: index + 1,
                username: row.username,
                score: row.score,
                date: row.created_at
            }));

            return res.status(200).json(leaderboard);
        }

        // --- POST: ENREGISTRER UN SCORE ---
        if (method === 'POST') {
            if (!user) return res.status(401).json({ error: 'Non autorisé' });

            const { score } = req.body;

            if (!score || typeof score !== 'number') {
                return res.status(400).json({ error: 'Score invalide' });
            }

            await pool.query(
                'INSERT INTO arcade_scores (agent_id, score) VALUES ($1, $2)',
                [user.userId, score]
            );

            return res.status(200).json({ success: true, message: 'Score archivé' });
        }

        return res.status(405).json({ error: 'Method not allowed' });

    } catch (error) {
        console.error("Arcade API Error:", error);
        return res.status(500).json({ error: 'Erreur serveur' });
    }
}