let activeItem = null;
let isPanning = false;
let dragOffsetX, dragOffsetY;
let panX = 0, panY = 0;
let startPanX, startPanY;
let linksData = [];
let isLinking = false;
let linkStartId = null;
let currentLinkColor = '#ff3333';
let currentBoardId = null;
let currentScale = 1;
let editingNodeId = null;
let editingLinkId = null;

function getAuthHeaders() {
    const token = localStorage.getItem('sas_token');
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
}

document.addEventListener('DOMContentLoaded', () => {
    setupPanning();
    loadBoardsList();

    if (typeof Pusher !== 'undefined') {
        initRealtimeBoard();
    }
});

function initRealtimeBoard() {
    const pusher = new Pusher('51d51cc5bfc1c8ee90d4', {
        cluster: 'eu'
    });

    const channel = pusher.subscribe('investigation-board');

    channel.bind('node-created', (node) => {
        if (node.board_id != currentBoardId) return;
        if (!document.getElementById(`node-${node.id}`)) {
            renderNode(node);
        }
    });

    channel.bind('node-moved', (data) => {
        if (activeItem && activeItem.getAttribute('data-db-id') == data.id) return;
        const el = document.getElementById(`node-${data.id}`);
        if (el) {
            el.style.transition = "left 0.3s, top 0.3s";
            el.style.left = data.x + 'px';
            el.style.top = data.y + 'px';
            setTimeout(() => { el.style.transition = ""; }, 300);
            requestAnimationFrame(drawLines);
        }
    });

    channel.bind('node-updated', (data) => {
        const existingEl = document.getElementById(`node-${data.id}`);
        if (existingEl) existingEl.remove();
        renderNode(data);
        requestAnimationFrame(drawLines);
    });

    channel.bind('node-deleted', (data) => {
        const el = document.getElementById(`node-${data.id}`);
        if (el) {
            el.remove();
            linksData = linksData.filter(l => l.from_id != data.id && l.to_id != data.id);
            drawLines();
        }
    });

    channel.bind('link-created', (link) => {
        if (link.board_id != currentBoardId) return;
        const exists = linksData.find(l => l.id == link.id);
        if (!exists) {
            linksData.push(link);
            drawLines();
        }
    });

    channel.bind('link-updated', (link) => {
        const index = linksData.findIndex(l => l.id == link.id);
        if (index !== -1) {
            linksData[index] = link;
            requestAnimationFrame(drawLines);
        }
    });

    channel.bind('link-deleted', (data) => {
        linksData = linksData.filter(l => l.id != data.id);
        requestAnimationFrame(drawLines);
    });
}

function toggleSidebar() {
    document.getElementById('case-sidebar').classList.toggle('open');
}

async function loadBoardsList() {
    try {
        const res = await fetch('/api/game?entity=boards', { headers: getAuthHeaders() });
        const boards = await res.json();
        const container = document.getElementById('case-list');
        container.innerHTML = '';

        if(boards.length === 0) {
            container.innerHTML = '<div style="padding:10px; color:#666">Aucun dossier. Créez-en un.</div>';
            return;
        }

        if (!currentBoardId && boards.length > 0) selectBoard(boards[0].id);

        boards.forEach(b => {
            const div = document.createElement('div');
            div.className = `case-item ${b.id === currentBoardId ? 'active' : ''}`;
            div.onclick = () => selectBoard(b.id);
            div.innerHTML = `
                <div class="case-title">📁 ${b.title}</div>
                <div class="case-date">REF: ${b.id} // ${new Date(b.created_at).toLocaleDateString()}</div>
            `;
            container.appendChild(div);
        });
    } catch(e) { console.error(e); }
}

async function createNewBoard() {
    const title = document.getElementById('new-case-title').value;
    if(!title) return;
    await fetch('/api/game?entity=boards', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ title })
    });
    document.getElementById('new-case-title').value = '';
    loadBoardsList();
}

function selectBoard(id) {
    currentBoardId = id;
    document.querySelectorAll('.case-item').forEach(el => el.classList.remove('active'));
    loadBoardsList();
    loadBoardData();
}

async function loadBoardData() {
    if(!currentBoardId) return;
    const world = document.getElementById('board-world');
    document.querySelectorAll('.board-item').forEach(e => e.remove());

    let svg = document.getElementById('connections-layer');
    if (!svg) {
        svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.id = "connections-layer";
        world.appendChild(svg);
    }
    svg.innerHTML = '';

    try {
        const res = await fetch(`/api/game?entity=investigation&board_id=${currentBoardId}`, {
            method: 'GET',
            headers: getAuthHeaders()
        });
        if (res.status === 401) { window.location.href = '/index.html'; return; }
        if (!res.ok) throw new Error("Erreur serveur");

        const data = await res.json();
        linksData = data.links || [];
        if (data.nodes) {
            data.nodes.forEach(node => renderNode(node));
            requestAnimationFrame(drawLines);
        }
    } catch (err) { console.error(err); }
}

function renderNode(node) {
    const world = document.getElementById('board-world');
    const el = document.createElement('div');
    el.classList.add('board-item');
    el.id = `node-${node.id}`;
    el.setAttribute('data-db-id', node.id);
    el.style.left = node.x + 'px';
    el.style.top = node.y + 'px';

    let contentHtml = '';
    let pinColor = 'pin-red';

    if (node.type === 'note') {
        el.classList.add('note');
        pinColor = 'pin-note';
        contentHtml = `
            <div class="item-label">${node.label}</div>
            <div class="item-sub">${node.sub_label || ''}</div>
        `;
    } else {
        let img = node.image_url || '';
        if (node.type === 'target') {
            if (!img) img = 'assets/Adam.jpg';
            contentHtml = `<img src="${img}" draggable="false" onerror="this.src='assets/Adam.jpg'">`;
            pinColor = 'pin-red';
        } else if (node.type === 'evidence') {
            pinColor = 'pin-yellow';
            contentHtml = img ? `<img src="${img}" draggable="false">` : `<div class="evidence-content" style="padding:20px; color:#aaa; font-size:0.8rem; text-align:center;">PREUVE<br>NUMÉRIQUE</div>`;
        } else {
            pinColor = 'pin-blue';
            if (!img) img = 'assets/carte.jpg';
            contentHtml = `<img src="${img}" style="opacity:0.8" draggable="false">`;
        }
        contentHtml += `
            <div class="item-label">${node.label}</div>
            <div class="item-sub">${node.sub_label || ''}</div>
        `;
    }

    el.innerHTML = `
        <div class="pin ${pinColor}"></div>
        ${contentHtml}
        <button class="btn-del" onclick="deleteNode(${node.id}, event)">×</button>
    `;

    el.addEventListener("mousedown", handleNodeClick);
    el.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        e.stopPropagation();
        editingNodeId = node.id;
        document.getElementById('creation-modal').classList.remove('hidden');
        document.querySelector('.modal-title').innerText = "MODIFIER ÉLÉMENT";
        setModalType(node.type);
        document.getElementById('inp-label').value = node.label || '';
        document.getElementById('inp-sub').value = node.sub_label || '';
        if(document.getElementById('inp-img')) document.getElementById('inp-img').value = node.image_url || '';
    });

    world.appendChild(el);
}

function setupPanning() {
    const viewport = document.getElementById('board-viewport');
    viewport.addEventListener('mousedown', (e) => {
        if (e.target.closest('.board-item')) return;
        if (e.target.closest('.hud-overlay')) return;
        if (e.target.closest('.modal-overlay')) return;
        if (e.target.closest('.link-group')) return;

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
    viewport.addEventListener('wheel', (e) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        const newScale = Math.min(Math.max(0.2, currentScale + delta), 2);
        currentScale = newScale;
        updateWorldTransform();
    }, { passive: false });
}

function updateWorldTransform() {
    const world = document.getElementById('board-world');
    world.style.transform = `translate(${panX}px, ${panY}px) scale(${currentScale})`;
}

function handleNodeClick(e) {
    if(e.target.classList.contains('btn-del')) return;
    if (isLinking) {
        e.stopPropagation();
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
    e.stopPropagation();
    activeItem = e.currentTarget;
    const rect = activeItem.getBoundingClientRect();
    const scale = currentScale;
    dragOffsetX = (e.clientX - rect.left) / scale;
    dragOffsetY = (e.clientY - rect.top) / scale;
    document.addEventListener("mouseup", itemDragEnd);
    document.addEventListener("mousemove", itemDrag);
}

function itemDrag(e) {
    if (activeItem) {
        e.preventDefault();
        const scale = currentScale;
        const containerRect = document.getElementById('board-world').getBoundingClientRect();
        const mouseX = (e.clientX - containerRect.left) / scale;
        const mouseY = (e.clientY - containerRect.top) / scale;
        const newX = mouseX - dragOffsetX;
        const newY = mouseY - dragOffsetY;
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
        try {
            await fetch('/api/game?entity=investigation', {
                method: 'PUT',
                headers: getAuthHeaders(),
                body: JSON.stringify({ id, x, y })
            });
        } catch(e) { console.error(e); }
        document.removeEventListener("mouseup", itemDragEnd);
        document.removeEventListener("mousemove", itemDrag);
        activeItem = null;
    }
}

window.setLinkColor = function(color, btn) {
    currentLinkColor = color;
    document.querySelectorAll('.color-dot').forEach(d => d.classList.remove('active'));
    if(btn) btn.classList.add('active');
}

window.toggleLinkMode = function() {
    isLinking = !isLinking;
    const btn = document.getElementById('btn-link');
    const container = document.getElementById('board-viewport');
    if (isLinking) {
        container.classList.add('linking-mode');
        btn.style.background = currentLinkColor;
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
    const label = prompt("Label du lien (ex: TUEUR DE) ?", "") || "";
    try {
        const res = await fetch('/api/game?entity=investigation', {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({
                action: 'create_link',
                board_id: currentBoardId,
                from_id: fromId,
                to_id: toId,
                color: currentLinkColor,
                label: label
            })
        });
        if(!res.ok) throw new Error("Erreur serveur");
    } catch(e) { alert("Impossible de créer le lien"); }
}

function drawLines() {
    const svg = document.getElementById('connections-layer');
    svg.innerHTML = '';

    linksData.forEach((link) => {
        const el1 = document.getElementById(`node-${link.from_id}`);
        const el2 = document.getElementById(`node-${link.to_id}`);

        if (!el1 || !el2) return;

        const x1 = parseInt(el1.style.left) + el1.offsetWidth / 2;
        const y1 = parseInt(el1.style.top) + el1.offsetHeight / 2;
        const x2 = parseInt(el2.style.left) + el2.offsetWidth / 2;
        const y2 = parseInt(el2.style.top) + el2.offsetHeight / 2;

        const dist = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
        const curveAmount = Math.min(100, dist * 0.2);
        const cx = (x1 + x2) / 2;
        const cy = (y1 + y2) / 2 + curveAmount;

        const pathData = `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`;

        const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        group.classList.add('link-group');
        group.setAttribute('data-link-id', link.id);

        const editHandler = (e) => {
            e.preventDefault();
            e.stopPropagation();
            openLinkModal(link);
        };
        group.onclick = editHandler;
        group.oncontextmenu = editHandler;

        const hitbox = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        hitbox.setAttribute('d', pathData);
        hitbox.classList.add('link-hitbox');
        group.appendChild(hitbox);

        const visiblePath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        visiblePath.setAttribute('d', pathData);
        visiblePath.setAttribute('id', `path-${link.id}`);
        visiblePath.classList.add('connection-line');
        visiblePath.style.stroke = link.color || '#ff3333';
        group.appendChild(visiblePath);

        if (link.label) {
            const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            text.classList.add('link-label');
            text.setAttribute('dy', '-5');
            text.style.fill = link.color || '#fff';

            const textPath = document.createElementNS('http://www.w3.org/2000/svg', 'textPath');
            textPath.setAttribute('href', `#path-${link.id}`);
            textPath.setAttribute('startOffset', '50%');
            textPath.setAttribute('text-anchor', 'middle');
            textPath.textContent = link.label;

            text.appendChild(textPath);
            group.appendChild(text);
        }

        svg.appendChild(group);
    });
}

function openLinkModal(link) {
    editingLinkId = link.id;
    editingNodeId = null;

    const modal = document.getElementById('creation-modal');
    modal.classList.remove('hidden');
    document.querySelector('.modal-title').innerText = "MODIFIER LE LIEN";

    document.getElementById('group-img').style.display = 'none';
    document.querySelector('.type-selector').style.display = 'none';
    document.getElementById('inp-sub').parentElement.style.display = 'none';

    document.getElementById('inp-label').value = link.label || '';
    setLinkColor(link.color || '#ff3333', null);

    const confirmBtn = document.querySelector('.btn-confirm');
    confirmBtn.onclick = confirmEditLink;
    confirmBtn.innerText = "SAUVEGARDER";

    let delBtn = document.getElementById('btn-delete-link');
    if (!delBtn) {
        delBtn = document.createElement('button');
        delBtn.id = 'btn-delete-link';
        delBtn.className = 'btn-cancel';
        delBtn.style.borderColor = 'var(--danger)';
        delBtn.style.color = 'var(--danger)';
        delBtn.innerText = "SUPPRIMER LE LIEN";
        document.querySelector('.modal-actions').prepend(delBtn);
    }
    delBtn.style.display = 'block';
    delBtn.onclick = () => deleteLink(link.id);
}

window.closeModal = function() {
    document.getElementById('creation-modal').classList.add('hidden');
    editingNodeId = null;
    editingLinkId = null;
    document.querySelector('.modal-title').innerText = "NOUVEL ÉLÉMENT";

    document.getElementById('group-img').style.display = 'block';
    document.querySelector('.type-selector').style.display = 'flex';
    document.getElementById('inp-sub').parentElement.style.display = 'block';

    const delBtn = document.getElementById('btn-delete-link');
    if(delBtn) delBtn.style.display = 'none';

    const confirmBtn = document.querySelector('.btn-confirm');
    confirmBtn.onclick = confirmCreateNode;
    confirmBtn.innerText = "CONFIRMER";
}

async function confirmEditLink() {
    if (!editingLinkId) return;
    const label = document.getElementById('inp-label').value;

    try {
        const res = await fetch('/api/game?entity=investigation', {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify({
                is_link: true,
                id: editingLinkId,
                label: label.toUpperCase(),
                color: currentLinkColor
            })
        });
        if (res.ok) closeModal();
        else alert("Erreur modification lien.");
    } catch (e) { alert("Erreur réseau."); }
}

async function deleteLink(id) {
    if (!confirm("Supprimer ce lien ?")) return;
    try {
        const res = await fetch('/api/game?entity=investigation', {
            method: 'DELETE',
            headers: getAuthHeaders(),
            body: JSON.stringify({ is_link: true, id: id })
        });
        if (res.ok) closeModal();
        else alert("Erreur suppression.");
    } catch (e) { alert("Erreur réseau."); }
}

let currentModalType = 'target';
window.createNode = function(type) {
    document.getElementById('creation-modal').classList.remove('hidden');
    document.getElementById('inp-label').value = '';
    document.getElementById('inp-sub').value = '';
    if (type === 'note') {
        document.getElementById('group-img').style.display = 'none';
        document.getElementById('inp-label').placeholder = "Titre de la note...";
        document.getElementById('inp-sub').placeholder = "Contenu...";
        document.getElementById('inp-sub').tagName === 'TEXTAREA' ? null : replaceInputWithTextarea();
    } else {
        document.getElementById('group-img').style.display = 'block';
        document.getElementById('inp-label').placeholder = "Nom du dossier...";
        document.getElementById('inp-sub').placeholder = "Info complémentaire...";
        resetInputToText();
    }
    setModalType(type);
}

function replaceInputWithTextarea() {
    const oldInput = document.getElementById('inp-sub');
    const textArea = document.createElement('textarea');
    textArea.id = 'inp-sub';
    textArea.placeholder = "Contenu de la note...";
    textArea.rows = 5;
    oldInput.parentNode.replaceChild(textArea, oldInput);
}

function resetInputToText() {
    const oldInput = document.getElementById('inp-sub');
    if (oldInput.tagName === 'TEXTAREA') {
        const input = document.createElement('input');
        input.type = 'text';
        input.id = 'inp-sub';
        input.placeholder = "Info complémentaire...";
        oldInput.parentNode.replaceChild(input, oldInput);
    }
}

window.setModalType = function(type) {
    currentModalType = type;
    document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
    const btn = document.getElementById(`btn-type-${type}`);
    if(btn) btn.classList.add('active');

    if(type === 'note') {
        document.getElementById('group-img').style.display = 'none';
        replaceInputWithTextarea();
    } else {
        document.getElementById('group-img').style.display = 'block';
        resetInputToText();
    }
}

window.confirmCreateNode = async function() {
    const label = document.getElementById('inp-label').value || 'INCONNU';
    const sub = document.getElementById('inp-sub').value;
    const img = document.getElementById('inp-img').value;

    if (editingNodeId) {
        const payload = {
            id: editingNodeId,
            label: label.toUpperCase(),
            sub_label: currentModalType === 'note' ? sub : (sub ? sub.toUpperCase() : ''),
            image_url: img,
            type: currentModalType
        };
        try {
            const res = await fetch('/api/game?entity=investigation', {
                method: 'PUT',
                headers: getAuthHeaders(),
                body: JSON.stringify(payload)
            });
            if (res.ok) closeModal();
            else alert("Erreur lors de la modification.");
        } catch(e) { alert("Erreur réseau."); }
        return;
    }

    const centerX = (window.innerWidth / 2 - panX - 90 * currentScale) / currentScale;
    const centerY = (window.innerHeight / 2 - panY - 100 * currentScale) / currentScale;

    const payload = {
        action: 'create_node',
        board_id: currentBoardId,
        type: currentModalType,
        label: label.toUpperCase(),
        sub_label: currentModalType === 'note' ? sub : (sub ? sub.toUpperCase() : ''),
        image_url: img,
        x: Math.floor(centerX),
        y: Math.floor(centerY)
    };

    try {
        const res = await fetch('/api/game?entity=investigation', {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(payload)
        });
        if (res.ok) {
            const newNode = await res.json();
            renderNode(newNode);
            closeModal();
        } else alert("Erreur lors de la création.");
    } catch(e) { alert("Erreur réseau."); }
}

window.deleteNode = async function(id, event) {
    event.stopPropagation();
    if(confirm("SUPPRIMER DÉFINITIVEMENT CE DOSSIER ?")) {
        try {
            const res = await fetch('/api/game?entity=investigation', {
                method: 'DELETE',
                headers: getAuthHeaders(),
                body: JSON.stringify({ id })
            });
            if(res.ok) {
                const el = document.getElementById(`node-${id}`);
                if(el) el.remove();
                linksData = linksData.filter(l => l.from_id !== id && l.to_id !== id);
                drawLines();
            } else alert("Erreur lors de la suppression.");
        } catch(e) { alert("Erreur réseau."); }
    }
}