import { verifyToken } from './utils/auth.js';
import { pusherServer } from './utils/pusher-server.js';
import { logActivity } from './utils/activity.js';

export default async function handler(req, res) {
    if (req.method !== 'POST')
        return res.status(405).json({ error: 'Method not allowed' });

    const user = verifyToken(req);
    if (!user)
        return res.status(401).json({ error: 'Non autorisé' });

    const { message, priority } = req.body;

    if (!message?.trim())
        return res.status(400).json({ error: 'Message vide' });

    if (message.trim().length > 300)
        return res.status(400).json({ error: 'Message trop long (300 max)' });

    const payload = {
        message:   message.trim(),
        sender:    user.username,
        rank:      user.rank,
        priority:  priority || 'normal', // 'normal' | 'urgent' | 'critical'
        timestamp: new Date().toISOString()
    };

    try {
        await pusherServer.trigger('sas-events', 'broadcast-message', payload);
        await logActivity(
            'BROADCAST',
            user.username,
            `📢 Message diffusé : "${message.trim().substring(0, 60)}${message.length > 60 ? '...' : ''}"`
        );
        return res.status(200).json({ success: true });
    } catch (e) {
        console.error('Broadcast error:', e);
        return res.status(500).json({ error: 'Erreur serveur' });
    }
}