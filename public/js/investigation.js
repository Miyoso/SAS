let activeItem = null;
let currentX, currentY, initialX, initialY;
let linksData = []; // Pour stocker les liens venant de la BDD

document.addEventListener('DOMContentLoaded', () => {
    loadBoardData(); // Charger les données depuis Neon au démarrage
});

// --- 1. CHARGEMENT DES DONNÉES ---
async function loadBoardData() {
    const container = document.getElementById('board-container');
    container.innerHTML = '<svg id="connections-layer"></svg>'; // Reset sauf le calque SVG

    try {
        const res = await fetch('/api/investigation');
        const data = await res.json();
        
        // Stocker les liens pour plus tard
        linksData = data.links;

        // Générer les cartes (Nodes)
        data.nodes.forEach(node => {
            renderNode(node);
        });

        // Dessiner les liens une fois que les cartes sont là
        drawLines();

    } catch (err) {
        console.error("Erreur chargement:", err);
    }
}

// --- 2. AFFICHER UNE CARTE (RENDER) ---
function renderNode(node) {
    const container = document.getElementById('board-container');
    const el = document.createElement('div');
    el.classList.add('board-item');
    el.id = `node-${node.id}`; // Important pour les liens : node-1, node-2...
    el.style.left = node.x + 'px';
    el.style.top = node.y + 'px';
    el.setAttribute('data-id', node.id); // ID réel pour l'API

    // Contenu selon le type
    let pinColor = 'pin-red';
    let contentHtml = '';

    if (node.type === 'target') {
        pinColor = 'pin-red';
        contentHtml = `<img src="${node.image_url || 'assets/unknown.jpg'}">`;
    } else if (node.type === 'evidence') {
        pinColor = 'pin-yellow';
        contentHtml = `<div class="evidence-content">DOC</div>`;
    } else {
        pinColor = 'pin-blue';
        contentHtml = `<img src="${node.image_url}" style="opacity:0.8">`;
    }

    el.innerHTML = `
        <div class="pin ${pinColor}"></div>
        ${contentHtml}
        <div class="item-label">${node.label}</div>
        <div class="item-sub">${node.sub_label || ''}</div>
        <button class="btn-del" onclick="deleteNode(${node.id}, event)">×</button>
    `;

    container.appendChild(el);
    setupDraggable(el);
}

// --- 3. DRAG & DROP AVEC SAUVEGARDE ---
function setupDraggable(item) {
    item.addEventListener("mousedown", dragStart);
}

function dragStart(e) {
    if(e.target.tagName === 'BUTTON') return; // Ignorer clic sur bouton supprimer
    
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

        drawLines(); // Mettre à jour les fils rouges en temps réel
    }
}

// C'est ici qu'on sauvegarde la nouvelle position !
async function dragEnd(e) {
    if (activeItem) {
        const id = activeItem.getAttribute('data-id');
        const x = parseInt(activeItem.style.left);
        const y = parseInt(activeItem.style.top);

        // Appel API pour sauvegarder
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

// --- 4. CRÉATION (Create) ---
async function createNode(type) {
    // Données par défaut selon le type
    let payload = {
        type: type,
        x: Math.floor(window.innerWidth/2 - 50),
        y: Math.floor(window.innerHeight/2 - 50)
    };

    if (type === 'target') {
        const name = prompt("Nom de la cible ?", "INCONNU");
        if (!name) return;
        payload.label = name.toUpperCase();
        payload.sub_label = "SUSPECT";
        payload.image_url = "assets/Adam.jpg"; // Image par défaut temporaire
    } else {
        const note = prompt("Titre de la note ?", "INDICE");
        if (!note) return;
        payload.label = note.toUpperCase();
        payload.sub_label = "PREUVE";
        payload.image_url = null;
    }

    // Sauvegarde en BDD
    const res = await fetch('/api/investigation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    if (res.ok) {
        const newNode = await res.json();
        renderNode(newNode); // Afficher immédiatement
    }
}

// --- 5. SUPPRESSION (Delete) ---
async function deleteNode(id, event) {
    event.stopPropagation(); // Empêcher le drag
    if(confirm("Supprimer cet élément ?")) {
        await fetch('/api/investigation', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id })
        });
        document.getElementById(`node-${id}`).remove();
        drawLines(); // Nettoyer les lignes orphelines
    }
}

// --- 6. DESSINER LES LIGNES (SVG) ---
function drawLines() {
    const svg = document.getElementById('connections-layer');
    svg.innerHTML = ''; 
    const containerRect = document.getElementById('board-container').getBoundingClientRect();

    linksData.forEach(link => {
        // Attention : en BDD on a from_id, to_id (ex: 1, 2)
        // Dans le DOM on a des ID HTML (ex: node-1, node-2)
        const el1 = document.getElementById(`node-${link.from_id}`);
        const el2 = document.getElementById(`node-${link.to_id}`);

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