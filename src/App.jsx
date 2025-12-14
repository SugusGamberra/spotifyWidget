import React, { useEffect, useState } from "react";
import "./App.css";

function App() {
  const [token, setToken] = useState("");

  // Variables de entorno
  const CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
  const REDIRECT_URI = "http://localhost:5173/callback";
  
  // Endpoint de Spotify
  const AUTH_ENDPOINT = "https://accounts.spotify.com/authorize";

  useEffect(() => {
    const hash = window.location.hash;
    let token = window.localStorage.getItem("token");

    // limpieza del token de la URL
    if (!token && hash) {
      token = hash.substring(1).split("&").find(elem => elem.startsWith("access_token")).split("=")[1];
      window.location.hash = "";
      window.localStorage.setItem("token", token);
    }

    setToken(token);
  }, []);

  // Función para cerrar sesión
  const logout = () => {
    setToken("");
    window.localStorage.removeItem("token");
  };

  return (
    <div className="card">
      <header className="App-header">
        <h1>🎵 Mi Spotify Widget</h1>
        
        {!token ? (
          /* Si NO hay token, mostrar el botón de Login */
          <a
            href={`${AUTH_ENDPOINT}?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&response_type=${RESPONSE_TYPE}`}
            className="login-btn"
            style={{ 
              padding: '10px 20px', 
              backgroundColor: '#1DB954', 
              color: 'white', 
              textDecoration: 'none', 
              borderRadius: '20px', 
              fontWeight: 'bold' 
            }}
          >
            Iniciar Sesión con Spotify
          </a>
        ) : (
          /* Si hay token, mostrar que estamos dentro */
          <div>
            <h3>¡Ya estás dentro! 🔓</h3>
            <p>Token guardado con éxito.</p>
            <button onClick={logout} style={{marginTop: '20px'}}>Cerrar Sesión</button>
          </div>
        )}
      </header>
    </div>
  );
}

export default App;