document.addEventListener('DOMContentLoaded', () => {
    loadEquipment();
    setupForm();
    setupSearch();
});

async function loadEquipment(search = '') {
    const token = localStorage.getItem('sas_token');
    const container = document.getElementById('equipment-list');
    
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
        container.innerHTML = '<div style="padding:20px; font-style:italic; opacity:0.6;">AUCUN RÉSULTAT TROUVÉ.</div>';
        return;
    }

    container.innerHTML = items.map(item => {
        const isAssigned = item.status === 'ISSUED';
        const statusColor = isAssigned ? 'var(--warning)' : 'var(--primary)';
        const statusText = isAssigned ? `ASSIGNÉ: ${item.assigned_to}` : `STOCK: ${item.storage_location}`;
        
        let icon = '📦'; 
        if(item.category === 'ARME') icon = '🔫';
        if(item.category === 'RADIO') icon = '📻';
        if(item.category === 'TENUE') icon = '👕';
        if(item.category === 'VÉHICULE') icon = '🚔';

        return `
            <div class="equip-item">
                <div class="equip-icon">${icon}</div>
                <div class="equip-info">
                    <div class="equip-name">${item.item_name}</div>
                    <div class="equip-sn">S/N: ${item.serial_number}</div>
                    <div class="equip-status" style="color:${statusColor}">${statusText}</div>
                </div>
                <div class="equip-actions">
                    ${!isAssigned ? `
                        <input type="text" placeholder="Agent..." class="assign-input" id="assign-${item.id}">
                        <button onclick="assignItem(${item.id})" class="btn-icon">➜</button>
                    ` : `
                        <button onclick="returnItem(${item.id})" class="btn-icon" title="Retour Stock">↩</button>
                    `}
                    <button onclick="deleteItem(${item.id})" class="btn-icon btn-del">×</button>
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
            loadEquipment();
        } else {
            alert('Erreur lors de l\'ajout (S/N existe peut-être déjà).');
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
    const target = document.getElementById(`assign-${id}`).value;
    if (!target) return;

    await updateItem(id, 'ASSIGN', target);
}

async function returnItem(id) {
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
    if(!confirm('Confirmer la suppression définitive ?')) return;
    
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