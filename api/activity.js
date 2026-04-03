import { verifyToken } from './utils/auth.js';
import { getRecentActivity } from './utils/activity.js';

export default async function handler(req, res) {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
    const user = verifyToken(req);
    if (!user) return res.status(401).json({ error: 'Non autorisé' });
    try {
        const logs = await getRecentActivity(50);
        return res.status(200).json(logs);
    } catch (e) {
        console.error(e);
        return res.status(500).json({ error: 'Erreur serveur' });
    }
}