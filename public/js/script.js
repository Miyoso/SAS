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

function switchView(viewName) {
    if (viewName === 'profile') {
        dashboardView.classList.add('hidden');
        profileView.classList.remove('hidden');
    } else {
        profileView.classList.add('hidden');
        dashboardView.classList.remove('hidden');
    }
}
window.switchView = switchView;

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

function unlockInterface(agent) {
   
    const sidebarGuest = document.getElementById('sidebar-guest');
    const sidebarLogged = document.getElementById('sidebar-logged');
    const miniUsername = document.getElementById('mini-username');
    const miniRank = document.getElementById('mini-rank');

   
    if (sidebarGuest && sidebarLogged) {
        sidebarGuest.classList.add('hidden');
        sidebarLogged.classList.remove('hidden');
        if(miniUsername) miniUsername.textContent = agent.username.toUpperCase();
        if(miniRank) miniRank.textContent = agent.rank;
    }

    // Mise à jour du Dashboard
    if(pUsername) pUsername.textContent = agent.username.toUpperCase();
    if(pRank) pRank.textContent = agent.rank;
    
    localStorage.setItem('userSecurityLevel', agent.rank);
    
    if(connStatus) {
        connStatus.textContent = "CONNECTED";
        connStatus.style.color = "var(--primary)";
    }
    if(promptSpan) promptSpan.textContent = `${agent.username}@sas-mainframe:~#`;
}

function logout() {
    currentUser = null;
    localStorage.removeItem('sas_session');
    localStorage.removeItem('userSecurityLevel');
    
    switchView('dashboard');

   
    const sidebarGuest = document.getElementById('sidebar-guest');
    const sidebarLogged = document.getElementById('sidebar-logged');

    if (sidebarGuest && sidebarLogged) {
        sidebarLogged.classList.add('hidden');
        sidebarGuest.classList.remove('hidden');
    }

    if(connStatus) {
        connStatus.textContent = "DISCONNECTED";
        connStatus.style.color = "var(--danger)";
    }
    if(promptSpan) promptSpan.textContent = "guest@sas-node:~#";
    addToHistory("System logout completed.", 'info');
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
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (response.ok) {
                currentUser = data.agent;
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
        addToHistory("  /login [user] [pass]", 'system');
        addToHistory("  /register [user] [pass]", 'system');
        addToHistory("  /clear", 'system');
        addToHistory("  /logout", 'system');
    } 
    else if (command === '/clear') {
        historyDiv.innerHTML = "";
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
    const placeholder = document.getElementById('sidebar-placeholder');
    
    if (placeholder) {
        try {
            const response = await fetch('/components/sidebar.html');
            if (response.ok) {
                const html = await response.text();
                placeholder.innerHTML = html;
                
               
                restoreSession(); 
            }
        } catch (error) {
            console.error("Erreur chargement sidebar:", error);
        }
    } else {
        
        restoreSession();
    }
}

function restoreSession() {
    const savedSession = localStorage.getItem('sas_session');
    if (savedSession) {
        try {
            const user = JSON.parse(savedSession);
            currentUser = user;
            unlockInterface(user);
            addToHistory(`SESSION RESTORED FOR AGENT ${user.username}.`, 'info');
        } catch (e) {
            localStorage.removeItem('sas_session');
        }
    }
}


document.addEventListener('DOMContentLoaded', () => {
    loadComponents();
});