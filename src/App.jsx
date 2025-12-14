import React, { useEffect, useState, useRef } from "react";
import "./App.css";

function App() {
  const [token, setToken] = useState(window.localStorage.getItem("token") || "");
  const [cancion, setCancion] = useState(null);
  const fetching = useRef(false);
  const cardRef = useRef(null);

  const CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
  const REDIRECT_URI = import.meta.env.VITE_REDIRECT_URI || "http://127.0.0.1:5173/callback";
  
  const AUTH_ENDPOINT = "https://accounts.spotify.com/authorize";
  const TOKEN_ENDPOINT = "https://accounts.spotify.com/api/token";
  const API_ENDPOINT = "https://api.spotify.com/v1/me/player/currently-playing";

  // logica del glow interactivo
  const handlePointerMove = (e) => {
    const card = cardRef.current;
    if (!card) return;

    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    //posicion %
    const px = Math.min(Math.max((x / rect.width) * 100, 0), 100);
    const py = Math.min(Math.max((y / rect.height) * 100, 0), 100);

    //angulo
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const dx = x - centerX;
    const dy = y - centerY;
    let angle = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
    if (angle < 0) angle += 360;

    // Distancia al borde
    const distX = Math.abs(dx) / centerX;
    const distY = Math.abs(dy) / centerY;
    const edgeDist = Math.max(distX, distY);
    
    // variables css
    card.style.setProperty('--pointer-x', `${px.toFixed(2)}%`);
    card.style.setProperty('--pointer-y', `${py.toFixed(2)}%`);
    card.style.setProperty('--pointer-deg', `${angle.toFixed(2)}deg`);
    card.style.setProperty('--pointer-d', `${(edgeDist * 120).toFixed(2)}`); 
  };

  const handlePointerLeave = () => {
    if (cardRef.current) {
      cardRef.current.style.setProperty('--pointer-d', '0');
    }
  };

  //logica spotify
  const generateRandomString = (length) => {
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const values = crypto.getRandomValues(new Uint8Array(length));
    return values.reduce((acc, x) => acc + possible[x % possible.length], "");
  };
  const sha256 = async (plain) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(plain);
    return window.crypto.subtle.digest('SHA-256', data);
  };
  const base64encode = (input) => {
    return btoa(String.fromCharCode(...new Uint8Array(input)))
      .replace(/=/g, '') .replace(/\+/g, '-') .replace(/\//g, '_');
  };

  const handleLogin = async () => {
    const codeVerifier = generateRandomString(64);
    const hashed = await sha256(codeVerifier);
    const codeChallenge = base64encode(hashed);
    window.localStorage.setItem('code_verifier', codeVerifier);
    const args = new URLSearchParams({
      response_type: 'code', client_id: CLIENT_ID, scope: 'user-read-private user-read-email user-read-currently-playing',
      redirect_uri: REDIRECT_URI, code_challenge_method: 'S256', code_challenge: codeChallenge
    });
    window.location.href = `${AUTH_ENDPOINT}?${args}`;
  };

  useEffect(() => {
    const args = new URLSearchParams(window.location.search);
    const code = args.get('code');
    if (code && !fetching.current) {
      fetching.current = true;
      const codeVerifier = window.localStorage.getItem('code_verifier');
      const body = new URLSearchParams({
        grant_type: 'authorization_code', code: code, redirect_uri: REDIRECT_URI, client_id: CLIENT_ID, code_verifier: codeVerifier
      });
      fetch(TOKEN_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: body })
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(data => {
        window.localStorage.setItem('token', data.access_token);
        setToken(data.access_token);
        window.history.replaceState({}, null, "/");
      })
      .catch(e => console.error("Error login:", e))
      .finally(() => { fetching.current = false; });
    }
  }, []);

  // auto refresco
  useEffect(() => {
    if (!token) return;
    const fetchSong = () => {
      fetch(API_ENDPOINT, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => {
        if (res.status === 204) { setCancion(null); return null; }
        if (res.status === 401) { logout(); return null; }
        return res.json();
      })
      .then(data => {
        if (data && data.item) {
          setCancion({
            nombre: data.item.name,
            artista: data.item.artists[0].name,
            album: data.item.album.images[0].url,
            link: data.item.external_urls.spotify,
            isPlaying: data.is_playing
          });
        }
      })
      .catch(e => console.error("Error fetch:", e));
    };

    fetchSong();

    // autorefresco
    const intervalId = setInterval(fetchSong, 5000);

    return () => clearInterval(intervalId);
  }, [token]);

  const logout = () => {
    setToken(""); setCancion(null);
    window.localStorage.removeItem("token"); window.localStorage.removeItem("code_verifier");
  };

  return (
    <main id="app">
      {}
      <div 
        className="card" 
        ref={cardRef}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
      >
        <span className="glow"></span>
        <div className="inner">
          
          <header style={{ justifyContent: 'center' }}>
            <h2>Spotify Widget</h2>
          </header>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            {!token ? (
              <div style={{textAlign: 'center'}}>
                <p style={{marginBottom: '20px', color: '#ccc'}}>Conecta tu cuenta para ver la magia ✨</p>
                <button onClick={handleLogin} className="login-btn">
                  Conectar con Spotify
                </button>
              </div>
            ) : (
              <>
                {cancion ? (
                  <div className="content">
                    <img src={cancion.album} alt="Album" className="album-cover" />
                    <div className="song-info">
                      <h2 title={cancion.nombre}>{cancion.nombre}</h2>
                      <p>{cancion.artista}</p>
                      {}
                      <div style={{marginTop: '10px', fontSize: '0.8em', color: '#1DB954', display: 'flex', alignItems: 'center', gap: '5px'}}>
                        {cancion.isPlaying ? (
                          <>
                            <span className="loading-pulse">●</span> Reproduciendo
                          </>
                        ) : (
                          <span style={{color: '#888'}}>⏸ Pausado</span>
                        )}
                      </div>
                    </div>
                    
                    <div style={{marginTop: '20px', textAlign: 'center'}}>
                      <a href={cancion.link} target="_blank" rel="noreferrer" className="spotify-btn">
                        Abrir en Spotify
                      </a>
                    </div>
                  </div>
                ) : (
                  <div style={{textAlign: 'center', color: '#888'}}>
                    <p style={{fontSize: '3em', margin: '0'}}>🔇</p>
                    <p>Silencio absoluto...</p>
                    <p style={{fontSize: '0.8em'}}>Dale al play en tu Spotify</p>
                  </div>
                )}
                
                <div style={{textAlign: 'center'}}>
                  <button onClick={logout} className="logout-btn">Desconectar</button>
                </div>
              </>
            )}
          </div>

        </div>
      </div>
    </main>
  );
}

export default App;