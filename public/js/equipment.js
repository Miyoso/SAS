/* public/js/equipment.js */

document.addEventListener('DOMContentLoaded', () => {
    fetchLogisticsData();

    // Configurer la recherche
    document.getElementById('search-input').addEventListener('input', (e) => {
        filterInventory(e.target.value.toLowerCase());
    });

    // Configurer le formulaire d'ajout (Modal)
    const addForm = document.getElementById('add-equipment-form');
    if(addForm) {
        addForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await addNewItem();
        });
    }
});

// Récupération de session
const session = JSON.parse(localStorage.getItem('sas_session')) || { username: 'UNKNOWN_AGENT' };
let allInventory = []; // Stockage local pour le filtrage

async function fetchLogisticsData() {
    try {
        const response = await fetch('/api/equipment');
        const data = await response.json();

        allInventory = data.inventory; // Sauvegarde pour la recherche
        renderInventory(allInventory);
        renderLogs(data.logs);
    } catch (err) {
        console.error("Erreur connexion logistique:", err);
    }
}

function renderInventory(items) {
    const container = document.getElementById('equipment-list');
    container.innerHTML = '';

    items.forEach(item => {
        const row = document.createElement('div');
        row.className = 'inv-row';

        // Logique des status et boutons
        let statusBadge = `<span class="badge badge-green">DISPONIBLE</span>`;
        let actionButton = `<button onclick="handleItemAction(${item.id}, 'TAKE')" class="btn-action btn-take">[ RÉQUISITIONNER ]</button>`;
        let rowClass = '';

        if (item.assigned_to) {
            if (item.assigned_to === session.username) {
                // C'est MOI qui l'ai
                statusBadge = `<span class="badge badge-blue">EN VOTRE POSSESSION</span>`;
                actionButton = `<button onclick="handleItemAction(${item.id}, 'RETURN')" class="btn-action btn-return">[ RESTITUER ]</button>`;
                rowClass = 'row-active';
            } else {
                // C'est quelqu'un d'autre
                statusBadge = `<span class="badge badge-red">ASSIGNÉ: ${item.assigned_to.toUpperCase()}</span>`;
                actionButton = `<span class="locked-text">NON DISPO</span>`;
                rowClass = 'row-locked';
            }
        }

        row.innerHTML = `
            <div style="flex:2; font-weight:bold; color:#fff">${item.name}</div>
            <div style="flex:1; font-family:'Share Tech Mono'; color:#888">${item.serial_number}</div>
            <div style="flex:1">${statusBadge}</div>
            <div style="flex:1; text-align:right">${actionButton}</div>
        `;

        if(rowClass) row.classList.add(rowClass);
        container.appendChild(row);
    });
}

function renderLogs(logs) {
    const container = document.getElementById('logs-list');
    container.innerHTML = '';

    logs.forEach(log => {
        const div = document.createElement('div');
        div.className = 'log-entry';

        const date = new Date(log.timestamp);
        const timeStr = date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});

        let icon = '•';
        let colorClass = '';
        let text = '';

        if (log.action_type === 'CHECKOUT') {
            icon = '►'; colorClass = 'log-out';
            text = `<span class="log-agent">${log.agent_name}</span> a pris <span class="log-item">${log.item_name}</span>`;
        } else if (log.action_type === 'RETURN') {
            icon = '◄'; colorClass = 'log-in';
            text = `<span class="log-agent">${log.agent_name}</span> a rendu <span class="log-item">${log.item_name}</span>`;
        } else if (log.action_type === 'NEW_STOCK') {
            icon = '+'; colorClass = 'log-new';
            text = `Nouveau stock: <span class="log-item">${log.item_name}</span> ajouté par ${log.agent_name}`;
        }

        div.innerHTML = `
            <span class="log-time">[${timeStr}]</span>
            <span class="log-icon ${colorClass}">${icon}</span>
            <span class="log-text">${text}</span>
        `;
        container.appendChild(div);
    });
}

async function handleItemAction(id, action) {
    // Son UI si disponible
    if(window.SAS_IMMERSION) window.SAS_IMMERSION.playSFX('click');

    try {
        const res = await fetch('/api/equipment', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, action, agent: session.username })
        });

        if(res.ok) {
            fetchLogisticsData(); // Rafraichir l'interface
        }
    } catch (e) {
        alert("Erreur de communication avec le serveur logistique.");
    }
}

function filterInventory(query) {
    if(!query) return renderInventory(allInventory);

    const filtered = allInventory.filter(item =>
        item.name.toLowerCase().includes(query) ||
        item.serial_number.toLowerCase().includes(query) ||
        (item.assigned_to && item.assigned_to.toLowerCase().includes(query))
    );
    renderInventory(filtered);
}

// Fonction existante pour ajouter un item (gardée pour compatibilité)
async function addNewItem() {
    const name = document.getElementById('item_name').value;
    const cat = document.getElementById('category').value;
    const sn = document.getElementById('serial_number').value;
    const loc = document.getElementById('storage_location').value;

    await fetch('/api/equipment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, category, serial_number: sn, storage_location: loc, added_by: session.username })
    });

    closeModal(); // Fonction définie dans logistics.html (inline) ou script.js
    fetchLogisticsData();
}