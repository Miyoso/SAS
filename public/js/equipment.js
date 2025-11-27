document.addEventListener('DOMContentLoaded', () => {
    // Initialisation
    loadUsersIfAuthorized(); // Charger les utilisateurs si gradé
    fetchLogisticsData();

    document.getElementById('search-input').addEventListener('input', (e) => {
        filterInventory(e.target.value.toLowerCase());
    });

    const addForm = document.getElementById('add-equipment-form');
    if(addForm) {
        // Si l'utilisateur n'est pas gradé, on peut cacher le formulaire ou empêcher l'envoi
        if (parseInt(session.rank) < 3) {
            document.querySelector('.btn-main-action').style.display = 'none';
        }

        addForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await addNewItem();
        });
    }
});

const session = JSON.parse(localStorage.getItem('sas_session')) || { username: 'UNKNOWN_AGENT', rank: 0 };
const token = localStorage.getItem('sas_token');
let allInventory = [];
let availableAgents = []; // Liste des agents pour le dropdown

async function loadUsersIfAuthorized() {
    if (parseInt(session.rank) >= 3) {
        try {
            const res = await fetch('/api/users', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                availableAgents = await res.json();
            }
        } catch (e) {
            console.error("Erreur chargement agents", e);
        }
    }
}

async function fetchLogisticsData() {
    try {
        // On s'assure que le token est bien envoyé
        const response = await fetch('/api/equipment', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            // On lit le message d'erreur envoyé par le serveur
            const errorText = await response.text();
            console.error("Détails de l'erreur serveur :", response.status, errorText);
            // Une alerte pour que vous le voyiez tout de suite
            alert(`Erreur Serveur (${response.status}) : ${errorText}`);
            return;
        }

        const data = await response.json();
        allInventory = data.inventory;
        renderInventory(allInventory);
        renderLogs(data.logs);
    } catch (err) {
        console.error("Erreur connexion logistique:", err);
    }
}

function renderInventory(items) {
    const container = document.getElementById('equipment-list');
    container.innerHTML = '';

    const userRank = parseInt(session.rank);

    items.forEach(item => {
        const row = document.createElement('div');
        row.className = 'inv-row';

        let statusBadge = `<span class="badge badge-green">DISPONIBLE</span>`;
        let actionButton = '';
        let rowClass = '';

        if (item.assigned_to) {
            // OBJET DÉJÀ ASSIGNÉ
            if (item.assigned_to === session.username) {
                statusBadge = `<span class="badge badge-blue">EN VOTRE POSSESSION</span>`;
                actionButton = `<button onclick="handleItemAction(${item.id}, 'RETURN')" class="btn-action btn-return">[ RESTITUER ]</button>`;
                rowClass = 'row-active';
            } else {
                statusBadge = `<span class="badge badge-red">ASSIGNÉ: ${item.assigned_to.toUpperCase()}</span>`;
                // Seul un gradé peut forcer le retour d'un objet assigné à un autre (optionnel, ici on verrouille)
                actionButton = `<span class="locked-text">INDISPONIBLE</span>`;
                rowClass = 'row-locked';
            }
        } else {
            // OBJET DISPONIBLE (Logique Rang 3+)
            if (userRank >= 3) {
                // Création du dropdown pour les gradés
                let options = availableAgents.map(agent => `<option value="${agent}">${agent}</option>`).join('');
                // On met l'utilisateur courant par défaut
                options = `<option value="${session.username}">-- MOI --</option>` + options;

                const selectId = `assign-select-${item.id}`;

                actionButton = `
                    <div style="display:flex; gap:5px; justify-content:flex-end;">
                        <select id="${selectId}" class="assign-select" style="width:120px;">${options}</select>
                        <button onclick="assignToSelected(${item.id})" class="btn-action btn-take">[ ASSIGNER ]</button>
                    </div>
                `;
            } else {
                // Soldat simple : Verrouillé
                actionButton = `<span class="locked-text" style="color:#555">VERROUILLÉ (NIV 3+)</span>`;
            }
        }

        row.innerHTML = `
            <div style="flex:2; font-weight:bold; color:#fff">${item.item_name}</div>
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
            text = `<span class="log-agent">${log.agent_name}</span> a assigné <span class="log-item">${log.item_name}</span>`;
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

// Fonction pour les gradés : Assigner à la personne sélectionnée
async function assignToSelected(id) {
    const select = document.getElementById(`assign-select-${id}`);
    const targetAgent = select.value;

    await handleItemAction(id, 'TAKE', targetAgent);
}

async function handleItemAction(id, action, agentName = null) {
    if(window.SAS_IMMERSION) window.SAS_IMMERSION.playSFX('click');

    // Si pas d'agent spécifié (cas du retour), on utilise le nom de session
    const targetAgent = agentName || session.username;

    try {
        const res = await fetch('/api/equipment', {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ id, action, agent: targetAgent })
        });

        if(res.ok) {
            fetchLogisticsData();
        } else {
            const err = await res.json();
            alert("ERREUR: " + err.error);
        }
    } catch (e) {
        alert("Erreur de communication avec le serveur logistique.");
    }
}

function filterInventory(query) {
    if(!query) return renderInventory(allInventory);

    const filtered = allInventory.filter(item =>
        item.item_name.toLowerCase().includes(query) ||
        item.serial_number.toLowerCase().includes(query) ||
        (item.assigned_to && item.assigned_to.toLowerCase().includes(query))
    );
    renderInventory(filtered);
}

async function addNewItem() {
    const name = document.getElementById('item_name').value;
    const category = document.getElementById('category').value;
    const sn = document.getElementById('serial_number').value;
    const loc = document.getElementById('storage_location').value;

    const res = await fetch('/api/equipment', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name, category, serial_number: sn, storage_location: loc, added_by: session.username })
    });

    if (res.ok) {
        closeModal();
        fetchLogisticsData();
    } else {
        alert("Erreur ajout (Droits insuffisants ?)");
    }
}