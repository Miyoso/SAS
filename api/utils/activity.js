import { Pool } from 'pg';
import { pusherServer } from './pusher-server.js';

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
let ready = false;

async function ensureTable() {
    if (ready) return;
    await pool.query(`
        CREATE TABLE IF NOT EXISTS activity_logs (
            id SERIAL PRIMARY KEY,
            action_type VARCHAR(50) NOT NULL,
            agent_name VARCHAR(100),
            details TEXT,
            created_at TIMESTAMP DEFAULT NOW()
        )
    `);
    ready = true;
}

export async function logActivity(action_type, agent_name, details) {
    try {
        await ensureTable();
        await pool.query(
            'INSERT INTO activity_logs (action_type, agent_name, details) VALUES ($1, $2, $3)',
            [action_type, agent_name, details]
        );
        await pusherServer.trigger('sas-events', 'new-activity', {
            action_type, agent_name, details,
            created_at: new Date().toISOString()
        });
    } catch (e) { console.error('logActivity error:', e.message); }
}

export async function getRecentActivity(limit = 50) {
    await ensureTable();
    const result = await pool.query(
        'SELECT * FROM activity_logs ORDER BY created_at DESC LIMIT $1', [limit]
    );
    return result.rows;
}