import { Pool } from 'pg';
import Pusher from 'pusher';
import { verifyToken } from './utils/auth.js';

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const pusher = new Pusher({ appId: "2084549", key: "51d51cc5bfc1c8ee90d4", secret: "b3a325fcecbfabc17f57", cluster: "eu", useTLS: true });

export default async function handler(req, res) {
    const user = verifyToken(req);
    if (req.query.entity !== 'markers' && !user) return res.status(401).json({ error: 'Accès refusé' });

    const { entity } = req.query;
    const method = req.method;

    try {
        if (entity === 'users' && method === 'GET') {
            const result = await pool.query('SELECT username FROM agents ORDER BY username ASC');
            return res.status(200).json(result.rows.map(r => r.username));
        }

        if (entity === 'my_warnings' && method === 'GET') {
            const result = await pool.query(
                'SELECT reason, created_at FROM warnings WHERE agent_id = $1 ORDER BY created_at DESC',
                [user.userId]
            );
            return res.status(200).json(result.rows);
        }

        if (entity === 'stress') {
            if (method === 'GET') {
                const result = await pool.query('SELECT stress_level FROM agents WHERE id = $1', [user.userId]);
                if (result.rows.length === 0) return res.status(404).json({ error: 'Agent introuvable' });
                return res.status(200).json({ stress_level: result.rows[0].stress_level });
            }

            if (method === 'POST') {
                let { amount } = req.body;

                const currentRes = await pool.query('SELECT stress_level FROM agents WHERE id = $1', [user.userId]);
                let currentLevel = currentRes.rows[0].stress_level || 0;

                let newLevel = currentLevel + parseInt(amount);
                if (newLevel < 0) newLevel = 0;
                if (newLevel > 100) newLevel = 100;

                await pool.query('UPDATE agents SET stress_level = $1 WHERE id = $2', [newLevel, user.userId]);
                return res.status(200).json({ stress_level: newLevel });
            }
        }

        if (entity === 'markers') {
            if (method === 'GET') {
                const result = await pool.query('SELECT * FROM map_objects ORDER BY created_at ASC');
                return res.status(200).json(result.rows);
            }
            if (method === 'POST') {
                const { type, data } = req.body;
                await pool.query('INSERT INTO map_objects (type, data) VALUES ($1, $2)', [type, data]);
                return res.status(200).json({ success: true });
            }
            if (method === 'DELETE') {
                await pool.query('DELETE FROM map_objects WHERE id = $1', [req.body.id]);
                return res.status(200).json({ success: true });
            }
        }

        if (entity === 'missions') {
            if (method === 'GET') {
                let q = 'SELECT * FROM missions ORDER BY start_time ASC';
                let p = [];
                if (req.query.agent) {
                    q = `SELECT m.* FROM missions m JOIN mission_roster mr ON m.id = mr.mission_id WHERE mr.agent_name = $1 ORDER BY m.start_time ASC`;
                    p = [req.query.agent];
                }
                const missions = await pool.query(q, p);
                const enriched = await Promise.all(missions.rows.map(async (m) => {
                    const roster = await pool.query('SELECT agent_name FROM mission_roster WHERE mission_id = $1', [m.id]);
                    const loadout = await pool.query('SELECT item_name, serial_number FROM equipment WHERE mission_id = $1', [m.id]);
                    return { ...m, roster: roster.rows.map(r => r.agent_name), loadout: loadout.rows };
                }));
                return res.status(200).json(enriched);
            }
            if (method === 'POST') {
                const { action } = req.body;
                if (action === 'create') {
                    await pool.query('INSERT INTO missions (title, description, location, start_time, lead_agent, status) VALUES ($1, $2, $3, $4, $5, $6)',
                        [req.body.title, req.body.description, req.body.location, req.body.start_time, user.username, 'PENDING']);
                } else if (action === 'move') {
                    await pool.query('UPDATE missions SET status = $1 WHERE id = $2', [req.body.status, req.body.id]);
                } else if (action === 'assign') {
                    if (req.body.agent) {
                        const check = await pool.query('SELECT * FROM mission_roster WHERE mission_id=$1 AND agent_name=$2', [req.body.mission_id, req.body.agent]);
                        if(check.rows.length === 0) await pool.query('INSERT INTO mission_roster (mission_id, agent_name) VALUES ($1, $2)', [req.body.mission_id, req.body.agent]);
                    }
                    if (req.body.equipment_id) await pool.query('UPDATE equipment SET mission_id = $1, status = $2 WHERE id = $3', [req.body.mission_id, 'DEPLOYED', req.body.equipment_id]);
                }
                return res.status(200).json({ success: true });
            }
        }

        if (entity === 'equipment') {
            if (method === 'GET') {
                if (req.query.assigned_to) {
                    const result = await pool.query('SELECT * FROM equipment WHERE assigned_to = $1 ORDER BY item_name', [req.query.assigned_to]);
                    return res.status(200).json(result.rows);
                }
                const inv = await pool.query('SELECT * FROM equipment ORDER BY category, item_name');
                const logs = await pool.query('SELECT * FROM logistics_logs ORDER BY timestamp DESC LIMIT 50');
                return res.status(200).json({ inventory: inv.rows, logs: logs.rows });
            }
            if (method === 'POST') {
                if (parseInt(user.rank) < 3) return res.status(403).json({ error: 'Non autorisé' });
                await pool.query('INSERT INTO equipment (item_name, category, serial_number, storage_location, status) VALUES ($1, $2, $3, $4, $5)',
                    [req.body.name, req.body.category, req.body.serial_number, req.body.storage_location, 'AVAILABLE']);
                await pool.query('INSERT INTO logistics_logs (item_name, serial_number, action_type, agent_name) VALUES ($1, $2, $3, $4)',
                    [req.body.name, req.body.serial_number, 'NEW_STOCK', user.username]);
                return res.status(200).json({ success: true });
            }
            if (method === 'PATCH') {
                const { id, action, agent } = req.body;
                const item = (await pool.query('SELECT * FROM equipment WHERE id=$1', [id])).rows[0];
                if (action === 'TAKE') {
                    if (parseInt(user.rank) < 3) return res.status(403).json({ error: 'Rank 3 requis' });
                    await pool.query("UPDATE equipment SET assigned_to = $1, status = 'ASSIGNED', last_updated = NOW() WHERE id = $2", [agent, id]);
                    await pool.query('INSERT INTO logistics_logs (item_name, serial_number, action_type, agent_name) VALUES ($1, $2, $3, $4)', [item.item_name, item.serial_number, 'CHECKOUT', `${user.username} -> ${agent}`]);
                } else if (action === 'RETURN') {
                    await pool.query("UPDATE equipment SET assigned_to = NULL, status = 'AVAILABLE', last_updated = NOW() WHERE id = $1", [id]);
                    await pool.query('INSERT INTO logistics_logs (item_name, serial_number, action_type, agent_name) VALUES ($1, $2, $3, $4)', [item.item_name, item.serial_number, 'RETURN', user.username]);
                }
                return res.status(200).json({ success: true });
            }
        }

        if (entity === 'investigation') {
            if (method === 'GET') {
                const nodes = await pool.query('SELECT * FROM investigation_nodes');
                const links = await pool.query('SELECT * FROM investigation_links');
                return res.status(200).json({ nodes: nodes.rows, links: links.rows });
            }
            if (method === 'POST') {
                const { action } = req.body;
                if (action === 'create_node') {
                    const r = await pool.query('INSERT INTO investigation_nodes (type, label, sub_label, image_url, x, y) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
                        [req.body.type, req.body.label, req.body.sub_label, req.body.image_url, req.body.x, req.body.y]);
                    await pusher.trigger('investigation-board', 'node-created', r.rows[0]);
                    return res.status(200).json(r.rows[0]);
                }
                if (action === 'create_link') {
                    await pool.query('INSERT INTO investigation_links (from_id, to_id, color) VALUES ($1, $2, $3)', [req.body.from_id, req.body.to_id, req.body.color]);
                    await pusher.trigger('investigation-board', 'link-created', req.body);
                    return res.status(200).json({ success: true });
                }
            }
            if (method === 'PUT') {
                await pool.query('UPDATE investigation_nodes SET x=$1, y=$2 WHERE id=$3', [req.body.x, req.body.y, req.body.id]);
                await pusher.trigger('investigation-board', 'node-moved', req.body);
                return res.status(200).json({ success: true });
            }
            if (method === 'DELETE') {
                await pool.query('DELETE FROM investigation_nodes WHERE id=$1', [req.body.id]);
                await pusher.trigger('investigation-board', 'node-deleted', req.body);
                return res.status(200).json({ success: true });
            }
        }

        return res.status(404).json({ error: 'Entité inconnue' });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Erreur API Game' });
    }
}