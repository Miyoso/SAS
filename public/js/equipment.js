function getAuthHeaders() {
    const token = localStorage.getItem('sas_token');
    if (!token) {
        window.location.href = 'index.html'; // Redirection si pas de token
        return {};
    }
    return { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
}

// Initialisation au chargement de la page
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    loadAgents();
});

// Charger la liste des agents
async function loadAgents() {
    try {
        const res = await fetch('/api/users', { headers: getAuthHeaders() });
        if (res.status === 401) { window.location.href = 'index.html'; return; }
        
        if (res.ok) {
            const agents = await res.json();
            const select = document.getElementById('assign-agent');
            if(select) {
                select.innerHTML = '<option value="" disabled selected>CHOISIR UN AGENT...</option>';
                agents.forEach(name => {
                    const opt = document.createElement('option');
                    opt.value = name;
                    opt.innerText = name.toUpperCase();
                    select.appendChild(opt);
                });
            }
        }
    } catch(e) { 
        console.error("Erreur chargement agents", e); 
    }
}

// Charger les équipements
async function loadData() {
    const searchInput = document.getElementById('search-input');
    const search = searchInput ? searchInput.value : '';
    
    try {
        const res = await fetch(`/api/equipment?search=${encodeURIComponent(search)}`, {
            headers: getAuthHeaders()
        });

        if (res.status === 401) {
            alert("Session expirée. Veuillez vous reconnecter.");
            window.location.href = 'index.html';
            return;
        }
        
        if (res.ok) {
            const data = await res.json();
            renderTable(data);
        } else {
            console.error("Erreur serveur:", res.status);
        }
    } catch (e) {
        console.error("Erreur connexion API:", e);
    }
}

// Afficher le tableau
function renderTable(items) {
    const tbody = document.getElementById('table-body');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    let currentCategory = null;

    if (items.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:#666;">AUCUNE DONNÉE TROUVÉE</td></tr>';
        return;
    }

    items.forEach(item => {
        // Sécurisation si category est null
        const itemCat = item.category || 'AUTRE';

        if (itemCat !== currentCategory) {
            currentCategory = itemCat;
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
            locationHtml = `<span style="color:#667;">[LOC]</span> ${item.storage_location || 'N/A'}`;
            actionsHtml = `<button class="btn-action" onclick="openAssign(${item.id}, '${item.item_name.replace(/'/g, "\\'")}')">SORTIR >></button>`;
        } else {
            statusHtml = `<span class="badge badge-issued">ASSIGNÉ</span>`;
            locationHtml = `<span class="highlight">${item.assigned_to}</span>`;
            actionsHtml = `<button class="btn-action" onclick="openReturn(${item.id})"><< RENDRE</button>`;
        }

        actionsHtml += ` <button class="btn-action" style="border-color:#522; color:#a55; margin-left:5px;" onclick="deleteItem(${item.id})">X</button>`;

        tr.innerHTML = `
            <td style="color:#fff; font-weight:bold;">${item.serial_number}</td>
            <td style="font-size:0.8em;">${itemCat}</td>
            <td style="color:var(--term-blue);">${item.item_name}</td>
            <td>${locationHtml}</td>
            <td>${statusHtml}</td>
            <td style="text-align:right;">${actionsHtml}</td>
        `;
        tbody.appendChild(tr);
    });
}

// Gestion des Modales
function closeModals() {
    document.querySelectorAll('.modal-overlay').forEach(el => el.classList.add('hidden'));
}

window.openModal = function(type) {
    if(type === 'create') document.getElementById('modal-create').classList.remove('hidden');
}

// Actions API
async function createItem() {
    const payload = {
        serial_number: document.getElementById('new-sn').value,
        item_name: document.getElementById('new-name').value,
        category: document.getElementById('new-cat').value,
        storage_location: document.getElementById('new-loc').value
    };

    if(!payload.serial_number || !payload.item_name) {
        alert("Numéro de série et Nom sont obligatoires.");
        return;
    }

    try {
        const res = await fetch('/api/equipment', {
            method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(payload)
        });

        if(res.ok) { 
            closeModals(); 
            loadData(); 
            // Reset fields
            document.getElementById('new-sn').value = '';
            document.getElementById('new-name').value = '';
            document.getElementById('new-loc').value = '';
        }
        else {
            const err = await res.json();
            alert("Erreur: " + (err.error || "Impossible de créer l'objet"));
        }
    } catch(e) { console.error(e); }
}

window.openAssign = function(id, name) {
    document.getElementById('assign-id').value = id;
    document.getElementById('assign-item-name').innerText = name;
    document.getElementById('assign-agent').value = "";
    document.getElementById('modal-assign').classList.remove('hidden');
}

async function confirmAssign() {
    const id = document.getElementById('assign-id').value;
    const agent = document.getElementById('assign-agent').value;
    
    if (!agent) {
        alert("Veuillez sélectionner un agent.");
        return;
    }

    await fetch('/api/equipment', {
        method: 'PUT', headers: getAuthHeaders(),
        body: JSON.stringify({ id, action: 'ASSIGN', target: agent })
    });
    closeModals(); 
    loadData();
}

window.openReturn = function(id) {
    document.getElementById('return-id').value = id;
    document.getElementById('return-loc').value = ""; // Clear previous value
    document.getElementById('modal-return').classList.remove('hidden');
}

async function confirmReturn() {
    const id = document.getElementById('return-id').value;
    const loc = document.getElementById('return-loc').value;

    if(!loc) {
        alert("Veuillez indiquer un emplacement de stockage.");
        return;
    }

    await fetch('/api/equipment', {
        method: 'PUT', headers: getAuthHeaders(),
        body: JSON.stringify({ id, action: 'STORE', target: loc })
    });
    closeModals(); 
    loadData();
}

async function deleteItem(id) {
    if(!confirm("CONFIRMER LA DESTRUCTION DE CET OBJET ? Cette action est irréversible.")) return;
    
    try {
        const res = await fetch('/api/equipment', {
            method: 'DELETE',
            headers: getAuthHeaders(),
            body: JSON.stringify({ id })
        });
        
        if(res.ok) loadData();
        else alert("Erreur lors de la suppression.");
    } catch(e) { console.error(e); }
}

// Expose closeModals globally for HTML buttons
window.closeModals = closeModals;
window.createItem = createItem;
window.confirmAssign = confirmAssign;
window.confirmReturn = confirmReturn;
window.deleteItem = deleteItem;
window.loadData = loadData;