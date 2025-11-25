// --- 1. GESTION DES VUES ---
function switchView(viewName) {
    const dashboard = document.getElementById('dashboard-view');
    const profile = document.getElementById('profile-view');
    if (viewName === 'profile') {
        dashboard.classList.add('hidden'); profile.classList.remove('hidden');
    } else {
        profile.classList.add('hidden'); dashboard.classList.remove('hidden');
    }
}

// --- 2. GESTION DU TERMINAL (F9) ---
const terminal = document.getElementById('terminal-console');
const input = document.getElementById('cmd-input');
const historyDiv = document.getElementById('terminal-history');

// Toggle Open/Close
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

// Gestion Entrée & Commandes
input.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
        const command = input.value.trim();
        if (command !== "") {
            // 1. Ajouter la ligne de l'utilisateur
            addToHistory(command, 'user');
            
            // 2. Traiter la commande (Simulation)
            processCommand(command);
            
            // 3. Vider l'input
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

// Simulation de commandes basiques
function processCommand(cmd) {
    const lowerCmd = cmd.toLowerCase();

    setTimeout(() => { // Petit délai pour faire réaliste
        if (lowerCmd === '/help') {
            addToHistory("AVAILABLE COMMANDS:", 'info');
            addToHistory("  /help    - Show this list", 'system');
            addToHistory("  /clear   - Clear terminal history", 'system');
            addToHistory("  /status  - Check system status", 'system');
            addToHistory("  /login   - Force reconnect", 'system');
        } 
        else if (lowerCmd === '/clear') {
            historyDiv.innerHTML = "";
            addToHistory("Console cleared.", 'info');
        }
        else if (lowerCmd === '/status') {
            addToHistory("SYSTEM CHECK...", 'info');
            addToHistory("CPU: 34% | RAM: 12GB/32GB | NET: ONLINE", 'system');
        }
        else if (lowerCmd === '/login') {
            addToHistory("Authenticating...", 'info');
            addToHistory("Access Granted. Welcome back, Commander.", 'system');
        }
        else {
            addToHistory(`bash: ${cmd}: command not found`, 'error');
        }
        scrollToBottom();
    }, 200);
}

// --- 3. EFFET 3D CARTE ---
const card = document.querySelector('.id-card');
const container = document.querySelector('.id-card-container');
if(container && card) {
    document.addEventListener('mousemove', (e) => {
        if(document.getElementById('profile-view').classList.contains('hidden')) return;
        const rect = container.getBoundingClientRect();
        const xAxis = (rect.width / 2 - (e.clientX - rect.left)) / 20;
        const yAxis = (rect.height / 2 - (e.clientY - rect.top)) / 20;
        card.style.transform = `rotateY(${xAxis}deg) rotateX(${yAxis}deg)`;
    });
    container.addEventListener('mouseleave', (e) => {
        card.style.transform = `rotateY(0deg) rotateX(0deg)`;
    });
}