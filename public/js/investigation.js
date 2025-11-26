// --- VARIABLES GLOBALES ---
let activeItem = null;
let currentX, currentY, initialX, initialY;
let linksData = []; 
let isLinking = false; 
let linkStartId = null;

// --- DÉMARRAGE ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("Investigation Board : Démarrage...");
    loadBoardData();
});

// --- 1. CHARGEMENT DES DONNÉES ---
async function loadBoardData() {
    const container = document.getElementById('board-container');
    
    // On s'assure que le calque SVG existe toujours
    let svg = document.getElementById('connections-layer');
    if (!svg) {
        svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.id = "connections-layer";
        container.prepend(svg);
    }
    
    // On vide les fiches existantes (mais pas le SVG)
    document.querySelectorAll('.board-item').forEach(e => e.remove());

    try {
        console.log("Appel API en cours...");
        const res = await fetch('/api/investigation');
        
        if (!res.ok) throw new Error(`Erreur API: ${res.status}`);
        
        const data = await res.json();
        console.log("Données reçues :", data);

        linksData = data.links || []; 

        if (data.nodes && data.nodes.length > 0) {
            data.nodes.forEach(node => renderNode(node));
            drawLines();
        } else {
            console.log("Aucune donnée dans la base (Table vide ?)");
        }

    } catch (err) { 
        console.error("Erreur critique chargement:", err);
        alert("Erreur de chargement du tableau. Vérifiez la console (F12).");
    }
}

// --- 2. RENDU VISUEL D'UNE FICHE ---
function renderNode(node) {
    const container = document.getElementById('board-container');
    const el = document.createElement('div');
    
    el.classList.add('board-item');
    el.id = `node-${node.id}`;
    el.setAttribute('data-db-id', node.id);
    el.style.left = node.x + 'px';
    el.style.top = node.y + 'px';

    // Gestion de l'image
    let img = node.image_url;
    let contentHtml = '';
    let pinColor = 'pin-red';

    if (node.type === 'target') {
        if (!img) img = 'assets/Adam.jpg'; // Image par défaut
        contentHtml = `<img src="${img}" draggable="false">`;
        pinColor = 'pin-red';
    } else if (node.type === 'evidence') {
        pinColor = 'pin-yellow';
        contentHtml = img ? `<img src="${img}" draggable="false">` : `<div class="evidence-content" style="padding:20px; color:#aaa; font-size:0.8rem;">DOC CLASSÉ</div>`;
    } else {
        // Location ou Autre
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

    // Événement Souris (Drag ou Link)
    el.addEventListener("mousedown", handleNodeClick);
    
    container.appendChild(el);
}

// --- 3. GESTION CLIC / DRAG ---
function handleNodeClick(e) {
    // Si on clique sur le bouton supprimer, on ne fait rien ici
    if(e.target.classList.contains('btn-del')) return;

    // MODE LIEN (FIL ROUGE)
    if (isLinking) {
        const clickedNode = e.currentTarget;
        const dbId = clickedNode.getAttribute('data-db-id');

        if (!linkStartId) {
            // Premier clic
            linkStartId = dbId;
            clickedNode.classList.add('selected-link');
        } else {
            // Deuxième clic
            if (linkStartId !== dbId) {
                createLink(linkStartId, dbId);
            }
            resetLinkMode();
        }
        return;
    }

    // MODE DÉPLACEMENT (DRAG)
    activeItem = e.currentTarget;
    const rect = activeItem.getBoundingClientRect();
    
    // On calcule le décalage souris/coin de la boîte
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
        
        // Mise à jour des fils en temps réel
        requestAnimationFrame(drawLines);
    }
}

async function dragEnd(e) {
    if (activeItem) {
        const id = activeItem.getAttribute('data-db-id');
        const x = parseInt(activeItem.style.left);
        const y = parseInt(activeItem.style.top);

        // Sauvegarde en BDD
        try {
            await fetch('/api/investigation', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, x, y })
            });
        } catch (err) { console.error("Erreur sauvegarde pos:", err); }

        document.removeEventListener("mouseup", dragEnd);
        document.removeEventListener("mousemove", drag);
        activeItem = null;
    }
}

// --- 4. GESTION DES LIENS (SVG) ---
function toggleLinkMode() {
    isLinking = !isLinking;
    const container = document.getElementById('board-container');
    const btn = document.querySelector('.tools button:last-child'); 

    if (isLinking) {
        container.classList.add('linking-mode'); // Ajoute un curseur spécial via CSS
        if(btn) {
            btn.style.background = 'var(--warning)';
            btn.style.color = '#000';
            btn.innerText = "SÉLECTIONNER FICHE 1...";
        }
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
    if(btn) {
        btn.style.background = '';
        btn.style.color = '';
        btn.innerText = "🔗 LIER (FIL ROUGE)";
    }
}

async function createLink(fromId, toId) {
    try {
        const res = await fetch('/api/investigation', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'create_link', from_id: fromId, to_id: toId })
        });
        
        if (res.ok) {
            linksData.push({ from_id: parseInt(fromId), to_id: parseInt(toId) });
            drawLines();
        }
    } catch (err) { console.error("Erreur création lien:", err); }
}

function drawLines() {
    const svg = document.getElementById('connections-layer');
    if(!svg) return;
    
    svg.innerHTML = ''; // Reset du dessin
    const containerRect = document.getElementById('board-container').getBoundingClientRect();

    linksData.forEach(link => {
        const el1 = document.getElementById(`node-${link.from_id}`);
        const el2 = document.getElementById(`node-${link.to_id}`);

        if (el1 && el2) {
            const rect1 = el1.getBoundingClientRect();
            const rect2 = el2.getBoundingClientRect();

            // Calcul des centres relatifs au conteneur
            const x1 = (rect1.left + rect1.width / 2) - containerRect.left;
            const y1 = (rect1.top + rect1.height / 2) - containerRect.top;
            const x2 = (rect2.left + rect2.width / 2) - containerRect.left;
            const y2 = (rect2.top + rect2.height / 2) - containerRect.top;

            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('x1', x1); line.setAttribute('y1', y1);
            line.setAttribute('x2', x2); line.setAttribute('y2', y2);
            line.classList.add('connection-line'); // Classe CSS définie
            svg.appendChild(line);
        }
    });
}

// --- 5. MODALE DE CRÉATION ---
let currentModalType = 'target';

// Expose functions to global window scope for HTML buttons
window.createNode = function(type) {
    document.getElementById('creation-modal').classList.remove('hidden');
    // Reset champs
    document.getElementById('inp-label').value = '';
    document.getElementById('inp-sub').value = '';
    document.getElementById('inp-img').value = '';
    setModalType(type);
}

window.closeModal = function() {
    document.getElementById('creation-modal').classList.add('hidden');
}

window.setModalType = function(type) {
    currentModalType = type;
    document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
    const btn = document.getElementById(`btn-type-${type}`);
    if(btn) btn.classList.add('active');
}

window.confirmCreateNode = async function() {
    const label = document.getElementById('inp-label').value || 'INCONNU';
    const sub = document.getElementById('inp-sub').value;
    const img = document.getElementById('inp-img').value;

    const payload = {
        action: 'create_node',
        type: currentModalType,
        label: label.toUpperCase(),
        sub_label: sub ? sub.toUpperCase() : '',
        image_url: img,
        // Position au centre de l'écran (approximatif)
        x: Math.floor(window.innerWidth/2 - 90),
        y: Math.floor(window.innerHeight/2 - 100)
    };

    try {
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
    } catch (err) { console.error("Erreur création:", err); }
}

window.deleteNode = async function(id, event) {
    event.stopPropagation(); // Important : ne pas déclencher le drag
    if(confirm("Supprimer ce dossier ?")) {
        try {
            await fetch('/api/investigation', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id })
            });
            
            const el = document.getElementById(`node-${id}`);
            if(el) el.remove();

            // Nettoyer les liens locaux
            linksData = linksData.filter(l => l.from_id !== id && l.to_id !== id);
            drawLines();
        } catch (err) { console.error("Erreur suppression:", err); }
    }
}

window.toggleLinkMode = toggleLinkMode;