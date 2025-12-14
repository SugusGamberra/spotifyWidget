import { sql } from '@vercel/postgres';

const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const TOKEN_ENDPOINT = 'https://accounts.spotify.com/api/token';
const NOW_PLAYING_ENDPOINT = 'https://api.spotify.com/v1/me/player/currently-playing';

// generar svg con la cancion actual
const generateSVG = (title, artist, coverUrl) => {
    const template = `
        <svg width="350" height="100" xmlns="http://www.w3.org/2000/svg">
        <style>
            .title { font: 14px sans-serif; fill: #1DB954; font-weight: bold; }
            .artist { font: 12px sans-serif; fill: #ccc; }
        </style>
        <rect x="0" y="0" width="350" height="100" fill="#282c34" rx="10"/>
        <image href="${coverUrl}" x="10" y="10" height="80" width="80" />
        <text x="100" y="35" class="title">Escuchando ahora</text>
        <text x="100" y="55" class="title">${title}</text>
        <text x="100" y="75" class="artist">Por ${artist}</text>
        </svg>
    `;
    return template;
};

// para cuando no haya cancion
const generateEmptySVG = () => {
    return `
        <svg width="350" height="50" xmlns="http://www.w3.org/2000/svg">
        <style>.text { font: 14px sans-serif; fill: #fff; }</style>
        <rect x="0" y="0" width="350" height="50" fill="#282c34" rx="10"/>
        <text x="10" y="30" class="text">💤 No suena nada en Spotify 💤</text>
        </svg>
    `;
};

export default async function handler(req, res) {
    const { userId } = req.query;

    if (!userId) {
        res.setHeader('Content-Type', 'image/svg+xml');
        return res.status(200).send(generateEmptySVG());
    }

    try {
        const { rows } = await sql`SELECT refresh_token FROM widgets WHERE id = ${userId}`;
        if (rows.length === 0) {
        res.setHeader('Content-Type', 'image/svg+xml');
        return res.status(200).send(generateEmptySVG());
        }

        const refresh_token = rows[0].refresh_token;
        
        const basic = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
        const tokenResponse = await fetch(TOKEN_ENDPOINT, {
        method: 'POST',
        headers: { Authorization: `Basic ${basic}`, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refresh_token }),
        });

        const tokenData = await tokenResponse.json();
        if (tokenData.error) {
        if (tokenData.refresh_token) {
            await sql`UPDATE widgets SET refresh_token = ${tokenData.refresh_token} WHERE id = ${userId}`;
        } else {
            res.setHeader('Content-Type', 'image/svg+xml');
            return res.status(200).send(generateEmptySVG());
        }
        }
        
        const songResponse = await fetch(NOW_PLAYING_ENDPOINT, {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
        });

        res.setHeader('Content-Type', 'image/svg+xml');
        res.setHeader('Cache-Control', 's-maxage=1, stale-while-revalidate'); // Caché corto para que se actualice

        if (songResponse.status === 204 || songResponse.status > 400) {
        return res.status(200).send(generateEmptySVG());
        }

        const song = await songResponse.json();
        
        return res.status(200).send(
        generateSVG(
            song.item.name, 
            song.item.artists.map((a) => a.name).join(', '), 
            song.item.album.images[0].url
        )
        );

    } catch (error) {
        res.setHeader('Content-Type', 'image/svg+xml');
        return res.status(500).send(generateEmptySVG());
    }
}