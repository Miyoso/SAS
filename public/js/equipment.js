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

    let currentCategory = null;

    items.forEach(item => {
        if (item.category !== currentCategory) {
            currentCategory = item.category;
            const catRow = document.createElement('tr');
            catRow.className = 'category-row';
            catRow.innerHTML = `<td colspan="6">/// SECTION : ${currentCategory}</td>`;
            tbody.appendChild(catRow);
        }

        const tr = document.createElement('tr');
        
        let statusHtml = '';
        let locationHtml = '';
        let actionsHtml = '';

        if (item.status === 'STOCK') {
            statusHtml = `<span class="badge badge-stock">EN STOCK</span>`;
            locationHtml = `<span style="color:#667;">[LOC]</span> ${item.storage_location}`;
            actionsHtml = `<button class="btn-action" onclick="openAssign(${item.id}, '${item.item_name}')">SORTIR >></button>`;
        } else {
            statusHtml = `<span class="badge badge-issued">ASSIGNÉ</span>`;
            locationHtml = `<span class="highlight">${item.assigned_to}</span>`;
            actionsHtml = `<button class="btn-action" onclick="openReturn(${item.id})"><< RENDRE</button>`;
        }

        actionsHtml += ` <button class="btn-action" style="border-color:#522; color:#a55;" onclick="deleteItem(${item.id})">X</button>`;

        tr.innerHTML = `
            <td style="color:#fff; font-weight:bold;">${item.serial_number}</td>
            <td style="font-size:0.8em;">${item.category}</td>
            <td style="color:var(--term-blue);">${item.item_name}</td>
            <td>${locationHtml}</td>
            <td>${statusHtml}</td>
            <td style="text-align:right;">${actionsHtml}</td>
        `;
        tbody.appendChild(tr);
    });
}

function closeModals() {
    document.querySelectorAll('.modal-overlay').forEach(el => el.classList.add('hidden'));
}

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
    else alert("Erreur");
}

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

async function deleteItem(id) {
    if(!confirm("CONFIRMER LA DESTRUCTION DE CET OBJET ?")) return;
    await fetch('/api/equipment', {
        method: 'DELETE',
        headers: getAuthHeaders(),
        body: JSON.stringify({ id })
    });
    loadData();
}