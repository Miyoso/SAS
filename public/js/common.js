/**
 * SAS MAINFRAME — Common UI Utilities v2.0
 * Partagé par toutes les pages
 */
const SAS_UI = (() => {

    /* ─── Transition de page ─────────────────────────────────────────── */

    function initPageTransition() {
        document.documentElement.style.opacity = '0';
        document.documentElement.style.transition = 'opacity 0.35s ease';
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                document.documentElement.style.opacity = '1';
            });
        });
    }

    function navigate(url, delay = 220) {
        document.documentElement.style.transition = 'opacity 0.2s ease';
        document.documentElement.style.opacity = '0';
        setTimeout(() => { window.location.href = url; }, delay);
    }

    /* ─── Horloge live ───────────────────────────────────────────────── */

    function startClock() {
        function tick() {
            const now = new Date();
            const hh  = String(now.getHours()).padStart(2, '0');
            const mm  = String(now.getMinutes()).padStart(2, '0');
            const ss  = String(now.getSeconds()).padStart(2, '0');
            const day = now.toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: '2-digit' })
                            .toUpperCase().replace('.', '');

            document.querySelectorAll('.sas-clock').forEach(el => {
                el.textContent = `${hh}:${mm}:${ss}`;
            });
            document.querySelectorAll('.sas-date').forEach(el => {
                el.textContent = day;
            });
        }
        tick();
        setInterval(tick, 1000);
    }

    /* ─── Temps relatif ─────────────────────────────────────────────── */

    function relativeTime(dateStr) {
        if (!dateStr) return '—';
        const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
        if (diff < 60)    return 'à l\'instant';
        if (diff < 3600)  return `il y a ${Math.floor(diff / 60)} min`;
        if (diff < 86400) return `il y a ${Math.floor(diff / 3600)} h`;
        if (diff < 604800)return `il y a ${Math.floor(diff / 86400)} j`;
        return new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
    }

    function formatDate(dateStr, opts = {}) {
        if (!dateStr) return '—';
        return new Date(dateStr).toLocaleDateString('fr-FR', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit',
            ...opts
        });
    }

    /* ─── Overlay raccourcis clavier ────────────────────────────────── */

    const SHORTCUTS = [
        { key: '1',   desc: 'Base Agents',       page: 'database.html' },
        { key: '2',   desc: 'Règlement',          page: 'reglement.html' },
        { key: '3',   desc: 'Carte Tactique',     page: 'map.html' },
        { key: '4',   desc: 'Rapports',           page: 'report.html' },
        { key: 'M',   desc: 'Messages / Comms',   page: 'messages.html' },
        { key: 'P',   desc: 'Profil Agent',       page: 'profile.html' },
        { key: '?',   desc: 'Aide raccourcis',    page: null },
        { key: 'ESC', desc: 'Fermer overlay',     page: null },
    ];

    function showShortcutsOverlay() {
        const existing = document.getElementById('sas-sc-overlay');
        if (existing) { existing.remove(); return; }

        const overlay = document.createElement('div');
        overlay.id = 'sas-sc-overlay';
        overlay.style.cssText = [
            'position:fixed', 'inset:0', 'z-index:99998',
            'display:flex', 'align-items:center', 'justify-content:center',
            'background:rgba(0,0,0,0.88)', 'backdrop-filter:blur(10px)',
            'animation:scFadeIn 0.2s ease',
        ].join(';');

        overlay.innerHTML = `
            <style>
                @keyframes scFadeIn { from{opacity:0;transform:scale(.96)} to{opacity:1;transform:scale(1)} }
                #sas-sc-box {
                    background: rgba(5,9,14,0.98);
                    border: 1px solid rgba(0,255,157,0.25);
                    box-shadow: 0 0 60px rgba(0,255,157,0.08), inset 0 0 30px rgba(0,0,0,0.5);
                    padding: 32px 44px; min-width: 380px;
                }
                #sas-sc-box h2 {
                    font-family: 'JetBrains Mono', monospace;
                    color: #00ff9d; font-size: 0.65rem; letter-spacing: 5px;
                    margin: 0 0 22px; text-align: center;
                    border-bottom: 1px dashed rgba(0,255,157,0.2); padding-bottom: 14px;
                }
                .sc-row {
                    display: flex; justify-content: space-between; align-items: center;
                    padding: 9px 0; border-bottom: 1px solid rgba(255,255,255,0.04);
                    font-family: 'Share Tech Mono', monospace;
                }
                .sc-key {
                    background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.12);
                    padding: 3px 11px; font-family: 'JetBrains Mono', monospace;
                    font-size: 0.72rem; color: #00ff9d; min-width: 42px; text-align: center;
                    letter-spacing: 1px;
                }
                .sc-desc { color: #778899; font-size: 0.78rem; margin-left: 16px; }
                .sc-close {
                    display: block; margin-top: 22px; text-align: center;
                    font-family: 'Share Tech Mono', monospace; font-size: 0.65rem;
                    color: #445566; letter-spacing: 2px; cursor: pointer;
                    transition: color 0.2s;
                }
                .sc-close:hover { color: #00ff9d; }
            </style>
            <div id="sas-sc-box">
                <h2>— RACCOURCIS CLAVIER —</h2>
                ${SHORTCUTS.map(s => `
                    <div class="sc-row">
                        <span class="sc-key">${s.key}</span>
                        <span class="sc-desc">${s.desc}</span>
                    </div>
                `).join('')}
                <span class="sc-close" onclick="document.getElementById('sas-sc-overlay').remove()">
                    [ FERMER ]
                </span>
            </div>
        `;

        overlay.addEventListener('click', e => {
            if (e.target === overlay) overlay.remove();
        });
        document.body.appendChild(overlay);
    }

    /* ─── Squelette de chargement ────────────────────────────────────── */

    function skeletonHTML(lines = 3) {
        return Array.from({ length: lines }, (_, i) => `
            <div class="sas-skeleton" style="width:${55 + Math.random() * 35}%; animation-delay:${i * 0.12}s"></div>
        `).join('');
    }

    /* ─── Écouteurs globaux ──────────────────────────────────────────── */

    function _initKeyboard() {
        document.addEventListener('keydown', e => {
            const active = document.activeElement;
            const inInput = active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable);
            if (inInput) return;

            // Raccourci ? → overlay
            if (e.key === '?' || (e.key === '/' && e.shiftKey)) {
                showShortcutsOverlay();
            }
            // ESC → fermer overlay
            if (e.key === 'Escape') {
                const overlay = document.getElementById('sas-sc-overlay');
                if (overlay) overlay.remove();
            }
            // M → Messages
            if (e.key.toLowerCase() === 'm' && document.body.classList.contains('logged-in')) {
                navigate('messages.html');
            }
            // P → Profil
            if (e.key.toLowerCase() === 'p' && document.body.classList.contains('logged-in')) {
                navigate('profile.html');
            }
        });
    }

    /* ─── Hint raccourcis (coin bas gauche) ──────────────────────────── */

    function injectShortcutHint() {
        if (document.getElementById('sas-hint-bar')) return;
        const hint = document.createElement('div');
        hint.id = 'sas-hint-bar';
        hint.style.cssText = [
            'position:fixed', 'bottom:14px', 'left:50%',
            'transform:translateX(-50%)',
            'font-family:"Share Tech Mono",monospace', 'font-size:0.6rem',
            'color:#334455', 'letter-spacing:2px', 'z-index:90',
            'pointer-events:none', 'white-space:nowrap',
            'transition:opacity 0.3s'
        ].join(';');
        hint.innerHTML = 'APPUYEZ SUR <span style="color:#00ff9d;border:1px solid rgba(0,255,157,0.3);padding:1px 6px">?</span> POUR LES RACCOURCIS';
        document.body.appendChild(hint);
        // Fade out after 4 seconds
        setTimeout(() => { hint.style.opacity = '0'; }, 4000);
        setTimeout(() => { hint.remove(); }, 4500);
    }

    /* ─── Init automatique ───────────────────────────────────────────── */

    document.addEventListener('DOMContentLoaded', () => {
        initPageTransition();
        startClock();
        _initKeyboard();
        // Afficher le hint après 1.5s
        setTimeout(injectShortcutHint, 1500);
    });

    /* ─── API publique ────────────────────────────────────────────────── */
    return {
        navigate,
        startClock,
        relativeTime,
        formatDate,
        showShortcutsOverlay,
        skeletonHTML,
    };
})();
