function getAuthHeaders() {
    return { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('sas_token')}`
    };
}

document.addEventListener('DOMContentLoaded', loadData);

async function loadData() {
    const search = document.getElementById('search-input').value;
    const res = await fetch(`/api/equipment?search=${encodeURIComponent(search)}`, {
        headers: getAuthHeaders()
    });
    
    if (res.ok) {
        const data = await res.json();
        renderTable(data);
    }
}

function renderTable(items) {
    const tbody = document.getElementById('table-body');
    tbody.innerHTML = '';

    items.forEach(item => {
        const tr = document.createElement('tr');
        
        let locHtml = '';
        let statusBadge = '';
        let actionsHtml = '';

        if (item.status === 'STOCK') {
            locHtml = `<span style="color:#888;">📦 ${item.storage_location}</span>`;
            statusBadge = `<span class="badge badge-stock">EN STOCK</span>`;
            // Action : Sortir (Assigner)
            actionsHtml = `<button class="action-btn" onclick="openAssign(${item.id}, '${item.item_name}')">SORTIR →</button>`;
        } else {
            locHtml = `<span style="color:#fb0;">👤 ${item.assigned_to}</span>`;
            statusBadge = `<span class="badge badge-issued">EN SERVICE</span>`;
            // Action : Rendre (Return)
            actionsHtml = `<button class="action-btn" onclick="openReturn(${item.id})">← RENDRE</button>`;
        }

        tr.innerHTML = `
            <td style="font-weight:bold; color:#fff;">${item.serial_number}</td>
            <td>${item.item_name} <span style="font-size:0.7em; color:#666;">[${item.category}]</span></td>
            <td>${locHtml}</td>
            <td>${statusBadge}</td>
            <td>${actionsHtml}</td>
        `;
        tbody.appendChild(tr);
    });
}

/* --- GESTION DES MODALES --- */

function closeModals() {
    document.querySelectorAll('.modal-overlay').forEach(el => el.classList.add('hidden'));
}

// 1. CRÉATION
window.openModal = function(type) {
    if(type === 'create') document.getElementById('modal-create').classList.remove('hidden');
}

async function createItem() {
    const payload = {
        serial_number: document.getElementById('new-sn').value,
        item_name: document.getElementById('new-name').value,
        category: document.getElementById('new-cat').value,
        storage_location: document.getElementById('new-loc').value
    };

    const res = await fetch('/api/equipment', {
        method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(payload)
    });

    if(res.ok) { closeModals(); loadData(); }
    else alert("Erreur (Numéro de série en double ?)");
}

// 2. ASSIGNATION (SORTIE)
window.openAssign = function(id, name) {
    document.getElementById('assign-id').value = id;
    document.getElementById('assign-item-name').innerText = name;
    document.getElementById('modal-assign').classList.remove('hidden');
}

async function confirmAssign() {
    const id = document.getElementById('assign-id').value;
    const agent = document.getElementById('assign-agent').value;
    
    await fetch('/api/equipment', {
        method: 'PUT', headers: getAuthHeaders(),
        body: JSON.stringify({ id, action: 'ASSIGN', target: agent })
    });
    closeModals(); loadData();
}

// 3. RETOUR (STOCK)
window.openReturn = function(id) {
    document.getElementById('return-id').value = id;
    document.getElementById('modal-return').classList.remove('hidden');
}

async function confirmReturn() {
    const id = document.getElementById('return-id').value;
    const loc = document.getElementById('return-loc').value;

    await fetch('/api/equipment', {
        method: 'PUT', headers: getAuthHeaders(),
        body: JSON.stringify({ id, action: 'STORE', target: loc })
    });
    closeModals(); loadData();
}