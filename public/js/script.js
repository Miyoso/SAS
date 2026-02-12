const terminal = document.getElementById('terminal-console');
const dashboardView = document.getElementById('dashboard-view');
const profileView = document.getElementById('profile-view');
const pUsername = document.getElementById('p-username');
const pRank = document.getElementById('p-rank');
const connStatus = document.getElementById('conn-status');
const promptSpan = document.querySelector('.prompt');
let currentUser = null;

const avatarMap = {
    'adam': 'Adam.jpg',
    'blake': 'Blake.png',
    'blitz': 'Blitz.png',
    'dust': 'Dust.png',
    'wei': 'Dust.png',
    'graves': 'Graves.jpg',
    'jackal': 'Jackal.jpg',
    'ji': 'Jackal.jpg',
    'javier': 'Javier.jpg',
    'lexa': 'Lexa.png',
    'selena': 'Lexa.png',
    'lovelace': 'LoveLace.jpg',
    'nyx': 'LoveLace.jpg',
    'roxanne': 'Roxanne.jpg'
};

function switchView(viewName) {
    if (viewName === 'profile') {
        if(dashboardView) dashboardView.classList.add('hidden');
        if(profileView) profileView.classList.remove('hidden');
    } else {
        if(profileView) profileView.classList.add('hidden');
        if(dashboardView) dashboardView.classList.remove('hidden');
    }
}
window.switchView = switchView;

function logout() {
    currentUser = null;
    localStorage.removeItem('sas_session');
    localStorage.removeItem('userSecurityLevel');
    localStorage.removeItem('sas_token');

    if (dashboardView) switchView('dashboard');

    if(connStatus) {
        connStatus.textContent = "DISCONNECTED";
        connStatus.style.color = "var(--accent-danger)";
    }
    if(promptSpan) promptSpan.textContent = "guest@sas-node:~#";

    window.location.href = '/index.html';
}
window.logout = logout;

document.addEventListener('click', function(e) {
    const target = e.target.closest('.log-entry');
    if (target && (target.textContent.includes('DÉCONNEXION') || target.getAttribute('onclick') === 'logout()')) {
        e.preventDefault();
        logout();
    }
});

document.addEventListener('keydown', function(event) {
    if (event.key === 'F9' && terminal) {
        event.preventDefault();
        terminal.classList.toggle('open');
    }
});

async function handleLogin() {
    const userField = document.getElementById('login-username');
    const passField = document.getElementById('login-password');
    const msgDiv = document.getElementById('login-msg');
    
    const username = userField.value.trim();
    const password = passField.value.trim();

    if (!username || !password) {
        msgDiv.textContent = "ERREUR: CHAMPS INCOMPLETS";
        msgDiv.className = "term-line term-error";
        return;
    }

    msgDiv.textContent = "VÉRIFICATION DES ACCRÉDITATIONS...";
    msgDiv.className = "term-line term-info";

    try {
        const response = await fetch('/api/auth?action=login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();

        if (response.ok) {
            msgDiv.textContent = "ACCÈS ACCORDÉ. BIENVENUE AGENT.";
            msgDiv.style.color = "var(--accent-primary)";
            
            currentUser = data.agent;
            localStorage.setItem('sas_token', data.token);
            localStorage.setItem('sas_session', JSON.stringify(currentUser));
            
            setTimeout(() => window.location.reload(), 800);
        } else {
            msgDiv.textContent = `ÉCHEC: ${data.error.toUpperCase()}`;
            msgDiv.className = "term-line term-error";
        }
    } catch (err) {
        msgDiv.textContent = "ERREUR FATALE: SERVEUR INJOIGNABLE";
        msgDiv.className = "term-line term-error";
    }
}

function unlockInterface(agent) {
    const miniUsername = document.getElementById('mini-username');
    const miniRank = document.getElementById('mini-rank');
    if(miniUsername) miniUsername.textContent = agent.username.toUpperCase();
    if(miniRank) miniRank.textContent = `LVL-${agent.rank}`;

    const sideAvatar = document.getElementById('sidebar-avatar');
    if(sideAvatar) {
        const lowerName = agent.username.toLowerCase();
        if (avatarMap[lowerName]) {
            sideAvatar.src = `assets/${avatarMap[lowerName]}`;
        } else {
            sideAvatar.src = 'assets/default.jpg';
        }
    }

    if(pUsername) pUsername.textContent = agent.username.toUpperCase();
    if(pRank) pRank.textContent = agent.rank;

    localStorage.setItem('userSecurityLevel', agent.rank);

    if(connStatus) {
        connStatus.textContent = "CONNECTED";
        connStatus.style.color = "var(--accent-primary)";
    }
}

async function loadComponents() {
    restoreSession();
}

async function restoreSession() {
    const token = localStorage.getItem('sas_token');
    if (token) {
        try {
            const response = await fetch('/api/auth?action=me', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                currentUser = data.agent;
                localStorage.setItem('sas_session', JSON.stringify(currentUser));
                unlockInterface(currentUser);
            } else {
                localStorage.removeItem('sas_token');
                logout();
            }
        } catch (e) {
            console.error("Erreur de vérification session", e);
        }
    }
}

document.addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
        const term = document.getElementById('terminal-console');
        if (term && term.classList.contains('open')) {
            handleLogin();
        }
    }
});

document.addEventListener('DOMContentLoaded', () => {
    loadComponents();
});