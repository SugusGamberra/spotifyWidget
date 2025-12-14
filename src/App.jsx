import React, { useEffect, useState, useRef } from "react";
import "./App.css";

function App() {
  const [cancion, setCancion] = useState(null);
  const [magicLink, setMagicLink] = useState(null);
  const [loading, setLoading] = useState(false);
  const cardRef = useRef(null);

  const CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
  
  // detectar host dinamicamente
  const HOST = window.location.hostname.includes("localhost") || window.location.hostname.includes("127.0.0.1")
    ? "http://127.0.0.1:5173"
    : window.location.origin;
    
  const REDIRECT_URI = `${HOST}/callback`;

  // efecto glow
  const handlePointerMove = (e) => {
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const px = Math.min(Math.max((x / rect.width) * 100, 0), 100);
    const py = Math.min(Math.max((y / rect.height) * 100, 0), 100);
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const dx = x - centerX;
    const dy = y - centerY;
    let angle = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
    if (angle < 0) angle += 360;
    const distX = Math.abs(dx) / centerX;
    const distY = Math.abs(dy) / centerY;
    const edgeDist = Math.max(distX, distY);
    card.style.setProperty('--pointer-x', `${px.toFixed(2)}%`);
    card.style.setProperty('--pointer-y', `${py.toFixed(2)}%`);
    card.style.setProperty('--pointer-deg', `${angle.toFixed(2)}deg`);
    card.style.setProperty('--pointer-d', `${(edgeDist * 120).toFixed(2)}`); 
  };
  const handlePointerLeave = () => {
    if(cardRef.current) cardRef.current.style.setProperty('--pointer-d', '0');
  };

  // login pkce
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
    setLoading(true);
    const codeVerifier = generateRandomString(64);
    const hashed = await sha256(codeVerifier);
    const codeChallenge = base64encode(hashed);
    window.localStorage.setItem('code_verifier', codeVerifier);
    
    const scope = 'user-read-private user-read-currently-playing offline_access';
    
    const args = new URLSearchParams({
      response_type: 'code', client_id: CLIENT_ID, scope: scope,
      redirect_uri: REDIRECT_URI, code_challenge_method: 'S256', code_challenge: codeChallenge
    });
    window.location.href = `https://accounts.spotify.com/authorize?${args}`;
  };

  // logica principal
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const uid = urlParams.get('uid');

    // guardar en bd
    if (code) {
      setLoading(true);
      const codeVerifier = window.localStorage.getItem('code_verifier');

      fetch(`/api/auth?code=${code}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&code_verifier=${codeVerifier}`)
        .then(r => r.json())
        .then(data => {
          if (data.userId) {
            const link = `${HOST}/?uid=${data.userId}`;
            setMagicLink(link);
            window.history.replaceState({}, null, "/"); 
          } else {
            alert("Error conectando: " + (data.error || "Revisa tus variables de entorno"));
          }
        })
        .catch(err => console.error(err))
        .finally(() => setLoading(false));
      return;
    }

    // visita: leer bd
    if (uid) {
      const fetchSong = () => {
        fetch(`/api/now-playing?userId=${uid}`)
          .then(res => res.json())
          .then(data => {
              if (data.error) return; 
              if (data.isPlaying) {
                  setCancion(data);
              } else {
                  setCancion(null);
              }
          })
          .catch(e => console.error(e));
      };

      fetchSong();
      const interval = setInterval(fetchSong, 5000);
      return () => clearInterval(interval);
    }
  }, []);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(magicLink);
    alert("Copiado 📋");
  };

  const isVisitor = !!new URLSearchParams(window.location.search).get('uid');

  return (
    <main id="app">
      <div className="card" ref={cardRef} onPointerMove={handlePointerMove} onPointerLeave={handlePointerLeave}>
        <span className="glow"></span>
        <div className="inner">
          <header style={{ justifyContent: 'center' }}>
            <h2>Spotify Widget 🎵</h2>
          </header>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            
            {loading && <p style={{textAlign: 'center'}}>Conectando cables... ⚡</p>}

            {}
            {!isVisitor && !magicLink && !loading && (
              <div style={{textAlign: 'center'}}>
                <p style={{color: '#ccc', marginBottom: '20px'}}>
                  Genera una URL permanente para compartir tu música.
                </p>
                <button onClick={handleLogin} className="login-btn">
                  Crear mi Widget DB 🗄️
                </button>
              </div>
            )}

            {}
            {magicLink && (
              <div style={{textAlign: 'center', wordBreak: 'break-all'}}>
                <h3 style={{color: '#1DB954'}}>¡Guardado en BD! 💾</h3>
                <p style={{fontSize: '0.8em', color: '#ccc'}}>Tu enlace permanente:</p>
                <div style={{background: 'rgba(0,0,0,0.3)', padding: '10px', borderRadius: '5px', fontSize: '0.8em', margin: '10px 0', fontFamily: 'monospace', color: '#fff'}}>
                  {magicLink}
                </div>
                <button onClick={copyToClipboard} className="spotify-btn" style={{fontSize: '0.8em'}}>
                  Copiar
                </button>
              </div>
            )}

            {}
            {isVisitor && (
              <>
                {cancion ? (
                  <div className="content">
                    <img src={cancion.albumImageUrl} alt="Album" className="album-cover" />
                    <div className="song-info">
                      <h2 title={cancion.title}>{cancion.title}</h2>
                      <p>{cancion.artist}</p>
                      <div style={{marginTop: '10px', fontSize: '0.8em', color: '#1DB954', display: 'flex', alignItems: 'center', gap: '5px'}}>
                          <span className="loading-pulse">●</span> En directo
                      </div>
                    </div>
                    <div style={{marginTop: '20px', textAlign: 'center'}}>
                      <a href={cancion.songUrl} target="_blank" rel="noreferrer" className="spotify-btn">Abrir 🎧</a>
                    </div>
                  </div>
                ) : (
                  <div style={{textAlign: 'center', color: '#888'}}>
                    <p style={{fontSize: '3em', margin: '0'}}>💤</p>
                    <p>No suena nada...</p>
                  </div>
                )}
              </>
            )}

          </div>
        </div>
      </div>
    </main>
  );
}

export default App;