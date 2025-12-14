import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
    const { userId } = req.query;

    if (!userId) return res.status(400).json({ error: 'Falta User ID' });

    try {
        const { rows } = await sql`SELECT refresh_token FROM widgets WHERE id = ${userId}`;
        
        if (rows.length === 0) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        const refresh_token = rows[0].refresh_token;

        const client_id = process.env.VITE_SPOTIFY_CLIENT_ID;
        const client_secret = process.env.VITE_SPOTIFY_CLIENT_SECRET;
        const basic = Buffer.from(`${client_id}:${client_secret}`).toString('base64');
        
        const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
            Authorization: `Basic ${basic}`,
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: refresh_token,
        }),
        });

        const tokenData = await tokenResponse.json();
        if (tokenData.error) return res.status(401).json({ error: 'Token caducado' });

        const songResponse = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
        });

        if (songResponse.status === 204 || songResponse.status > 400) {
        return res.status(200).json({ isPlaying: false });
        }

        const song = await songResponse.json();
        
        return res.status(200).json({
        isPlaying: song.is_playing,
        title: song.item.name,
        artist: song.item.artists.map((a) => a.name).join(', '),
        album: song.item.album.name,
        albumImageUrl: song.item.album.images[0].url,
        songUrl: song.item.external_urls.spotify,
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Error de servidor' });
    }
}