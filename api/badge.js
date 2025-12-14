import { sql } from '@vercel/postgres';

const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const TOKEN_ENDPOINT = 'https://accounts.spotify.com/api/token';
const NOW_PLAYING_ENDPOINT = 'https://api.spotify.com/v1/me/player/currently-playing';


const escapeHtml = (str) => {
    return str.replace(/&/g, '&')
                .replace(/</g, '<')
                .replace(/>/g, '>')
                .replace(/"/g, '"')
                .replace(/'/g, '&#39;');
};

const generateSVG = (title, artist, coverUrl) => {
    const safeTitle = escapeHtml(title);
    const safeArtist = escapeHtml(artist);
    
    const template = `
    <svg width="360" height="110" viewBox="0 0 360 110" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
        <style>
            .bg-card { fill: #181818; stroke: #303030; stroke-width: 1; rx: 12; }
            .title { font: 600 16px sans-serif; fill: #FFFFFF; }
            .artist { font: 14px sans-serif; fill: #B3B3B3; }
            .playing-indicator { font: 12px sans-serif; fill: #1DB954; }
        </style>
        
        <rect x="1" y="1" width="358" height="108" class="bg-card" />
        
        <image xlink:href="${coverUrl}" x="15" y="15" height="80" width="80" />
        
        <text x="110" y="38" class="title">${safeTitle}</text>
        <text x="110" y="62" class="artist">${safeArtist}</text>
        
        <text x="110" y="86" class="playing-indicator">
            <tspan style="font-size: 18px; line-height: 1; margin-right: 5px;">•</tspan> En directo
        </text>
        </svg>
    `;
    return template;
};

const generateEmptySVG = () => {
    return `
        <svg width="360" height="110" viewBox="0 0 360 110" xmlns="http://www.w3.org/2000/svg">
        <style>
            .bg-card { fill: #181818; stroke: #303030; stroke-width: 1; rx: 12; }
            .text { font: 16px sans-serif; fill: #B3B3B3; text-anchor: middle; }
        </style>
        <rect x="1" y="1" width="358" height="108" class="bg-card" />
        <text x="180" y="55" class="text">💤 No suena nada en Spotify 💤</text>
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
        } else if (tokenData.refresh_token) {
            await sql`UPDATE widgets SET refresh_token = ${tokenData.refresh_token} WHERE id = ${userId}`;
        }
        
        const songResponse = await fetch(NOW_PLAYING_ENDPOINT, {
            headers: { Authorization: `Bearer ${tokenData.access_token}` },
        });

        res.setHeader('Content-Type', 'image/svg+xml');
        res.setHeader('Cache-Control', 's-maxage=1, stale-while-revalidate'); 

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