// app/api/login/route.js
import pool from '@/lib/db';
import { NextResponse } from 'next/server';

export async function POST(request) {
  const { command } = await request.json();
  
  // Format attendu: /login user password
  const parts = command.split(' ');
  
  if (parts.length !== 3 || parts[0] !== '/login') {
    return NextResponse.json({ error: "Format invalide. Utilisez: /login [user] [pass]" }, { status: 400 });
  }

  const [_, username, password] = parts;

  try {
    const client = await pool.connect();
    const result = await client.query(
      'SELECT username, codename, rank_lvl, matricule FROM agents WHERE username = $1 AND password = $2',
      [username, password]
    );
    client.release();

    if (result.rows.length > 0) {
      return NextResponse.json({ success: true, agent: result.rows[0] });
    } else {
      return NextResponse.json({ success: false, message: "Accès refusé. Identifiants invalides." });
    }
  } catch (err) {
    return NextResponse.json({ error: "Erreur serveur BDD" }, { status: 500 });
  }
}