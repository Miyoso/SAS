function renderTable(items) {
    const tbody = document.getElementById('table-body');
    tbody.innerHTML = '';

    items.forEach(item => {
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

        // Ajout d'un bouton de suppression discret
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

async function deleteItem(id) {
    if(!confirm("CONFIRMER LA DESTRUCTION DE CET OBJET ? CETTE ACTION EST IRRÉVERSIBLE.")) return;
    await fetch('/api/equipment', {
        method: 'DELETE',
        headers: getAuthHeaders(),
        body: JSON.stringify({ id })
    });
    loadData();
}