export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const WEBHOOK_URL = "https://discord.com/api/webhooks/1444143910690492588/lxiIiONrsoa8bIIK36lkqzFGGKrjM41hf11Pa8YphSJagesBD_d_uHd12QUp_zQny4jY";
  if (!WEBHOOK_URL) return res.status(500).json({ error: 'Webhook manquant' });

  const { opname, type, status, date, lead, agents, content, proof, ref, fileData, fileName } = req.body;

  // 1. Préparer l'Embed (Le joli cadre coloré)
  let color = 3066993; // Vert
  if (status === 'ÉCHEC' || status === 'CLASSIFIÉ') color = 15158332; // Rouge
  if (status === 'EN COURS') color = 15105570; // Orange

  const embed = {
    title: `📄 NOUVEAU RAPPORT : ${opname}`,
    color: color,
    description: `**REF:** SAS-${ref}\n**DATE:** ${date}\n\nLe rapport complet est disponible en pièce jointe (PDF).`,
    fields: [
      { name: "STATUT", value: status, inline: true },
      { name: "TYPE", value: type, inline: true },
      { name: "OFFICIER", value: lead, inline: true },
      { name: "EFFECTIFS", value: agents, inline: false }
    ],
    footer: { text: "SAS SECURE SYSTEM // PDF SECURED" },
    timestamp: new Date().toISOString()
  };

  try {
    // 2. Créer un formulaire Multipart pour Discord (Fichier + JSON)
    const formData = new FormData();
    
    // Ajout des infos JSON (payload_json est le champ spécial Discord pour les embeds)
    formData.append('payload_json', JSON.stringify({
      username: "SAS MAINFRAME",
      embeds: [embed]
    }));

    // Ajout du fichier PDF si présent
    if (fileData && fileName) {
      // Conversion Base64 -> Buffer -> Blob
      const buffer = Buffer.from(fileData, 'base64');
      const pdfBlob = new Blob([buffer], { type: 'application/pdf' });
      formData.append('files[0]', pdfBlob, fileName);
    }

    // 3. Envoi à Discord
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      body: formData
    });

    if (response.ok) {
      return res.status(200).json({ message: 'Envoyé avec succès' });
    } else {
      const err = await response.text();
      console.error("Discord Error:", err);
      return res.status(500).json({ error: 'Refus de Discord' });
    }

  } catch (error) {
    console.error("Server Error:", error);
    return res.status(500).json({ error: 'Erreur interne' });
  }
}