export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;

  if (!WEBHOOK_URL) {
    return res.status(500).json({ error: 'Configuration serveur manquante (Webhook)' });
  }

  const { opname, type, status, date, lead, agents, content, proof, ref } = req.body;

  let color = 3066993; 
  if (status === 'ÉCHEC' || status === 'CLASSIFIÉ') color = 15158332;
  if (status === 'EN COURS') color = 15105570;

  const embed = {
    title: `📄 RAPPORT : ${opname}`,
    color: color,
    description: `**REF:** SAS-${ref}\n**DATE:** ${date}`,
    fields: [
      { name: "STATUT", value: status, inline: true },
      { name: "TYPE", value: type, inline: true },
      { name: "OFFICIER", value: lead, inline: true },
      { name: "EFFECTIFS", value: agents, inline: false },
      { name: "RAPPORT DE SITUATION", value: content.substring(0, 1024) },
      { name: "PREUVES / PJ", value: proof }
    ],
    footer: {
      text: "SAS SECURE SYSTEM // AUTOMATED TRANSMISSION"
    },
    timestamp: new Date().toISOString()
  };

  try {
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: "SAS MAINFRAME",
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