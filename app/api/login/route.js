import pool from '@/lib/db';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { command } = await request.json();
    
    // Vérification basique de la commande
    if (!command || !command.startsWith('/login')) {
      return NextResponse.json({ error: "Commande invalide." }, { status: 400 });
    }

    const parts = command.split(' ');
    
    // Vérifie qu'on a bien /login + user + pass
    if (parts.length !== 3) {
      return NextResponse.json({ error: "Format: /login [user] [password]" }, { status: 400 });
    }

    const [_, username, password] = parts;

    // Connexion à Neon
    const client = await pool.connect();
    try {
      const result = await client.query(
        'SELECT username, codename, rank_lvl, matricule FROM agents WHERE username = $1 AND password = $2',
        [username, password]
      );
      
      if (result.rows.length > 0) {
        return NextResponse.json({ success: true, agent: result.rows[0] });
      } else {
        return NextResponse.json({ success: false, message: "Identifiants incorrects." });
      }
    } finally {
      client.release(); // Libère la connexion quoi qu'il arrive
    }

  } catch (err) {
    console.error("Erreur API:", err);
    return NextResponse.json({ error: "Erreur serveur interne." }, { status: 500 });
  }
}