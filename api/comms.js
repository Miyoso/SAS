import { verifyToken } from './utils/auth.js';
import { pusherServer } from './utils/pusher-server.js';
import { logActivity }  from './utils/activity.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { type } = req.query;

    // --- PUSHER AUTH ---
    if (type === 'pusher-auth') {
        const socketId = req.body.socket_id;
        const channel  = req.body.channel_name;
        const presenceData = {
            user_id: 'agent_' + Math.random().toString(36).substr(2, 9),
            user_info: {
                name:  req.body.username || 'Agent',
                color: req.body.color    || '#00ff9d'
            }
        };
        const authResponse = pusherServer.authorizeChannel(socketId, channel, presenceData);
        return res.send(authResponse);
    }

    // --- BROADCAST ---
    if (type === 'broadcast') {
        const user = verifyToken(req);
        if (!user) return res.status(401).json({ error: 'Non autorisé' });

        const { message, priority } = req.body;
        if (!message?.trim())           return res.status(400).json({ error: 'Message vide' });
        if (message.trim().length > 300) return res.status(400).json({ error: 'Message trop long' });

        const payload = {
            message:   message.trim(),
            sender:    user.username,
            rank:      user.rank,
            priority:  priority || 'normal',
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

    // --- SECURITY ALERT (DISCORD) ---
    if (type === 'alert') {
        const WEBHOOK = process.env.ALERTE;
        if (!WEBHOOK) return res.status(500).json({ error: 'Config manquante' });

        const { user } = req.body;
        const now      = new Date();

        const embed = {
            title:       '🚨 INTRUSION DÉTECTÉE',
            description: 'Piège vidéo déclenché sur le dossier GRAVES.',
            color:       15158332,
            fields: [
                { name: 'Utilisateur', value: user || 'Inconnu',                                inline: true },
                { name: 'Date',        value: now.toLocaleDateString('fr-FR'),                   inline: true },
                { name: 'Heure',       value: now.toLocaleTimeString('fr-FR'),                   inline: true }
            ],
            footer:    { text: 'SAS SECURITY SYSTEM' },
            timestamp: now.toISOString()
        };

        try {
            await fetch(WEBHOOK, {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify({ username: 'SAS SENTINEL', embeds: [embed] })
            });
            return res.status(200).json({ success: true });
        } catch (e) { return res.status(500).json({ error: 'Erreur Discord' }); }
    }

    // --- REPORT (DISCORD) ---
    if (type === 'discord-report') {
        const WEBHOOK = process.env.DISCORD_WEBHOOK_URL;
        if (!WEBHOOK) return res.status(500).json({ error: 'Webhook manquant' });

        const { opname, status, type: missionType, lead, agents, fileData, fileName, ref, date } = req.body;

        let color = 3066993;
        if (status === 'ÉCHEC' || status === 'CLASSIFIÉ') color = 15158332;
        if (status === 'EN COURS') color = 15105570;

        const embed = {
            title:       `📄 RAPPORT : ${opname}`,
            color,
            description: `**REF:** SAS-${ref}\n**DATE:** ${date}\n\nLe rapport est en pièce jointe.`,
            fields: [
                { name: 'STATUT',    value: status,       inline: true },
                { name: 'TYPE',      value: missionType,  inline: true },
                { name: 'OFFICIER', value: lead,          inline: true },
                { name: 'EFFECTIFS', value: agents,        inline: false }
            ],
            footer: { text: 'SAS SECURE SYSTEM' }
        };

        const formData = new FormData();
        formData.append('payload_json', JSON.stringify({ username: 'SAS MAINFRAME', embeds: [embed] }));

        if (fileData && fileName) {
            const buffer = Buffer.from(fileData, 'base64');
            const blob   = new Blob([buffer], { type: 'application/pdf' });
            formData.append('files[0]', blob, fileName);
        }

        try {
            await fetch(WEBHOOK, { method: 'POST', body: formData });
            return res.status(200).json({ message: 'Envoyé' });
        } catch (e) { return res.status(500).json({ error: 'Erreur Discord' }); }
    }

    return res.status(400).json({ error: 'Type inconnu' });
}