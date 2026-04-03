document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.line').forEach(l => l.remove());
    drawLines();
    window.addEventListener('resize', drawLines);
    fetchRanks();
});

function drawLines() {
    const old = document.getElementById('hier-svg');
    if (old) old.remove();

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.id = 'hier-svg';
    Object.assign(svg.style, {
        position: 'fixed', top: '0', left: '0',
        width: '100%', height: '100%',
        pointerEvents: 'none', zIndex: '1'
    });
    document.body.appendChild(svg);

    const director = document.querySelector('.rank-director');
    const lts = [...document.querySelectorAll('.rank-lt')];
    const soldiers = [...document.querySelectorAll('.rank-soldier')];

    if (!director) return;

    lts.forEach(lt => line(svg, director, lt, '#d4af37', 0.5));
    soldiers.forEach(s => {
        const nearest = lts.slice().sort((a, b) =>
            Math.abs(mid(a).x - mid(s).x) - Math.abs(mid(b).x - mid(s).x)
        )[0];
        if (nearest) line(svg, nearest, s, '#334455', 0.35);
    });
}

function mid(el) {
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

function line(svg, from, to, color, opacity) {
    const fr = from.getBoundingClientRect();
    const tr = to.getBoundingClientRect();
    const x1 = fr.left + fr.width / 2, y1 = fr.bottom;
    const x2 = tr.left + tr.width / 2, y2 = tr.top;
    const my = (y1 + y2) / 2;
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', `M${x1},${y1} C${x1},${my} ${x2},${my} ${x2},${y2}`);
    path.setAttribute('stroke', color);
    path.setAttribute('stroke-width', '1');
    path.setAttribute('stroke-dasharray', '6,4');
    path.setAttribute('fill', 'none');
    path.setAttribute('opacity', opacity);
    svg.appendChild(path);
}

async function fetchRanks() {
    const token = localStorage.getItem('sas_token');
    if (!token) return;
    try {
        const res = await fetch('/api/admin', { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) return;
        const agents = await res.json();

        document.querySelectorAll('.node-card').forEach(node => {
            const nameEl = node.querySelector('.node-name');
            if (!nameEl) return;
            const match = agents.find(a => a.username.toUpperCase() === nameEl.textContent.trim().toUpperCase());
            if (!match) return;

            const rankSpan = node.querySelector('.node-footer span:last-child');
            if (rankSpan) rankSpan.textContent = `LVL-${match.rank}`;

            node.classList.remove('rank-director', 'rank-lt', 'rank-soldier');
            if (match.rank >= 10) node.classList.add('rank-director');
            else if (match.rank >= 5) node.classList.add('rank-lt');
            else node.classList.add('rank-soldier');
        });

        setTimeout(drawLines, 100);
    } catch (_) {}
}