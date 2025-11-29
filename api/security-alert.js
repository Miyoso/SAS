export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const WEBHOOK_URL = process.env.ALERTE;

    if (!WEBHOOK_URL) {
        return res.status(500).json({ error: 'Configuration Webhook manquante (Variable ALERTE)' });
    }

    const { user, userAgent } = req.body;

    // Construction du message Discord (Sans l'IP)
    const embed = {
        title: "🚨 INTRUSION DÉTECTÉE : DOSSIER GRAVES",
        description: "Le protocole de sécurité (Piège Vidéo) a été déclenché.",
        color: 15158332, // Rouge
        fields: [
            { name: "Utilisateur", value: user || "Non identifié", inline: true },
            // Champ IP supprimé
            { name: "Navigateur / Device", value: userAgent || "Inconnu", inline: false }
        ],
        footer: { text: "SAS SECURITY SYSTEM // AUTO-TRAP" },
        timestamp: new Date().toISOString()
    };

    try {
        await fetch(WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: "SAS SENTINEL",
                avatar_url: "https://cdn-icons-png.flaticon.com/512/1085/1085474.png",
                embeds: [embed]
            })
        });

        return res.status(200).json({ success: true });

    } catch (error) {
        console.error("Erreur Webhook:", error);
        return res.status(500).json({ error: 'Erreur envoi alerte' });
    }
}