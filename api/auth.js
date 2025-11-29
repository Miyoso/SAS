import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { verifyToken } from './utils/auth.js';

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

export default async function handler(req, res) {
    // On récupère l'action demandée via l'URL (ex: /api/auth?action=login)
    const { action } = req.query;

    // --- LOGIN ---
    if (action === 'login' && req.method === 'POST') {
        const { username, password } = req.body;
        try {
            const result = await pool.query('SELECT * FROM agents WHERE username = $1', [username]);
            if (result.rows.length === 0) return res.status(401).json({ error: 'Utilisateur inconnu' });

            const user = result.rows[0];
            const match = await bcrypt.compare(password, user.password);
            if (!match) return res.status(401).json({ error: 'Mot de passe incorrect' });

            const token = jwt.sign({ userId: user.id, username: user.username, rank: user.rank }, process.env.JWT_SECRET, { expiresIn: '24h' });

            return res.status(200).json({
                message: 'ACCESS GRANTED',
                token: token,
                agent: { id: user.id, username: user.username, rank: user.rank }
            });
        } catch (e) { return res.status(500).json({ error: 'Erreur Serveur' }); }
    }

    // --- SIGNUP ---
    if (action === 'signup' && req.method === 'POST') {
        const { username, password } = req.body;
        try {
            const hashedPassword = await bcrypt.hash(password, 10);
            const result = await pool.query(
                'INSERT INTO agents (username, password, rank) VALUES ($1, $2, $3) RETURNING id, username, rank',
                [username, hashedPassword, '1']
            );
            return res.status(200).json({ message: 'Agent créé', agent: result.rows[0] });
        } catch (e) { return res.status(500).json({ error: 'Erreur BDD' }); }
    }

    // --- ME (Session) ---
    if (action === 'me' && req.method === 'GET') {
        const decoded = verifyToken(req);
        if (!decoded) return res.status(401).json({ error: 'Non connecté' });
        try {
            const result = await pool.query('SELECT id, username, rank FROM agents WHERE id = $1', [decoded.userId]);
            return res.status(200).json({ agent: result.rows[0] });
        } catch (e) { return res.status(500).json({ error: 'Erreur Serveur' }); }
    }

    // --- CHANGE PASSWORD ---
    if (action === 'change-password' && req.method === 'POST') {
        const user = verifyToken(req);
        if (!user) return res.status(401).json({ error: 'Session expirée' });
        const { oldPassword, newPassword } = req.body;

        try {
            const result = await pool.query('SELECT password FROM agents WHERE id = $1', [user.userId]);
            const match = await bcrypt.compare(oldPassword, result.rows[0].password);
            if (!match) return res.status(403).json({ error: 'Ancien mot de passe incorrect' });

            const newHash = await bcrypt.hash(newPassword, 10);
            await pool.query('UPDATE agents SET password = $1 WHERE id = $2', [newHash, user.userId]);
            return res.status(200).json({ message: 'Mot de passe mis à jour' });
        } catch (e) { return res.status(500).json({ error: 'Erreur Serveur' }); }
    }

    return res.status(400).json({ error: 'Action inconnue' });
}