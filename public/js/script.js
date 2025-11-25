// --- GESTION DU TERMINAL (F9) ---
const terminal = document.getElementById('terminal-console');
const input = document.getElementById('cmd-input');
const historyDiv = document.getElementById('terminal-history');

// Toggle Open/Close avec F9
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

    setTimeout(() => { 
        if (lowerCmd === '/help') {
            addToHistory("AVAILABLE COMMANDS:", 'info');
            addToHistory("  /help    - Show this list", 'system');
            addToHistory("  /clear   - Clear terminal history", 'system');
            addToHistory("  /status  - Check system status", 'system');
        } 
        else if (lowerCmd === '/clear') {
            historyDiv.innerHTML = "";
            addToHistory("Console cleared.", 'info');
        }
        else if (lowerCmd === '/status') {
            addToHistory("SYSTEM CHECK...", 'info');
            addToHistory("CPU: 34% | RAM: 12GB/32GB | NET: ONLINE", 'system');
        }
        else {
            addToHistory(`bash: ${cmd}: command not found`, 'error');
        }
        scrollToBottom();
    }, 200);
}