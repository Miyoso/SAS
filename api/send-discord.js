export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // --- CONFIGURATION ---
  // Remplacez ceci par votre vrai lien Webhook Discord
  const WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL || "VOTRE_LIEN_WEBHOOK_DISCORD_ICI";

  const { opname, type, status, date, lead, agents, content, proof, ref } = req.body;

  // Définir la couleur de la barre latérale selon le statut
  let color = 3066993; // Vert (Succès) par défaut
  if (status === 'ÉCHEC' || status === 'CLASSIFIÉ') color = 15158332; // Rouge
  if (status === 'EN COURS') color = 15105570; // Orange

  const embed = {
    title: `📄 RAPPORT : ${opname}`,
    color: color,
    description: `**REF:** SAS-${ref}\n**DATE:** ${date}`,
    fields: [
      { name: "STATUT", value: status, inline: true },
      { name: "TYPE", value: type, inline: true },
      { name: "OFFICIER", value: lead, inline: true },
      { name: "EFFECTIFS", value: agents, inline: false },
      { name: "RAPPORT DE SITUATION", value: content.substring(0, 1024) }, // Discord limite à 1024 caractères
      { name: "PREUVES / PJ", value: proof }
    ],
    footer: {
      text: "SAS SECURE SYSTEM // AUTOMATED TRANSMISSION",
      icon_url: "https://i.imgur.com/votre_logo_sas.png" // Mettez l'URL publique de votre logo ici si vous en avez une
    },
    timestamp: new Date().toISOString()
  };

  try {
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: "SAS MAINFRAME",
        avatar_url: "https://i.imgur.com/votre_logo_sas.png", // Optionnel
        embeds: [embed]
      })
    });

    if (response.ok) {
      return res.status(200).json({ message: 'Envoyé' });
    } else {
      return res.status(500).json({ error: 'Erreur Discord' });
    }
  } catch (error) {
    return res.status(500).json({ error: 'Erreur Serveur' });
  }
}