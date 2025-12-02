const terminal = document.getElementById('terminal-console');
const input = document.getElementById('cmd-input');
const historyDiv = document.getElementById('terminal-history');
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
document.addEventListener('keydown', function(event) {
    if (event.key === 'F9' && terminal && input) {
        event.preventDefault();
        terminal.classList.toggle('open');
        if (terminal.classList.contains('open')) {
            setTimeout(() => input.focus(), 100);
            scrollToBottom();
        } else {
            input.blur();
        }
    }
});
if (input) {
    input.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            const command = input.value.trim();
            if (command !== "") {
                addToHistory(command, 'user');
                processCommand(command);
                input.value = "";
                scrollToBottom();
            }
        }
    });
}
function addToHistory(text, type) {
    if (!historyDiv) return;
    const line = document.createElement('div');
    line.classList.add('term-line');
    if(type === 'user') line.classList.add('term-user');
    if(type === 'error') line.classList.add('term-error');
    if(type === 'info') line.classList.add('term-info');
    line.textContent = text;
    historyDiv.appendChild(line);
}
function scrollToBottom() {
    if (historyDiv) {
        historyDiv.scrollTop = historyDiv.scrollHeight;
    }
}
function unlockInterface(agent) {
    const miniUsername = document.getElementById('mini-username');
    const miniRank = document.getElementById('mini-rank');
    if(miniUsername) miniUsername.textContent = agent.username.toUpperCase();
    if(miniRank) miniRank.textContent = `LVL-${agent.rank}`;
    const sideUsername = document.getElementById('sidebar-username');
    if(sideUsername) sideUsername.textContent = agent.username.toUpperCase();
    const sideRank = document.getElementById('sidebar-rank');
    if(sideRank) {
        sideRank.textContent = `LVL-${agent.rank}`;
        if(agent.rank >= 10) sideRank.style.color = "var(--accent-danger)";
        else if(agent.rank >= 5) sideRank.style.color = "var(--accent-warning)";
        else sideRank.style.color = "var(--accent-warning)";
        sideRank.style.borderColor = sideRank.style.color;
    }
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
    if(promptSpan) promptSpan.textContent = `${agent.username}@sas-mainframe:~#`;
}
function logout() {
    currentUser = null;
    localStorage.removeItem('sas_session');
    localStorage.removeItem('userSecurityLevel');
    localStorage.removeItem('sas_token');
    switchView('dashboard');
    if(connStatus) {
        connStatus.textContent = "DISCONNECTED";
        connStatus.style.color = "var(--accent-danger)";
    }
    if(promptSpan) promptSpan.textContent = "guest@sas-node:~#";
    addToHistory("System logout completed.", 'info');
    window.location.reload();
}
window.logout = logout;
async function processCommand(cmd) {
    const parts = cmd.trim().split(" ");
    const command = parts[0].toLowerCase();
    const args = parts.slice(1);
    if (command === '/login') {
        if (args.length < 2) {
            addToHistory("USAGE: /login [username] [password]", 'error');
            return;
        }
        const username = args[0];
        const password = args[1];
        addToHistory("VERIFYING CREDENTIALS...", 'info');
        try {
            const response = await fetch('/api/auth?action=login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await response.json();
            if (response.ok) {
                currentUser = data.agent;
                localStorage.setItem('sas_token', data.token);
                localStorage.setItem('sas_session', JSON.stringify(currentUser));
                addToHistory(`ACCESS GRANTED. WELCOME ${currentUser.username}.`, 'info');
                unlockInterface(currentUser);
            } else {
                addToHistory(`ERROR: ${data.error}`, 'error');
            }
        } catch (err) {
            addToHistory("FATAL ERROR: Connection failed.", 'error');
        }
        return;
    }
    if (command === '/register') {
        if (args.length < 2) {
            addToHistory("USAGE: /register [username] [password]", 'error');
            return;
        }
        const username = args[0];
        const password = args[1];
        addToHistory("CREATING NEW IDENTITY...", 'info');
        try {
            const response = await fetch('/api/auth?action=signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await response.json();
            if (response.ok) {
                addToHistory(`SUCCESS: Identity created for ${data.agent.username}. You can now /login.`, 'info');
            } else {
                addToHistory(`ERROR: ${data.error}`, 'error');
            }
        } catch (err) {
            addToHistory("FATAL ERROR: Connection failed.", 'error');
        }
        return;
    }
    if (command === '/help') {
        addToHistory("AVAILABLE COMMANDS:", 'info');
        addToHistory("  /login [user] [pass]", 'system');
        addToHistory("  /register [user] [pass]", 'system');
        addToHistory("  /clear", 'system');
        addToHistory("  /logout", 'system');
    }
    else if (command === '/clear') {
        if(historyDiv) historyDiv.innerHTML = "";
        addToHistory("Console cleared.", 'info');
    }
    else if (command === '/logout') {
        logout();
    }
    else {
        addToHistory(`bash: ${cmd}: command not found`, 'error');
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
                addToHistory(`SESSION VERIFIED. RANK UPDATED: ${currentUser.rank}`, 'info');
            } else {
                logout();
            }
        } catch (e) {
            console.error("Erreur de vérification session", e);
        }
    }
}
document.addEventListener('DOMContentLoaded', () => {
    loadComponents();
});