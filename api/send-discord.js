export default async function handler(req, res) {
  // --- DEBUG MODE ---
  
  // 1. Vérifier la méthode
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée (attendu: POST)' });
  }

  // 2. Vérifier la variable d'environnement
  const WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;
  if (!WEBHOOK_URL) {
    console.error("ERREUR: Variable DISCORD_WEBHOOK_URL introuvable.");
    return res.status(500).json({ error: 'Variable DISCORD_WEBHOOK_URL manquante sur le serveur.' });
  }

  // 3. Vérifier le contenu reçu
  const { opname, status } = req.body;
  if (!opname) {
    return res.status(400).json({ error: 'Données incomplètes reçues du formulaire.' });
  }

  // Construction du message Discord
  let color = 3066993; // Vert
  if (status === 'ÉCHEC' || status === 'CLASSIFIÉ') color = 15158332; // Rouge
  if (status === 'EN COURS') color = 15105570; // Orange

  const embed = {
    title: `📄 RAPPORT : ${opname}`,
    color: color,
    description: `Test transmission`,
    fields: [
      { name: "STATUT", value: status || "Inconnu", inline: true }
    ],
    footer: { text: "DEBUG MODE" }
  };

  try {
    // 4. Tenter l'envoi à Discord
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: "SAS DEBUGGER",
        embeds: [embed]
      })
    });

    // 5. Analyser la réponse de Discord
    if (response.ok) {
      return res.status(200).json({ message: 'Succès ! Discord a accepté le message.' });
    } else {
      const errorText = await response.text();
      console.error("Discord a rejeté le message :", errorText);
      return res.status(500).json({ error: `Discord a refusé : ${errorText}` });
    }

  } catch (error) {
    return res.status(500).json({ error: `Erreur technique : ${error.message}` });
  }
}