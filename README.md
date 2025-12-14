# 🎵 Spotify Playing Widget

Widget interactivo creado con **React + Vite** que muestra en tiempo real qué canción estás escuchando en Spotify. 

✨ **Características:**
- **Diseño Glassmorphism:** Estilo "Glow" reactivo al movimiento del ratón.
- **Auto-refresco:** Consulta la API cada 5 segundos para actualizar la canción.
- **Auth Seguro:** Implementación de flujo **PKCE** (sin exponer secretos en el cliente).
- **Despliegue:** Hosteado en Vercel con rewrites para SPA.

## 🚀 Demo
¡Pruébalo en vivo aquí! 👉 [Ver Widget](https://spotify-widget-psi.vercel.app)

![Demo del widget](./assets/widget.gif)

![Mi canción de Spotify](https://spotify-widget-psi.vercel.app/api/badge?userId=c9cay0)

## 🛠️ Tecnologías
- React 19
- Vite
- Spotify Web API
- CSS3 (Variables & Animations)

## 📦 Instalación local
1. Clona el repo.
2. Crea un archivo `.env` con tu `VITE_SPOTIFY_CLIENT_ID`.
3. Ejecuta:
```bash
npm install
npm run dev
```

---

> 🤍 Espero que te guste mucho y te inspire uwu