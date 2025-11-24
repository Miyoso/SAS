"use client";
import { useState, useEffect, useRef } from 'react';

export default function Home() {
  // --- ÉTATS (STATE) ---
  const [view, setView] = useState('dashboard'); // 'dashboard' ou 'profile'
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [inputVal, setInputVal] = useState('');
  const [history, setHistory] = useState([
    { type: 'info', text: 'SAS Mainframe [Version 4.0.2]' },
    { type: 'info', text: 'Connexion Neon Database... PRETE.' },
    { type: 'system', text: 'Pour vous connecter : /login [user] [pass]' }
  ]);
  
  // Données de l'utilisateur connecté (par défaut null ou invité)
  const [agent, setAgent] = useState(null);

  const historyRef = useRef(null);
  const inputRef = useRef(null);

  // --- EFFETS ---
  // Scroll automatique du terminal
  useEffect(() => {
    if (historyRef.current) {
      historyRef.current.scrollTop = historyRef.current.scrollHeight;
    }
  }, [history]);

  // Écouteur Touche F9
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'F9') {
        e.preventDefault();
        setTerminalOpen(prev => !prev);
        // Focus input après ouverture
        if (!terminalOpen) setTimeout(() => inputRef.current?.focus(), 100);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [terminalOpen]);

  // --- LOGIQUE TERMINAL ---
  const handleCommand = async (e) => {
    if (e.key === 'Enter' && inputVal.trim() !== "") {
      const cmd = inputVal.trim();
      
      // 1. Ajout commande user à l'historique
      setHistory(prev => [...prev, { type: 'user', text: cmd }]);
      setInputVal('');

      // 2. Traitement local
      if (cmd === '/clear') {
        setHistory([]);
        return;
      }
      
      // 3. Traitement Login (Appel API vers Neon)
      if (cmd.startsWith('/login')) {
        setHistory(prev => [...prev, { type: 'info', text: 'Authentification en cours...' }]);
        
        try {
          const res = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ command: cmd })
          });
          const data = await res.json();

          if (data.success) {
            setAgent(data.agent);
            setHistory(prev => [...prev, { type: 'success', text: `ACCÈS AUTORISÉ. Bienvenue ${data.agent.codename}.` }]);
          } else if (data.error) {
             setHistory(prev => [...prev, { type: 'error', text: data.error }]);
          } else {
             setHistory(prev => [...prev, { type: 'error', text: data.message || 'Échec.' }]);
          }
        } catch (err) {
          setHistory(prev => [...prev, { type: 'error', text: 'Erreur de connexion serveur.' }]);
        }
      } else {
        // Autres commandes simulées
        setTimeout(() => {
            setHistory(prev => [...prev, { type: 'system', text: `Commande '${cmd.split(' ')[0]}' inconnue ou locale.` }]);
        }, 200);
      }
    }
  };

  return (
    <main>
      <div className="crt-overlay"></div>
      <div className="term-hint">PRESS [ F9 ] FOR CONSOLE</div>

      <div className="terminal-wrapper">
        <div className="terminal">
          
          {/* HEADER */}
          <div className="header-strip">
            <h1>SAS <span style={{ textShadow: "0 0 10px var(--danger)" }}>MAINFRAME</span></h1>
            <div className="meta-data">
              <span style={{ color: "var(--primary)" }}>CONNECTED</span> // PING: 12ms<br />
              SYS.VER.NEXT.JS
            </div>
          </div>

          {/* DASHBOARD VIEW */}
          <div className={`view-section ${view === 'dashboard' ? '' : 'hidden'}`}>
            <div className="modules-section">
              <div className="category-title">// ACCRÉDITATION NIVEAU 1 [GÉNÉRAL]</div>
              <div className="grid-modules">
                 {/* Modules statiques pour l'exemple */}
                <div className="module-card status-online"><div className="module-icon">👥</div><div><div className="module-name">BASE AGENTS</div><div className="module-status">● SYSTEM ONLINE</div></div></div>
                <div className="module-card status-restricted"><div className="module-icon">🔍</div><div><div className="module-name">INVESTIGATION</div><div className="module-status">● RESTRICTED</div></div></div>
              </div>
            </div>

            <div className="sidebar-section">
              <div className="mini-profile">
                <div className="mini-avatar">👤</div>
                <div className="mini-details">
                  {/* DONNÉES DYNAMIQUES VENANT DE NEON */}
                  <div className="mini-name">{agent ? agent.codename : 'GUEST'}</div>
                  <div className="mini-rank">{agent ? `LVL ${agent.rank_lvl} // AGENT` : 'NON AUTHENTIFIÉ'}</div>
                  {agent && <button onClick={() => setView('profile')} className="btn-profile-access">VOIR PROFIL {'>'}</button>}
                </div>
              </div>
              <div className="sidebar-header">{">>"} SERVER_LOGS</div>
              <div className="log-container">
                <div className="log-entry"><span className="log-time">[SYS]</span> En attente de login...</div>
              </div>
            </div>
          </div>

          {/* PROFILE VIEW (Dynamique) */}
          <div className={`view-section profile-view-container ${view === 'profile' ? '' : 'hidden'}`}>
            <button onClick={() => setView('dashboard')} className="back-button">{"<"} RETOUR DASHBOARD</button>
            {agent && (
            <div className="id-card-container">
              <div className="id-card">
                <div className="card-header"><span className="card-logo-text">SAS AGENT</span><span className="security-level">LVL. {agent.rank_lvl}</span></div>
                <div className="card-body">
                  <div className="photo-box">👤</div>
                  <div className="agent-info">
                    <div className="card-label">Nom de code</div><div className="card-value">{agent.codename}</div>
                    <div className="card-label">Matricule</div><div className="card-code">{agent.matricule}</div>
                  </div>
                </div>
                <div className="card-footer"><div className="barcode">CODE 847</div></div>
              </div>
            </div>
            )}
          </div>

        </div>
      </div>

      {/* TERMINAL CONSOLE */}
      <div className={`terminal-console ${terminalOpen ? 'open' : ''}`}>
        <div className="terminal-history" ref={historyRef}>
          {history.map((line, i) => (
             <div key={i} className={`term-line term-${line.type}`}>{line.type === 'user' ? '> ' : ''}{line.text}</div>
          ))}
        </div>
        <div className="terminal-input-area">
          <span className="prompt">root@sas-neon:~#</span>
          <input 
            ref={inputRef}
            type="text" 
            className="cmd-input" 
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={handleCommand}
            placeholder="Entrez une commande..." 
            autoComplete="off"
          />
        </div>
      </div>
    </main>
  );
}