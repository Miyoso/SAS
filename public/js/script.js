const terminal = document.getElementById('terminal-console');
const connStatus = document.getElementById('conn-status');
let currentUser = null;

const avatarMap = {
    'adam': 'Adam.jpg', 'blake': 'Blake.png', 'blitz': 'Blitz.png',
    'dust': 'Dust.png', 'wei': 'Dust.png', 'graves': 'Graves.jpg',
    'jackal': 'Jackal.jpg', 'ji': 'Jackal.jpg', 'javier': 'Javier.jpg',
    'lexa': 'Lexa.png', 'selena': 'Lexa.png', 'lovelace': 'LoveLace.jpg',
    'nyx': 'LoveLace.jpg', 'roxanne': 'Roxanne.jpg'
};

function logout() {
    localStorage.removeItem('sas_session');
    localStorage.removeItem('userSecurityLevel');
    localStorage.removeItem('sas_token');
    document.body.classList.remove('logged-in');
    window.location.href = '/index.html';
}
window.logout = logout;

async function handleLogin() {
    const user = document.getElementById('login-username').value.trim();
    const pass = document.getElementById('login-password').value.trim();
    const msg = document.getElementById('login-msg');

    if (!user || !pass) {
        msg.textContent = "ERREUR: CHAMPS VIDES";
        msg.className = "term-line term-error";
        return;
    }

    try {
        const response = await fetch('/api/auth?action=login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: user, password: pass })
        });
        const data = await response.json();

        if (response.ok) {
            msg.textContent = "ACCÈS ACCORDÉ.";
            msg.className = "term-line term-info";
            localStorage.setItem('sas_token', data.token);
            localStorage.setItem('sas_session', JSON.stringify(data.agent));
            localStorage.setItem('userSecurityLevel', data.agent.rank);
            setTimeout(() => window.location.reload(), 500);
        } else {
            msg.textContent = "ÉCHEC D'IDENTIFICATION";
            msg.className = "term-line term-error";
        }
    } catch (err) {
        msg.textContent = "ERREUR SERVEUR";
        msg.className = "term-line term-error";
    }
}
window.handleLogin = handleLogin;

function unlockInterface(agent) {
    document.body.classList.add('logged-in');
    const miniU = document.getElementById('mini-username');
    const miniR = document.getElementById('mini-rank');
    if(miniU) miniU.textContent = agent.username.toUpperCase();
    if(miniR) miniR.textContent = `LVL-${agent.rank}`;

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

document.addEventListener('keydown', (e) => {
    if (e.key === 'F9') toggleTerminal();
    if (e.key === 'Enter' && terminal.classList.contains('open')) handleLogin();
});

document.addEventListener('DOMContentLoaded', restoreSession);