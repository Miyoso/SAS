let agentsList = [];

document.addEventListener('DOMContentLoaded', async () => {
    await loadAgents(); // Charge les agents en premier
    loadEquipment();
    setupForm();
    setupSearch();
});

// Récupère la liste des agents depuis l'API pour le menu déroulant
async function loadAgents() {
    const token = localStorage.getItem('sas_token');
    try {
        const res = await fetch('/api/users', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            agentsList = await res.json();
        }
    } catch (e) {
        console.error("Erreur chargement agents", e);
    }
}

async function loadEquipment(search = '') {
    const token = localStorage.getItem('sas_token');
    const container = document.getElementById('equipment-list');
    
    // Feedback visuel de chargement
    container.innerHTML = '<div class="blink" style="padding:20px; color:#555;">SCANNING DATABASE...</div>';

    try {
        const res = await fetch(`/api/equipment?search=${encodeURIComponent(search)}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (res.ok) {
            const items = await res.json();
            renderList(items, container);
        }
    } catch (e) {
        console.error(e);
        container.innerHTML = '<div style="color:var(--danger)">ERREUR DE CONNEXION</div>';
    }
}

function renderList(items, container) {
    if (items.length === 0) {
        container.innerHTML = '<div style="padding:20px; font-style:italic; opacity:0.6;">AUCUN MATÉRIEL TROUVÉ.</div>';
        return;
    }

    container.innerHTML = items.map(item => {
        const isAssigned = item.status === 'ISSUED';
        const statusColor = isAssigned ? 'var(--warning)' : 'var(--primary)';
        const statusText = isAssigned ? `EN SERVICE : ${item.assigned_to}` : `EN STOCK : ${item.storage_location}`;
        
        let icon = '📦'; 
        if(item.category === 'ARME') icon = '🔫';
        if(item.category === 'RADIO') icon = '📻';
        if(item.category === 'TENUE') icon = '👕';
        if(item.category === 'VÉHICULE') icon = '🚔';

        // Génération du menu déroulant pour les agents
        const agentSelectOptions = agentsList.map(agent => 
            `<option value="${agent}">${agent}</option>`
        ).join('');

        return `
            <div class="equip-item" style="border-left-color: ${statusColor}">
                <div class="equip-icon">${icon}</div>
                <div class="equip-info">
                    <div class="equip-name">${item.item_name}</div>
                    <div class="equip-sn">S/N: ${item.serial_number}</div>
                    <div class="equip-status" style="color:${statusColor}">${statusText}</div>
                </div>
                <div class="equip-actions">
                    ${!isAssigned ? `
                        <select class="assign-select" id="assign-${item.id}">
                            <option value="" disabled selected>AFFECTER À...</option>
                            ${agentSelectOptions}
                        </select>
                        <button onclick="assignItem(${item.id})" class="btn-icon" title="Confirmer l'attribution">➜</button>
                    ` : `
                        <button onclick="returnItem(${item.id})" class="btn-icon" title="Retour au stock">↩</button>
                    `}
                    <button onclick="deleteItem(${item.id})" class="btn-icon btn-del" title="Supprimer">×</button>
                </div>
            </div>
        `;
    }).join('');
}

function setupForm() {
    document.getElementById('add-equipment-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const token = localStorage.getItem('sas_token');
        
        const data = {
            item_name: document.getElementById('item_name').value,
            serial_number: document.getElementById('serial_number').value,
            category: document.getElementById('category').value,
            storage_location: document.getElementById('storage_location').value
        };

        const res = await fetch('/api/equipment', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` 
            },
            body: JSON.stringify(data)
        });

        if (res.ok) {
            e.target.reset();
            loadEquipment(); // Recharger la liste
        } else {
            alert('Erreur: Vérifiez si le S/N est unique.');
        }
    });
}

function setupSearch() {
    const input = document.getElementById('search-input');
    let timeout;
    input.addEventListener('input', () => {
        clearTimeout(timeout);
        timeout = setTimeout(() => loadEquipment(input.value), 300);
    });
}

async function assignItem(id) {
    const selectElement = document.getElementById(`assign-${id}`);
    const target = selectElement.value;
    
    if (!target) {
        alert("Veuillez sélectionner un agent.");
        return;
    }

    await updateItem(id, 'ASSIGN', target);
}

async function returnItem(id) {
    if(!confirm('Confirmer le retour en stock ?')) return;
    await updateItem(id, 'STORE', 'ARMURERIE CENTRALE');
}

async function updateItem(id, action, target) {
    const token = localStorage.getItem('sas_token');
    await fetch('/api/equipment', {
        method: 'PUT',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ id, action, target })
    });
    // On recharche avec le terme de recherche actuel pour ne pas perdre le filtre
    loadEquipment(document.getElementById('search-input').value);
}

async function deleteItem(id) {
    if(!confirm('ATTENTION: Suppression définitive de la base de données. Continuer ?')) return;
    
    const token = localStorage.getItem('sas_token');
    await fetch('/api/equipment', {
        method: 'DELETE',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ id })
    });
    loadEquipment(document.getElementById('search-input').value);
}

// Exposition globale pour les onclick dans le HTML généré
window.assignItem = assignItem;
window.returnItem = returnItem;
window.deleteItem = deleteItem;