let agentsList = [];

document.addEventListener('DOMContentLoaded', async () => {
    await loadAgents();
    loadEquipment();
    setupForm();
    setupSearch();
});

// --- GESTION DU MODAL ---
function openModal() {
    document.getElementById('modal-overlay').style.display = 'flex';
    document.getElementById('item_name').focus();
}

function closeModal() {
    document.getElementById('modal-overlay').style.display = 'none';
    document.getElementById('add-equipment-form').reset();
}

// Fermer le modal si on clique en dehors de la fenêtre
document.getElementById('modal-overlay').addEventListener('click', (e) => {
    if (e.target.id === 'modal-overlay') closeModal();
});
// ------------------------

async function loadAgents() {
    const token = localStorage.getItem('sas_token');
    try {
        const res = await fetch('/api/users', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            agentsList = await res.json();
        }
    } catch (e) { console.error("Erreur chargement agents", e); }
}

async function loadEquipment(search = '') {
    const token = localStorage.getItem('sas_token');
    const container = document.getElementById('equipment-list');
    
    // Pas de reset du HTML ici pour éviter le clignotement brutal si on tape vite
    // On gère ça dans renderList ou on met un petit loader discret si c'est long

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
                        <button onclick="assignItem(${item.id})" class="btn-icon" title="Attribuer">➜</button>
                    ` : `
                        <button onclick="returnItem(${item.id})" class="btn-icon" title="Retour Stock">↩</button>
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
            closeModal(); // Ferme le popup
            loadEquipment(); // Actualise la liste
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
    loadEquipment(document.getElementById('search-input').value);
}

async function deleteItem(id) {
    if(!confirm('Supprimer définitivement cet objet ?')) return;
    
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

window.assignItem = assignItem;
window.returnItem = returnItem;
window.deleteItem = deleteItem;
window.openModal = openModal;
window.closeModal = closeModal;