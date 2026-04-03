import { Pool } from 'pg';
import { verifyToken } from './utils/auth.js';
import { pusherServer } from './utils/pusher-server.js';

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
let ready = false;

async function ensureTable() {
    if (ready) return;
    await pool.query(`
        CREATE TABLE IF NOT EXISTS messages (
            id SERIAL PRIMARY KEY,
            sender_id INTEGER,
            sender_name VARCHAR(100) NOT NULL,
            content TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT NOW()
        )
    `);
    ready = true;
}

export default async function handler(req, res) {
    const user = verifyToken(req);
    if (!user) return res.status(401).json({ error: 'Non autorisé' });
    try {
        await ensureTable();

        if (req.method === 'GET') {
            const limit = Math.min(parseInt(req.query.limit) || 100, 200);
            const result = await pool.query(
                'SELECT * FROM messages ORDER BY created_at DESC LIMIT $1', [limit]
            );
            return res.status(200).json(result.rows.reverse());
        }

        if (req.method === 'POST') {
            const { content } = req.body;
            if (!content?.trim()) return res.status(400).json({ error: 'Message vide' });
            if (content.trim().length > 500) return res.status(400).json({ error: 'Message trop long' });

            const result = await pool.query(
                'INSERT INTO messages (sender_id, sender_name, content) VALUES ($1, $2, $3) RETURNING *',
                [user.userId, user.username, content.trim()]
            );
            await pusherServer.trigger('sas-comms', 'new-message', result.rows[0]);
            return res.status(200).json(result.rows[0]);
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (e) {
        console.error('Messages API error:', e);
        return res.status(500).json({ error: 'Erreur serveur' });
    }
}