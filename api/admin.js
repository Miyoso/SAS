import { Pool } from 'pg';
import { verifyToken } from './utils/auth.js';
import { pusherServer } from './utils/pusher-server.js';
import { logActivity } from './utils/activity.js';

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

export default async function handler(req, res) {
    const user = verifyToken(req);
    if (!user) return res.status(401).json({ error: 'Session invalide ou expirée.' });
    if (parseInt(user.rank) < 10) return res.status(403).json({ error: 'ACCÈS NON AUTORISÉ : NIVEAU 10 REQUIS' });

    const method = req.method;

    try {
        if (method === 'GET') {
            const query = `
                SELECT a.id, a.username, a.rank, COUNT(w.id) as warn_count
                FROM agents a
                LEFT JOIN warnings w ON a.id = w.agent_id
                GROUP BY a.id
                ORDER BY a.rank DESC, a.username ASC
            `;
            const result = await pool.query(query);
            return res.status(200).json(result.rows);
        }

        if (method === 'PUT') {
            const { agent_id, new_rank } = req.body;
            if (!agent_id || new_rank === undefined) return res.status(400).json({ error: 'Données incomplètes' });

            const agentRes = await pool.query('SELECT username FROM agents WHERE id = $1', [agent_id]);
            const targetName = agentRes.rows[0]?.username || 'INCONNU';

            await pool.query('UPDATE agents SET rank = $1 WHERE id = $2', [new_rank, agent_id]);
            await logActivity('RANK_CHANGE', user.username, `Grade de ${targetName.toUpperCase()} modifié → LVL-${new_rank}`);

            return res.status(200).json({ success: true, message: 'Grade mis à jour' });
        }

        if (method === 'POST') {
            const { agent_id, reason } = req.body;
            if (!agent_id || !reason) return res.status(400).json({ error: 'Motif requis' });

            const agentRes = await pool.query('SELECT username FROM agents WHERE id = $1', [agent_id]);
            const targetName = agentRes.rows[0]?.username || 'INCONNU';

            await pool.query(
                'INSERT INTO warnings (agent_id, reason, admin_id) VALUES ($1, $2, $3)',
                [agent_id, reason, user.userId]
            );

            await pusherServer.trigger('sas-events', 'warning-issued', {
                target: targetName,
                reason: reason,
                admin: user.username
            });

            await logActivity('WARNING', user.username, `⚠ Avertissement émis contre ${targetName.toUpperCase()} — ${reason}`);

            return res.status(200).json({ success: true, message: 'Avertissement enregistré' });
        }

        return res.status(405).json({ error: 'Méthode non autorisée' });
    } catch (error) {
        console.error("Admin API Error:", error);
        return res.status(500).json({ error: 'Erreur serveur interne' });
    }
}