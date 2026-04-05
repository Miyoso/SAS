import { Pool } from 'pg';
import { verifyToken } from './utils/auth.js';
import { pusherServer } from './utils/pusher-server.js';
import { logActivity } from './utils/activity.js';

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function ensureTable() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS vip_targets (
            id SERIAL PRIMARY KEY,
            type VARCHAR(20) NOT NULL DEFAULT 'TARGET',
            name VARCHAR(100) NOT NULL,
            alias VARCHAR(100),
            status VARCHAR(50) NOT NULL DEFAULT 'ACTIF',
            threat_level INTEGER DEFAULT 5,
            location TEXT,
            assigned_agents TEXT,
            image_url TEXT,
            description TEXT,
            notes TEXT,
            mission_id INTEGER,
            created_by VARCHAR(100),
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )
    `);
}

export default async function handler(req, res) {
    const user = verifyToken(req);
    if (!user) return res.status(401).json({ error: 'Non autorisé' });

    await ensureTable();

    const method = req.method;

    try {
        // GET — Récupérer tous les VIP
        if (method === 'GET') {
            const { type, id } = req.query;

            if (id) {
                const result = await pool.query('SELECT * FROM vip_targets WHERE id = $1', [id]);
                if (result.rows.length === 0) return res.status(404).json({ error: 'Introuvable' });
                return res.status(200).json(result.rows[0]);
            }

            let query = 'SELECT * FROM vip_targets';
            let params = [];
            if (type) {
                query += ' WHERE type = $1';
                params = [type];
            }
            query += ' ORDER BY threat_level DESC, created_at DESC';

            const result = await pool.query(query, params);
            return res.status(200).json(result.rows);
        }

        // POST — Créer un VIP
        if (method === 'POST') {
            const {
                type, name, alias, status, threat_level,
                location, assigned_agents, image_url,
                description, notes, mission_id
            } = req.body;

            if (!name || !type) return res.status(400).json({ error: 'Nom et type requis' });

            const result = await pool.query(`
                INSERT INTO vip_targets
                    (type, name, alias, status, threat_level, location, assigned_agents, image_url, description, notes, mission_id, created_by)
                VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
                RETURNING *`,
                [type, name.toUpperCase(), alias, status || (type === 'PROTECTION' ? 'EN SÉCURITÉ' : 'ACTIF'),
                 threat_level || 5, location, assigned_agents, image_url, description, notes, mission_id || null, user.username]
            );

            const newVip = result.rows[0];

            await pusherServer.trigger('sas-events', 'vip-update', {
                action: 'created',
                vip: newVip,
                agent: user.username
            });

            const typeLabel = type === 'PROTECTION' ? '🟢 PROTECTION' : '🔴 CIBLE';
            await logActivity('VIP', user.username, `${typeLabel} — Nouveau dossier créé: ${name.toUpperCase()}`);

            return res.status(201).json(newVip);
        }

        // PUT — Mettre à jour un VIP (statut, infos...)
        if (method === 'PUT') {
            const { id, status, threat_level, location, assigned_agents, notes, name, alias, image_url, description } = req.body;
            if (!id) return res.status(400).json({ error: 'ID requis' });

            const existing = await pool.query('SELECT * FROM vip_targets WHERE id = $1', [id]);
            if (existing.rows.length === 0) return res.status(404).json({ error: 'Introuvable' });
            const old = existing.rows[0];

            const result = await pool.query(`
                UPDATE vip_targets SET
                    name = $1, alias = $2, status = $3, threat_level = $4,
                    location = $5, assigned_agents = $6, image_url = $7,
                    description = $8, notes = $9, updated_at = NOW()
                WHERE id = $10 RETURNING *`,
                [
                    name || old.name, alias || old.alias, status || old.status,
                    threat_level ?? old.threat_level, location || old.location,
                    assigned_agents || old.assigned_agents, image_url || old.image_url,
                    description || old.description, notes || old.notes, id
                ]
            );

            const updated = result.rows[0];

            // Alerte si changement de statut critique
            if (status && status !== old.status) {
                const isCritical = status === 'COMPROMIS' || status === 'NEUTRALISÉ' || status === 'CRITIQUE';
                await pusherServer.trigger('sas-events', 'vip-update', {
                    action: 'status_change',
                    vip: updated,
                    old_status: old.status,
                    new_status: status,
                    agent: user.username,
                    critical: isCritical
                });

                const emoji = status === 'COMPROMIS' ? '🚨' : status === 'NEUTRALISÉ' ? '☠️' : '⚠️';
                await logActivity('VIP', user.username,
                    `${emoji} ${old.name} — Statut changé: ${old.status} → ${status}`
                );
            }

            return res.status(200).json(updated);
        }

        // DELETE — Supprimer un VIP
        if (method === 'DELETE') {
            const { id } = req.body;
            if (!id) return res.status(400).json({ error: 'ID requis' });

            const existing = await pool.query('SELECT name, type FROM vip_targets WHERE id = $1', [id]);
            if (existing.rows.length === 0) return res.status(404).json({ error: 'Introuvable' });

            await pool.query('DELETE FROM vip_targets WHERE id = $1', [id]);

            const { name, type } = existing.rows[0];
            await logActivity('VIP', user.username, `🗑 Dossier VIP supprimé: ${name} (${type})`);

            return res.status(200).json({ success: true });
        }

        return res.status(405).json({ error: 'Méthode non autorisée' });

    } catch (error) {
        console.error('VIP API Error:', error);
        return res.status(500).json({ error: 'Erreur serveur interne' });
    }
}
