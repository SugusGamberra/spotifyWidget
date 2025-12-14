import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
    const { code, redirect_uri, code_verifier } = req.query;

    if (!code) return res.status(400).json({ error: 'No hay código' });

    const client_id = process.env.SPOTIFY_CLIENT_ID;
    const client_secret = process.env.SPOTIFY_CLIENT_SECRET;
    
    if (!client_secret) return res.status(500).json({ error: 'Falta configurar SPOTIFY_CLIENT_SECRET en Vercel' });

    const basic = Buffer.from(`${client_id}:${client_secret}`).toString('base64');
    
    const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
        Authorization: `Basic ${basic}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirect_uri,
        code_verifier: code_verifier, 
        }),
    });

    const data = await response.json();

    if (data.error || !data.refresh_token) {
        return res.status(401).json({ error: data.error_description || 'Error obteniendo token' });
    }

    const userId = Math.random().toString(36).substring(2, 8);

    try {
        await sql`
        INSERT INTO widgets (id, refresh_token)
        VALUES (${userId}, ${data.refresh_token})
        `;
        return res.status(200).json({ userId });
    } catch (error) {
        return res.status(500).json({ error: 'Error guardando en base de datos' });
    }
}