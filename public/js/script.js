const terminal = document.getElementById('terminal-console');
const input = document.getElementById('cmd-input');
const historyDiv = document.getElementById('terminal-history');

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

async function processCommand(cmd) {
    const parts = cmd.trim().split(" ");
    const command = parts[0].toLowerCase();
    const args = parts.slice(1);

    if (command === '/register') {
        if (args.length < 2) {
            addToHistory("USAGE: /register [username] [password]", 'error');
            return;
        }
        
        const username = args[0];
        const password = args[1];

        addToHistory("INITIATING UPLINK TO NEON DB...", 'info');

        try {
            const response = await fetch('/api/signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (response.ok) {
                addToHistory(`SUCCESS: Agent ${data.agent.username} registered.`, 'info');
                addToHistory(`RANK: ${data.agent.rank}`, 'info');
            } else {
                addToHistory(`ERROR: ${data.error}`, 'error');
            }
        } catch (err) {
            addToHistory("FATAL ERROR: Connection failed.", 'error');
        }
        
        scrollToBottom();
        return; 
    }

    if (command === '/help') {
        addToHistory("AVAILABLE COMMANDS:", 'info');
        addToHistory("  /register [user] [pass] - Create ID", 'system');
        addToHistory("  /help    - Show this list", 'system');
        addToHistory("  /clear   - Clear terminal history", 'system');
        addToHistory("  /status  - Check system status", 'system');
    } 
    else if (command === '/clear') {
        historyDiv.innerHTML = "";
        addToHistory("Console cleared.", 'info');
    }
    else if (command === '/status') {
        addToHistory("SYSTEM CHECK...", 'info');
        addToHistory("CPU: 34% | RAM: 12GB/32GB | NET: ONLINE", 'system');
    }
    else {
        addToHistory(`bash: ${cmd}: command not found`, 'error');
    }
    scrollToBottom();
}