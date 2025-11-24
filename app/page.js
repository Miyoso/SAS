"use client";
import { useState, useEffect, useRef } from 'react';

export default function Home() {
  const [view, setView] = useState('dashboard');
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [inputVal, setInputVal] = useState('');
  const [history, setHistory] = useState([
    { type: 'info', text: 'SAS Mainframe [Version 4.0.2]' },
    { type: 'info', text: 'Connexion Secure... OK.' },
    { type: 'system', text: 'Utilisez /login [user] [password] pour vous connecter.' }
  ]);
  const [agent, setAgent] = useState(null);

  const historyRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (historyRef.current) {
      historyRef.current.scrollTop = historyRef.current.scrollHeight;
    }
  }, [history]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'F9') {
        e.preventDefault();
        setTerminalOpen(prev => !prev);
        if (!terminalOpen) setTimeout(() => inputRef.current?.focus(), 100);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [terminalOpen]);

  const handleCommand = async (e) => {
    if (e.key === 'Enter' && inputVal.trim() !== "") {
      const cmd = inputVal.trim();
      setHistory(prev => [...prev, { type: 'user', text: cmd }]);
      setInputVal('');

      if (cmd === '/clear') {
        setHistory([]);
        return;
      }
      
      if (cmd.startsWith('/login')) {
        setHistory(prev => [...prev, { type: 'info', text: 'Authentification...' }]);
        try {
          const res = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ command: cmd })
          });
          const data = await res.json();

          if (data.success) {
            setAgent(data.agent);
            setHistory(prev => [...prev, { type: 'success', text: `BIENVENUE AGENT ${data.agent.codename}.` }]);
          } else if (data.error) {
             setHistory(prev => [...prev, { type: 'error', text: data.error }]);
          } else {
             setHistory(prev => [...prev, { type: 'error', text: data.message }]);
          }
        } catch (err) {
          setHistory(prev => [...prev, { type: 'error', text: 'Erreur réseau.' }]);
        }
      } else {
        setTimeout(() => {
            setHistory(prev => [...prev, { type: 'system', text: 'Commande inconnue.' }]);
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
          
          <div className="header-strip">
            <h1>SAS <span style={{ textShadow: "0 0 10px var(--danger)" }}>MAINFRAME</span></h1>
            <div className="meta-data">
              <span style={{ color: "var(--primary)" }}>CONNECTED</span> // PING: 12ms<br />
              SYS.VER.4.0.2
            </div>
          </div>

          <div className={`view-section ${view === 'dashboard' ? '' : 'hidden'}`}>
            <div className="modules-section">
              <div className="category-title">// ACCRÉDITATION NIVEAU 1 [GÉNÉRAL]</div>
              <div className="grid-modules">
                <div className="module-card status-online"><div className="module-icon">👥</div><div><div className="module-name">BASE AGENTS</div><div className="module-status">● SYSTEM ONLINE</div></div></div>
                <div className="module-card status-online"><div className="module-icon">📜</div><div><div className="module-name">RÈGLEMENT</div><div className="module-status">● READ ONLY</div></div></div>
                <div className="module-card status-online"><div className="module-icon">🗺️</div><div><div className="module-name">CARTOGRAPHIE</div><div className="module-status">● LIVE FEED</div></div></div>
              </div>
              <div className="category-title">// ACCRÉDITATION NIVEAU 2 [CONFIDENTIEL]</div>
              <div className="grid-modules">
                <div className="module-card status-restricted"><div className="module-icon">🔍</div><div><div className="module-name">INVESTIGATION</div><div className="module-status">● RESTRICTED</div></div></div>
                <div className="module-card status-danger"><div className="module-icon">🎯</div><div><div className="module-name">VIP TARGETS</div><div className="module-status">● HIGH PRIORITY</div></div></div>
              </div>
            </div>

            <div className="sidebar-section">
              <div className="mini-profile">
                <div className="mini-avatar">👤</div>
                <div className="mini-details">
                  <div className="mini-name">{agent ? agent.codename : 'NON CONNECTÉ'}</div>
                  <div className="mini-rank">{agent ? `LVL ${agent.rank_lvl} // AGENT` : 'ACCÈS LIMITÉ'}</div>
                  {agent && <button onClick={() => setView('profile')} className="btn-profile-access">VOIR PROFIL {'>'}</button>}
                </div>
              </div>
              <div className="sidebar-header">{">>"} SERVER_LOGS</div>
              <div className="log-container">
                <div className="log-entry"><span className="log-time">[SYS]</span> Initialisation...</div>
                <div className="log-entry"><span className="log-time">[SYS]</span> Attente utilisateur...</div>
              </div>
            </div>
          </div>

          <div className={`view-section profile-view-container ${view === 'profile' ? '' : 'hidden'}`}>
            <button onClick={() => setView('dashboard')} className="back-button">{"<"} RETOUR DASHBOARD</button>
            {agent && (
            <>
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
              <div style={{ marginTop: '20px', color: 'var(--dim)', textAlign: 'center', fontSize: '0.9rem' }}>
                  DERNIÈRE SYNCHRONISATION: <span style={{color:'var(--primary)'}}>AUJOURD'HUI 08:00</span><br/>
                  LOCALISATION: <span style={{color:'var(--secondary)'}}>SECTEUR 4</span>
              </div>
            </>
            )}
          </div>

        </div>
      </div>

      <div className={`terminal-console ${terminalOpen ? 'open' : ''}`}>
        <div className="terminal-history" ref={historyRef}>
          {history.map((line, i) => (
             <div key={i} className={`term-line term-${line.type}`}>
               {line.type === 'user' ? '> ' : ''}{line.text}
             </div>
          ))}
        </div>
        <div className="terminal-input-area">
          <span className="prompt">root@sas-mainframe:~#</span>
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