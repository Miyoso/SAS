import Pusher from 'pusher';

// Configuration Pusher
const pusher = new Pusher({
    appId: "2084549", // ID de ton app Pusher
    key: "51d51cc5bfc1c8ee90d4",
    secret: "b3a325fcecbfabc17f57",
    cluster: "eu",
    useTLS: true
});

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { type } = req.query; // ex: /api/comms?type=discord

    // --- PUSHER AUTH ---
    if (type === 'pusher-auth') {
        const socketId = req.body.socket_id;
        const channel = req.body.channel_name;
        const presenceData = {
            user_id: "agent_" + Math.random().toString(36).substr(2, 9),
            user_info: {
                name: req.body.username || "Agent",
                color: req.body.color || "#00ff9d"
            }
        };
        const authResponse = pusher.authorizeChannel(socketId, channel, presenceData);
        return res.send(authResponse);
    }

    // --- SECURITY ALERT (DISCORD) ---
    if (type === 'alert') {
        const WEBHOOK = process.env.ALERTE;
        if (!WEBHOOK) return res.status(500).json({ error: 'Config manquante' });

        const { user, userAgent } = req.body;
        const embed = {
            title: "🚨 INTRUSION DÉTECTÉE",
            description: "Piège vidéo déclenché sur le dossier GRAVES.",
            color: 15158332, // Rouge
            fields: [
                { name: "Utilisateur", value: user || "Inconnu", inline: true },
                { name: "Device", value: userAgent || "Inconnu", inline: false }
            ],
            footer: { text: "SAS SECURITY SYSTEM" },
            timestamp: new Date().toISOString()
        };

        try {
            await fetch(WEBHOOK, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: "SAS SENTINEL", embeds: [embed] })
            });
            return res.status(200).json({ success: true });
        } catch (e) { return res.status(500).json({ error: 'Erreur Discord' }); }
    }

    // --- REPORT (DISCORD) ---
    if (type === 'discord-report') {
        const WEBHOOK = process.env.DISCORD_WEBHOOK_URL;
        if (!WEBHOOK) return res.status(500).json({ error: 'Webhook manquant' });

        const { opname, status, type: missionType, lead, agents, fileData, fileName, ref, date } = req.body;

        // Couleur selon le statut
        let color = 3066993; // Vert
        if (status === 'ÉCHEC' || status === 'CLASSIFIÉ') color = 15158332;
        if (status === 'EN COURS') color = 15105570;

        const embed = {
            title: `📄 RAPPORT : ${opname}`,
            color: color,
            description: `**REF:** SAS-${ref}\n**DATE:** ${date}\n\nLe rapport est en pièce jointe.`,
            fields: [
                { name: "STATUT", value: status, inline: true },
                { name: "TYPE", value: missionType, inline: true },
                { name: "OFFICIER", value: lead, inline: true },
                { name: "EFFECTIFS", value: agents, inline: false }
            ],
            footer: { text: "SAS SECURE SYSTEM" }
        };

        const formData = new FormData();
        formData.append('payload_json', JSON.stringify({ username: "SAS MAINFRAME", embeds: [embed] }));

        if (fileData && fileName) {
            const buffer = Buffer.from(fileData, 'base64');
            const blob = new Blob([buffer], { type: 'application/pdf' });
            formData.append('files[0]', blob, fileName);
        }

        try {
            await fetch(WEBHOOK, { method: 'POST', body: formData });
            return res.status(200).json({ message: 'Envoyé' });
        } catch (e) { return res.status(500).json({ error: 'Erreur Discord' }); }
    }

    return res.status(400).json({ error: 'Type inconnu' });
}