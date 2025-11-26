let activeItem = null;
let currentX, currentY, initialX, initialY;
let linksData = []; 
let isLinking = false; // Est-ce qu'on est en train de lier des fiches ?
let linkStartId = null; // ID de la première fiche cliquée

document.addEventListener('DOMContentLoaded', () => {
    loadBoardData();
});

// --- 1. CHARGEMENT ---
async function loadBoardData() {
    const container = document.getElementById('board-container');
    // On garde le SVG mais on vide le reste
    const svg = document.getElementById('connections-layer');
    container.innerHTML = ''; 
    container.appendChild(svg);

    try {
        const res = await fetch('/api/investigation');
        const data = await res.json();
        
        linksData = data.links; // Sauvegarde locale des liens

        data.nodes.forEach(node => renderNode(node));
        drawLines();

    } catch (err) { console.error(err); }
}

// --- 2. RENDU VISUEL ---
function renderNode(node) {
    const container = document.getElementById('board-container');
    const el = document.createElement('div');
    el.classList.add('board-item');
    el.id = `node-${node.id}`;
    el.setAttribute('data-db-id', node.id); // ID BDD
    el.style.left = node.x + 'px';
    el.style.top = node.y + 'px';

    // Image par défaut si vide
    let img = node.image_url;
    if (!img || img.trim() === '') {
        if(node.type === 'target') img = 'assets/Adam.jpg'; // Fallback
        else if(node.type === 'evidence') img = ''; 
    }

    let contentHtml = '';
    let pinColor = 'pin-red';

    if (node.type === 'target') {
        contentHtml = `<img src="${img}">`;
    } else if (node.type === 'evidence') {
        pinColor = 'pin-yellow';
        // Si c'est une preuve texte, pas d'image
        contentHtml = img ? `<img src="${img}">` : `<div class="evidence-content" style="padding:20px; color:#aaa;">DOC</div>`;
    } else {
        pinColor = 'pin-blue';
        contentHtml = `<img src="${img}" style="opacity:0.8">`;
    }

    el.innerHTML = `
        <div class="pin ${pinColor}"></div>
        ${contentHtml}
        <div class="item-label">${node.label}</div>
        <div class="item-sub">${node.sub_label || ''}</div>
        <button class="btn-del" onclick="deleteNode(${node.id}, event)">×</button>
    `;

    // Gestion du clic (Drag ou Link)
    el.addEventListener("mousedown", handleNodeClick);
    
    container.appendChild(el);
}

// --- 3. LOGIQUE CLICK (DRAG ou LINK) ---
function handleNodeClick(e) {
    if(e.target.tagName === 'BUTTON') return; // Bouton supprimer

    // SI MODE LIEN ACTIVÉ
    if (isLinking) {
        const clickedNode = e.currentTarget;
        const dbId = clickedNode.getAttribute('data-db-id');

        if (!linkStartId) {
            // Premier clic (Départ)
            linkStartId = dbId;
            clickedNode.classList.add('selected-link');
        } else {
            // Deuxième clic (Arrivée)
            if (linkStartId !== dbId) {
                createLink(linkStartId, dbId);
            }
            // Reset
            resetLinkMode();
        }
        return;
    }

    // SINON : MODE DRAG (Déplacement)
    activeItem = e.currentTarget;
    const rect = activeItem.getBoundingClientRect();
    initialX = e.clientX - rect.left;
    initialY = e.clientY - rect.top;
    document.addEventListener("mouseup", dragEnd);
    document.addEventListener("mousemove", drag);
}

function drag(e) {
    if (activeItem) {
        e.preventDefault();
        const container = document.getElementById('board-container');
        const containerRect = container.getBoundingClientRect();
        
        let newX = e.clientX - containerRect.left - initialX;
        let newY = e.clientY - containerRect.top - initialY;

        activeItem.style.left = newX + "px";
        activeItem.style.top = newY + "px";
        drawLines();
    }
}

async function dragEnd(e) {
    if (activeItem) {
        const id = activeItem.getAttribute('data-db-id');
        const x = parseInt(activeItem.style.left);
        const y = parseInt(activeItem.style.top);

        await fetch('/api/investigation', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, x, y })
        });

        document.removeEventListener("mouseup", dragEnd);
        document.removeEventListener("mousemove", drag);
        activeItem = null;
    }
}

// --- 4. GESTION DES LIENS ---
function toggleLinkMode() {
    isLinking = !isLinking;
    const container = document.getElementById('board-container');
    const btn = document.querySelector('.tools button:last-child'); // Bouton "LIER"

    if (isLinking) {
        container.classList.add('linking-mode');
        btn.style.background = 'var(--warning)';
        btn.style.color = '#000';
        btn.innerText = "SÉLECTIONNER FICHE 1...";
    } else {
        resetLinkMode();
    }
}

function resetLinkMode() {
    isLinking = false;
    linkStartId = null;
    document.getElementById('board-container').classList.remove('linking-mode');
    document.querySelectorAll('.selected-link').forEach(el => el.classList.remove('selected-link'));
    
    const btn = document.querySelector('.tools button:last-child');
    btn.style.background = '';
    btn.style.color = '';
    btn.innerText = "🔗 LIER (FIL ROUGE)";
}

async function createLink(fromId, toId) {
    const res = await fetch('/api/investigation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create_link', from_id: fromId, to_id: toId })
    });
    
    if (res.ok) {
        // Ajouter localement et redessiner sans recharger
        linksData.push({ from_id: parseInt(fromId), to_id: parseInt(toId) });
        drawLines();
    }
}

function drawLines() {
    const svg = document.getElementById('connections-layer');
    svg.innerHTML = ''; 
    const containerRect = document.getElementById('board-container').getBoundingClientRect();

    linksData.forEach(link => {
        const el1 = document.querySelector(`[data-db-id="${link.from_id}"]`);
        const el2 = document.querySelector(`[data-db-id="${link.to_id}"]`);

        if (el1 && el2) {
            const rect1 = el1.getBoundingClientRect();
            const rect2 = el2.getBoundingClientRect();

            const x1 = (rect1.left + rect1.width / 2) - containerRect.left;
            const y1 = (rect1.top + rect1.height / 2) - containerRect.top;
            const x2 = (rect2.left + rect2.width / 2) - containerRect.left;
            const y2 = (rect2.top + rect2.height / 2) - containerRect.top;

            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('x1', x1); line.setAttribute('y1', y1);
            line.setAttribute('x2', x2); line.setAttribute('y2', y2);
            line.classList.add('connection-line');
            svg.appendChild(line);
        }
    });
}

// --- 5. GESTION DU MODAL (CRÉATION) ---
let currentModalType = 'target';

function openModal() {
    document.getElementById('creation-modal').classList.remove('hidden');
    // Reset inputs
    document.getElementById('inp-label').value = '';
    document.getElementById('inp-sub').value = '';
    document.getElementById('inp-img').value = '';
    setModalType('target');
}

// Fonction appelée par les boutons "+ CIBLE", "+ PREUVE"
window.createNode = function(type) { // Exposed to HTML
    openModal();
    setModalType(type);
}

window.closeModal = function() {
    document.getElementById('creation-modal').classList.add('hidden');
}

window.setModalType = function(type) {
    currentModalType = type;
    document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(`btn-type-${type}`).classList.add('active');
}

window.confirmCreateNode = async function() {
    const label = document.getElementById('inp-label').value || 'INCONNU';
    const sub = document.getElementById('inp-sub').value;
    const img = document.getElementById('inp-img').value;

    const payload = {
        action: 'create_node', // Optionnel, par défaut c'est node
        type: currentModalType,
        label: label.toUpperCase(),
        sub_label: sub ? sub.toUpperCase() : '',
        image_url: img,
        x: Math.floor(window.innerWidth/2 - 50),
        y: Math.floor(window.innerHeight/2 - 50)
    };

    const res = await fetch('/api/investigation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    if (res.ok) {
        const newNode = await res.json();
        renderNode(newNode);
        closeModal();
    }
}

// --- 6. SUPPRESSION ---
window.deleteNode = async function(id, event) {
    event.stopPropagation();
    if(confirm("Supprimer ce dossier et ses liens ?")) {
        await fetch('/api/investigation', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id })
        });
        
        // Supprimer visuellement
        const el = document.getElementById(`node-${id}`);
        if(el) el.remove();

        // Supprimer les liens locaux
        linksData = linksData.filter(l => l.from_id !== id && l.to_id !== id);
        drawLines();
    }
}