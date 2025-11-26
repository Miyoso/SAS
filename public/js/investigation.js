// --- VARIABLES GLOBALES ---
let activeItem = null;
let isPanning = false;

// Positions pour le Drag des items
let dragOffsetX, dragOffsetY;

// Positions pour le Panning (Déplacement du monde)
let panX = 0, panY = 0;
let startPanX, startPanY;

// Gestion des liens
let linksData = []; 
let isLinking = false; 
let linkStartId = null;
let currentLinkColor = '#ff3333'; // Rouge par défaut

// --- DÉMARRAGE ---
document.addEventListener('DOMContentLoaded', () => {
    loadBoardData();
    setupPanning(); // Activer le déplacement du fond
});

// --- 1. CHARGEMENT ---
async function loadBoardData() {
    const world = document.getElementById('board-world');
    
    // Nettoyage (sauf SVG)
    const existingItems = document.querySelectorAll('.board-item');
    existingItems.forEach(e => e.remove());
    
    // On s'assure que le SVG est là
    let svg = document.getElementById('connections-layer');
    if (!svg) {
        svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.id = "connections-layer";
        world.appendChild(svg);
    }

    try {
        const res = await fetch('/api/investigation');
        const data = await res.json();
        
        linksData = data.links || []; 

        if (data.nodes) {
            data.nodes.forEach(node => renderNode(node));
            requestAnimationFrame(drawLines);
        }
    } catch (err) { console.error("Erreur chargement:", err); }
}

// --- 2. RENDU NODE ---
function renderNode(node) {
    const world = document.getElementById('board-world');
    const el = document.createElement('div');
    
    el.classList.add('board-item');
    el.id = `node-${node.id}`;
    el.setAttribute('data-db-id', node.id);
    el.style.left = node.x + 'px';
    el.style.top = node.y + 'px';

    // Gestion image/contenu
    let contentHtml = '';
    let pinColor = 'pin-red';
    let img = node.image_url || '';

    if (node.type === 'target') {
        if (!img) img = 'assets/Adam.jpg';
        contentHtml = `<img src="${img}" draggable="false">`;
        pinColor = 'pin-red';
    } else if (node.type === 'evidence') {
        pinColor = 'pin-yellow';
        contentHtml = img ? `<img src="${img}" draggable="false">` : `<div class="evidence-content" style="padding:20px; color:#aaa; font-size:0.8rem;">DOC CLASSÉ</div>`;
    } else {
        pinColor = 'pin-blue';
        if (!img) img = 'assets/carte.jpg';
        contentHtml = `<img src="${img}" style="opacity:0.8" draggable="false">`;
    }

    el.innerHTML = `
        <div class="pin ${pinColor}"></div>
        ${contentHtml}
        <div class="item-label">${node.label}</div>
        <div class="item-sub">${node.sub_label || ''}</div>
        <button class="btn-del" onclick="deleteNode(${node.id}, event)">×</button>
    `;

    // Événement Souris sur la fiche
    el.addEventListener("mousedown", handleNodeClick);
    
    world.appendChild(el);
}

// --- 3. PANNING (DÉPLACEMENT DU FOND) ---
function setupPanning() {
    const viewport = document.getElementById('board-viewport');

    viewport.addEventListener('mousedown', (e) => {
        // Si on clique sur une fiche, on ne pan pas
        if (e.target.closest('.board-item')) return;
        if (e.target.closest('.hud-overlay')) return;
        if (e.target.closest('.modal-overlay')) return;

        isPanning = true;
        startPanX = e.clientX - panX;
        startPanY = e.clientY - panY;
        viewport.style.cursor = 'grabbing';
    });

    window.addEventListener('mousemove', (e) => {
        if (isPanning) {
            e.preventDefault();
            panX = e.clientX - startPanX;
            panY = e.clientY - startPanY;
            updateWorldTransform();
        }
    });

    window.addEventListener('mouseup', () => {
        isPanning = false;
        viewport.style.cursor = 'grab';
    });
}

function updateWorldTransform() {
    const world = document.getElementById('board-world');
    world.style.transform = `translate(${panX}px, ${panY}px)`;
}

// --- 4. DRAG & DROP DES FICHES ---
function handleNodeClick(e) {
    if(e.target.classList.contains('btn-del')) return;

    // MODE LIEN
    if (isLinking) {
        e.stopPropagation(); // Empêcher le pan
        const clickedNode = e.currentTarget;
        const dbId = clickedNode.getAttribute('data-db-id');

        if (!linkStartId) {
            linkStartId = dbId;
            clickedNode.classList.add('selected-link');
        } else {
            if (linkStartId !== dbId) createLink(linkStartId, dbId);
            resetLinkMode();
        }
        return;
    }

    // MODE DRAG
    e.stopPropagation(); // Empêcher le pan du fond
    activeItem = e.currentTarget;
    
    // Calcul précis prenant en compte le zoom/pan
    // La position de la souris relative au viewport - la position de l'objet - le décalage du pan
    const rect = activeItem.getBoundingClientRect(); // Position visuelle à l'écran
    dragOffsetX = e.clientX - rect.left;
    dragOffsetY = e.clientY - rect.top;

    document.addEventListener("mouseup", itemDragEnd);
    document.addEventListener("mousemove", itemDrag);
}

function itemDrag(e) {
    if (activeItem) {
        e.preventDefault();
        
        // Calculer la position X/Y dans le "Monde" (donc en soustrayant le Pan)
        // MouseX - PanX - OffsetInterne
        const newX = e.clientX - panX - dragOffsetX;
        const newY = e.clientY - panY - dragOffsetY;

        activeItem.style.left = newX + 'px';
        activeItem.style.top = newY + 'px';
        
        requestAnimationFrame(drawLines);
    }
}

async function itemDragEnd() {
    if (activeItem) {
        const id = activeItem.getAttribute('data-db-id');
        const x = parseInt(activeItem.style.left);
        const y = parseInt(activeItem.style.top);

        // Sauvegarde
        try {
            await fetch('/api/investigation', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, x, y })
            });
        } catch(e) {}

        document.removeEventListener("mouseup", itemDragEnd);
        document.removeEventListener("mousemove", itemDrag);
        activeItem = null;
    }
}

// --- 5. GESTION LIENS & COULEURS ---
window.setLinkColor = function(color, btn) {
    currentLinkColor = color;
    document.querySelectorAll('.color-dot').forEach(d => d.classList.remove('active'));
    btn.classList.add('active');
}

window.toggleLinkMode = function() {
    isLinking = !isLinking;
    const btn = document.getElementById('btn-link');
    const container = document.getElementById('board-viewport');

    if (isLinking) {
        container.classList.add('linking-mode');
        btn.style.background = currentLinkColor; // Le bouton prend la couleur choisie
        btn.style.color = (currentLinkColor === '#ffffff') ? '#000' : '#fff';
        btn.innerText = "SÉLECTIONNER...";
    } else {
        resetLinkMode();
    }
}

function resetLinkMode() {
    isLinking = false;
    linkStartId = null;
    document.getElementById('board-viewport').classList.remove('linking-mode');
    document.querySelectorAll('.selected-link').forEach(el => el.classList.remove('selected-link'));
    
    const btn = document.getElementById('btn-link');
    btn.style.background = '';
    btn.style.color = '';
    btn.innerText = "🔗 LIER";
}

async function createLink(fromId, toId) {
    // Optimistic update
    linksData.push({ from_id: parseInt(fromId), to_id: parseInt(toId), color: currentLinkColor });
    drawLines();

    await fetch('/api/investigation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            action: 'create_link', 
            from_id: fromId, 
            to_id: toId, 
            color: currentLinkColor 
        })
    });
}

function drawLines() {
    const svg = document.getElementById('connections-layer');
    svg.innerHTML = ''; 
    
    // On dessine dans le référentiel du "Monde", donc c'est simple
    // Les coordonnées des nodes (style.left/top) sont déjà dans ce référentiel
    
    linksData.forEach(link => {
        const el1 = document.getElementById(`node-${link.from_id}`);
        const el2 = document.getElementById(`node-${link.to_id}`);

        if (el1 && el2) {
            // On récupère les positions CSS brutes (relatives au monde)
            // + la moitié de la taille pour centrer (width ~180, height selon contenu)
            const x1 = parseInt(el1.style.left) + el1.offsetWidth / 2;
            const y1 = parseInt(el1.style.top) + el1.offsetHeight / 2;
            const x2 = parseInt(el2.style.left) + el2.offsetWidth / 2;
            const y2 = parseInt(el2.style.top) + el2.offsetHeight / 2;

            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('x1', x1); line.setAttribute('y1', y1);
            line.setAttribute('x2', x2); line.setAttribute('y2', y2);
            
            line.classList.add('connection-line');
            // Appliquer la couleur stockée ou rouge par défaut
            line.style.stroke = link.color || '#ff3333'; 
            
            svg.appendChild(line);
        }
    });
}

// --- 6. CRÉATION MODAL ---
let currentModalType = 'target';
window.createNode = function(type) {
    document.getElementById('creation-modal').classList.remove('hidden');
    // Centrer le modal si besoin, ou reset inputs
    document.getElementById('inp-label').value = '';
    document.getElementById('inp-sub').value = '';
    document.getElementById('inp-img').value = '';
    setModalType(type);
}
window.closeModal = function() { document.getElementById('creation-modal').classList.add('hidden'); }
window.setModalType = function(type) {
    currentModalType = type;
    document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(`btn-type-${type}`).classList.add('active');
}
window.confirmCreateNode = async function() {
    const label = document.getElementById('inp-label').value || 'INCONNU';
    const sub = document.getElementById('inp-sub').value;
    const img = document.getElementById('inp-img').value;

    // On crée l'objet au centre de l'écran visible (en tenant compte du Pan)
    // Centre Écran = (Width/2, Height/2)
    // Coordonnée Monde = Centre Écran - PanX
    const centerX = (window.innerWidth / 2) - panX - 90;
    const centerY = (window.innerHeight / 2) - panY - 100;

    const payload = {
        action: 'create_node',
        type: currentModalType,
        label: label.toUpperCase(),
        sub_label: sub ? sub.toUpperCase() : '',
        image_url: img,
        x: Math.floor(centerX),
        y: Math.floor(centerY)
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

window.deleteNode = async function(id, event) {
    event.stopPropagation();
    if(confirm("Supprimer ce dossier ?")) {
        await fetch('/api/investigation', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id })
        });
        document.getElementById(`node-${id}`).remove();
        linksData = linksData.filter(l => l.from_id !== id && l.to_id !== id);
        drawLines();
    }
}