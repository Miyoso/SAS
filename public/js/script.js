const terminal = document.getElementById('terminal-console');
const input = document.getElementById('cmd-input');
const historyDiv = document.getElementById('terminal-history');

// Éléments du profil
const dashboardView = document.getElementById('dashboard-view');
const profileView = document.getElementById('profile-view');
const pUsername = document.getElementById('p-username');
const pRank = document.getElementById('p-rank');
const connStatus = document.getElementById('conn-status');
const promptSpan = document.querySelector('.prompt');

let currentUser = null;

document.addEventListener('keydown', function(event) {
    if (event.key === 'F9') {
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

function addToHistory(text, type) {
    const line = document.createElement('div');
    line.classList.add('term-line');
    if(type === 'user') line.classList.add('term-user');
    if(type === 'error') line.classList.add('term-error');
    if(type === 'info') line.classList.add('term-info');
    line.textContent = text;
    historyDiv.appendChild(line);
}

function scrollToBottom() {
    historyDiv.scrollTop = historyDiv.scrollHeight;
}

// Fonction pour passer du dashboard au profil
function showProfile(agent) {
    dashboardView.classList.add('hidden');
    profileView.classList.remove('hidden');
    
    // Mise à jour des données
    pUsername.textContent = agent.username.toUpperCase();
    pRank.textContent = agent.rank;
    
    // Mise à jour de l'interface système
    connStatus.textContent = "CONNECTED";
    connStatus.style.color = "var(--primary)";
    promptSpan.textContent = `${agent.username}@sas-mainframe:~#`;
}

function logout() {
    currentUser = null;
    dashboardView.classList.remove('hidden');
    profileView.classList.add('hidden');
    connStatus.textContent = "DISCONNECTED";
    connStatus.style.color = "var(--danger)";
    promptSpan.textContent = "guest@sas-node:~#";
    addToHistory("System logout completed.", 'info');
}

// Rendre la fonction accessible au bouton HTML
window.logout = logout;

async function processCommand(cmd) {
    const parts = cmd.trim().split(" ");
    const command = parts[0].toLowerCase();
    const args = parts.slice(1);

    // --- COMMANDE: LOGIN ---
    if (command === '/login') {
        if (args.length < 2) {
            addToHistory("USAGE: /login [username] [password]", 'error');
            return;
        }
        
        const username = args[0];
        const password = args[1];

        addToHistory("VERIFYING CREDENTIALS...", 'info');

        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (response.ok) {
                currentUser = data.agent;
                addToHistory(`ACCESS GRANTED. WELCOME AGENT ${currentUser.username}.`, 'info');
                showProfile(currentUser);
            } else {
                addToHistory(`ERROR: ${data.error}`, 'error');
            }
        } catch (err) {
            addToHistory("FATAL ERROR: Connection failed.", 'error');
        }
        return;
    }

    // --- COMMANDE: REGISTER ---
    if (command === '/register') {
        if (args.length < 2) {
            addToHistory("USAGE: /register [username] [password]", 'error');
            return;
        }
        const username = args[0];
        const password = args[1];
        addToHistory("CREATING NEW IDENTITY...", 'info');

        try {
            const response = await fetch('/api/signup', {
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
        addToHistory("  /login [user] [pass]    - Access System", 'system');
        addToHistory("  /register [user] [pass] - Create ID", 'system');
        addToHistory("  /clear                  - Clear terminal", 'system');
    } 
    else if (command === '/clear') {
        historyDiv.innerHTML = "";
        addToHistory("Console cleared.", 'info');
    }
    else {
        addToHistory(`bash: ${cmd}: command not found`, 'error');
    }
}