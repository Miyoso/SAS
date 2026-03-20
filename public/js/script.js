let currentUser = null;

const avatarMap = {
    'adam': 'Adam.jpg', 'blake': 'Blake.png', 'blitz': 'Blitz.png',
    'dust': 'Dust.png', 'wei': 'Dust.png', 'graves': 'Graves.jpg',
    'jackal': 'Jackal.jpg', 'ji': 'Jackal.jpg', 'javier': 'Javier.jpg',
    'lexa': 'Lexa.png', 'selena': 'Lexa.png', 'lovelace': 'LoveLace.jpg',
    'nyx': 'LoveLace.jpg', 'roxanne': 'Roxanne.jpg'
};

// --- MOTEUR AUDIO (Sound Design généré en JS, pas besoin de fichiers audio) ---
const AudioContext = window.AudioContext || window.webkitAudioContext;
let audioCtx;

function initAudio() {
    if (!audioCtx) audioCtx = new AudioContext();
    if (audioCtx.state === 'suspended') audioCtx.resume();
}

function playSound(type) {
    if (!audioCtx) return; // Sécurité si le son n'est pas initialisé
    
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    const now = audioCtx.currentTime;
    
    if (type === 'hover') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, now);
        gain.gain.setValueAtTime(0.02, now);
        osc.start(now);
        osc.stop(now + 0.05);
    } else if (type === 'error') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, now);
        gain.gain.setValueAtTime(0.08, now);
        osc.start(now);
        osc.stop(now + 0.2);
    } else if (type === 'success') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.exponentialRampToValueAtTime(1200, now + 0.1);
        gain.gain.setValueAtTime(0.05, now);
        osc.start(now);
        osc.stop(now + 0.15);
    } else if (type === 'process') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(2000, now);
        gain.gain.setValueAtTime(0.01, now);
        osc.start(now);
        osc.stop(now + 0.03);
    }
}

// Ajouter le son de survol à tous les boutons
document.addEventListener('mouseover', (e) => {
    if (e.target.tagName === 'BUTTON' || e.target.closest('.module-card')) {
        playSound('hover');
    }
});

// --- EFFET DE DÉCRYPTAGE (Scramble) ---
function scrambleText(element, finalString) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&*<>';
    let iterations = 0;
    const interval = setInterval(() => {
        element.innerText = finalString.split('').map((char, index) => {
            if (char === ' ' || char === '-') return char;
            if (index < iterations) return finalString[index];
            return chars[Math.floor(Math.random() * chars.length)];
        }).join('');
        
        if (iterations >= finalString.length) clearInterval(interval);
        iterations += 1 / 2; // Vitesse de décryptage
    }, 30);
}

function addLog(msg, type = "info") {
    const logList = document.getElementById('system-logs');
    if(logList) {
        playSound('process');
        logList.innerHTML = `<li class="log-item ${type}"><span class="log-time">MAINTENANT</span><span class="log-msg">${msg}</span></li>` + logList.innerHTML;
    }
}

function logout() {
    localStorage.removeItem('sas_session');
    localStorage.removeItem('userSecurityLevel');
    localStorage.removeItem('sas_token');
    document.body.classList.remove('logged-in');
    window.location.href = 'index.html';
}
window.logout = logout;

async function handleLogin() {
    initAudio(); // On initialise l'audio au premier clic
    
    const user = document.getElementById('login-username').value.trim();
    const pass = document.getElementById('login-password').value.trim();
    const msg = document.getElementById('login-msg');
    const loginBox = document.getElementById('login-box');

    if (!user || !pass) {
        msg.textContent = "ERREUR: CHAMPS VIDES REQUIS";
        msg.className = "term-line term-error";
        loginBox.classList.add('glitch-anim');
        playSound('error');
        setTimeout(() => loginBox.classList.remove('glitch-anim'), 300);
        return;
    }

    // UX : Faux délai d'interrogation satellite
    msg.textContent = "[ INTERROGATION DES SERVEURS... ]";
    msg.className = "term-line term-dim blink";
    
    setTimeout(async () => {
        try {
            const response = await fetch('/api/auth?action=login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: user, password: pass })
            });
            const data = await response.json();

            if (response.ok) {
                msg.textContent = "ACCÈS ACCORDÉ. DÉCRYPTAGE...";
                msg.className = "term-line term-info blink";
                playSound('success');
                
                localStorage.setItem('sas_token', data.token);
                localStorage.setItem('sas_session', JSON.stringify(data.agent));
                localStorage.setItem('userSecurityLevel', data.agent.rank);
                
                setTimeout(() => window.location.reload(), 800);
            } else {
                msg.textContent = "⛔ ÉCHEC : MATRICULE OU CODE INVALIDE";
                msg.className = "term-line term-error";
                loginBox.classList.add('glitch-anim');
                playSound('error');
                setTimeout(() => loginBox.classList.remove('glitch-anim'), 400);
            }
        } catch (err) {
            msg.textContent = "⛔ ERREUR CONNEXION MAINFRAME";
            msg.className = "term-line term-error";
            playSound('error');
        }
    }, 700); // 700ms de fake delay
}
window.handleLogin = handleLogin;

// Gestion de l'accès aux modules (Sécurité visuelle + Redirection)
function accessModule(url, requiredLevel) {
    if(url === '#') return;
    initAudio();
    
    const currentLevel = parseInt(localStorage.getItem('userSecurityLevel') || 0);
    
    if (currentLevel >= requiredLevel) { 
        playSound('success');
        addLog(`Accès autorisé au module. Décryptage en cours...`, "info");
        
        // Faux délai d'ouverture de module
        setTimeout(() => {
            window.location.href = url;
        }, 500);
    } else { 
        playSound('error');
        addLog(`ACCÈS REFUSÉ : ACCRÉDITATION NIVEAU ${requiredLevel} REQUISE.`, "alert");
        
        // Fait trembler l'écran entier pour simuler le rejet
        document.body.style.transform = "translateX(5px)";
        setTimeout(() => document.body.style.transform = "translateX(-5px)", 50);
        setTimeout(() => document.body.style.transform = "translateX(0)", 100);
    }
}
window.accessModule = accessModule;

function unlockInterface(agent) {
    document.body.classList.add('logged-in');
    
    const miniU = document.getElementById('mini-username');
    const miniR = document.getElementById('mini-rank');
    
    // Application de l'effet Scramble sur les infos agents
    if(miniU) scrambleText(miniU, agent.username.toUpperCase());
    if(miniR) scrambleText(miniR, `LVL-${agent.rank}`);

    const sideA = document.getElementById('sidebar-avatar');
    if(sideA) {
        const name = agent.username.toLowerCase();
        sideA.src = avatarMap[name] ? `assets/${avatarMap[name]}` : 'assets/default.jpg';
    }

    if(connStatus) {
        connStatus.textContent = "CONNECTED";
        connStatus.style.color = "var(--accent-primary)";
    }
}

async function restoreSession() {
    const token = localStorage.getItem('sas_token');
    if (!token) return;

    try {
        const response = await fetch('/api/auth?action=me', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
            const data = await response.json();
            unlockInterface(data.agent);
        } else {
            logout();
        }
    } catch (e) {
        console.error("Session error", e);
    }
}

// Raccourcis clavier
document.addEventListener('keydown', (e) => {
    // Si l'utilisateur n'est pas connecté, Entrée valide le formulaire
    if (e.key === 'Enter' && !document.body.classList.contains('logged-in')) {
        handleLogin();
    }
    
    // Raccourcis clavier (touches 1, 2, 3, 4) pour naviguer vite si connecté
    if (document.body.classList.contains('logged-in')) {
        if (e.key === '1') accessModule('database.html', 1);
        if (e.key === '2') accessModule('reglement.html', 1);
        if (e.key === '3') accessModule('map.html', 1);
        if (e.key === '4') accessModule('report.html', 1);
    }
});

document.addEventListener('DOMContentLoaded', restoreSession);