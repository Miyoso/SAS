// api/missions.js
import { Pool } from 'pg';
import { verifyToken } from './utils/auth.js';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

export default async function handler(req, res) {
  const user = verifyToken(req);
  if (!user) return res.status(401).json({ error: 'Accès refusé' });

  const method = req.method;

  try {
    // --- GET : RÉCUPÉRER LES MISSIONS ---
    if (method === 'GET') {
      let queryText = 'SELECT * FROM missions ORDER BY start_time ASC';
      let queryParams = [];

      // NOUVEAU : Filtrage par agent si demandé (pour le profil)
      if (req.query.agent) {
        queryText = `
            SELECT m.* FROM missions m 
            JOIN mission_roster mr ON m.id = mr.mission_id 
            WHERE mr.agent_name = $1 
            ORDER BY m.start_time ASC
        `;
        queryParams = [req.query.agent];
      }

      const missions = await pool.query(queryText, queryParams);

      // Enrichissement (Roster + Loadout)
      const enrichedMissions = await Promise.all(missions.rows.map(async (m) => {
        const roster = await pool.query('SELECT agent_name FROM mission_roster WHERE mission_id = $1', [m.id]);
        const loadout = await pool.query('SELECT item_name, serial_number FROM equipment WHERE mission_id = $1', [m.id]);

        return {
          ...m,
          roster: roster.rows.map(r => r.agent_name),
          loadout: loadout.rows
        };
      }));

      return res.status(200).json(enrichedMissions);
    }

    // --- POST : GESTION (Create, Move, Assign) ---
    // (Cette partie ne change pas, mais je la remets pour être complet)
    if (method === 'POST') {
      if (req.body.action === 'create') {
        const { title, description, location, start_time } = req.body;
        await pool.query(
          'INSERT INTO missions (title, description, location, start_time, lead_agent, status) VALUES ($1, $2, $3, $4, $5, $6)',
          [title, description, location, start_time, user.username, 'PENDING']
        );
        return res.status(201).json({ success: true });
      }

      if (req.body.action === 'move') {
        const { id, status } = req.body;
        await pool.query('UPDATE missions SET status = $1 WHERE id = $2', [status, id]);
        return res.status(200).json({ success: true });
      }

      if (req.body.action === 'assign') {
        const { mission_id, agent, equipment_id } = req.body;

        if (agent) {
          // Vérifier doublon
          const check = await pool.query('SELECT * FROM mission_roster WHERE mission_id=$1 AND agent_name=$2', [mission_id, agent]);
          if(check.rows.length === 0) {
             await pool.query('INSERT INTO mission_roster (mission_id, agent_name) VALUES ($1, $2)', [mission_id, agent]);
          }
        }
        if (equipment_id) {
          await pool.query('UPDATE equipment SET mission_id = $1, status = $2 WHERE id = $3', [mission_id, 'DEPLOYED', equipment_id]);
        }
        return res.status(200).json({ success: true });
      }
    }

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erreur Serveur' });
  }
}