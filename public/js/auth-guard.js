const SAS_AUTH = (() => {

    /* ─── Lecture de session ─────────────────────────────────────────── */

    function getSession() {
        try {
            const raw = localStorage.getItem('sas_session');
            return raw ? JSON.parse(raw) : null;
        } catch {
            return null;
        }
    }

    function getToken() {
        return localStorage.getItem('sas_token') || null;
    }

    function getLevel() {
        const s = getSession();
        return s ? parseInt(s.rank) || 0 : 0;
    }

    function getUsername() {
        const s = getSession();
        return s ? s.username : null;
    }

    function isLoggedIn() {
        return getSession() !== null && getToken() !== null;
    }

    /* ─── Redirections ───────────────────────────────────────────────── */

    function _redirect(reason, minLevel) {
        const params = new URLSearchParams({
            from: window.location.pathname,
            reason: reason,
            required: minLevel !== null && minLevel !== undefined ? minLevel : ''
        });
        window.location.replace('/access-denied.html?' + params.toString());
    }

    /* ─── Gardes (appelés en haut de chaque page) ────────────────────── */

    /**
     * Vérifie que l'utilisateur est connecté ET que son rang >= minLevel.
     * Redirige vers access-denied.html sinon.
     * @param {number} minLevel  Rang minimum requis (1 = tout le monde, 10 = admin)
     */
    function guard(minLevel = 1) {
        if (!isLoggedIn()) {
            _redirect('NOT_LOGGED_IN', minLevel);
            return false;
        }
        const level = getLevel();
        if (level < minLevel) {
            _redirect('INSUFFICIENT_RANK', minLevel);
            return false;
        }
        return true;
    }

    /**
     * Vérifie que le nom d'utilisateur est dans une liste blanche.
     * Utile pour des pages de dossiers spécifiques (ex: agent-Graves).
     * @param {string[]} allowedUsernames  Noms autorisés (casse insensible)
     * @param {number}   fallbackLevel     Rang alternatif qui donne aussi accès
     * @param {function} trapFn            Fonction optionnelle déclenchée si rejet (ex: security trap)
     */
    function guardUsers(allowedUsernames, fallbackLevel = 99, trapFn = null) {
        if (!isLoggedIn()) {
            _redirect('NOT_LOGGED_IN', null);
            return false;
        }
        const username = getUsername()?.toLowerCase() || '';
        const allowed = allowedUsernames.map(u => u.toLowerCase());
        const level   = getLevel();

        if (allowed.includes(username) || level >= fallbackLevel) {
            return true;
        }

        if (typeof trapFn === 'function') {
            trapFn(username);
        } else {
            _redirect('ACCESS_RESTRICTED', null);
        }
        return false;
    }

    /* ─── Badge d'accréditation (DOM helper) ────────────────────────── */

    /**
     * Injecte un petit HUD dans le coin supérieur droit indiquant
     * l'agent connecté et son niveau. Appeler après guard().
     * @param {object} opts  { color } — couleur de bordure CSS custom
     */
    function injectHUD(opts = {}) {
        if (document.getElementById('sas-auth-hud')) return;

        const s = getSession();
        if (!s) return;

        const color = opts.color || '#00ff9d';
        const level = getLevel();

        const hud = document.createElement('div');
        hud.id = 'sas-auth-hud';
        hud.style.cssText = `
            position: fixed; top: 20px; right: 30px; z-index: 10000;
            background: rgba(10,14,18,.92); border: 1px solid #334455;
            border-left: 3px solid ${color}; padding: 8px 14px;
            font-family: 'Share Tech Mono', monospace; font-size: .8rem;
            color: #fff; display: flex; gap: 12px; align-items: center;
            backdrop-filter: blur(6px); pointer-events: none;
        `;

        const rankColor = level >= 10 ? '#ff3333'
                        : level >= 5  ? '#eebb00'
                        : level >= 3  ? '#00f3ff'
                        : '#00ff9d';

        const safeUsername = (s.username || 'INCONNU').toUpperCase();
        const safeRank = s.rank || '0';

        hud.innerHTML = `
            <span style="color:#667788">AGENT:</span>
            <span style="font-weight:bold">${safeUsername}</span>
            <span style="color:#334455">|</span>
            <span style="color:#667788">CLEARANCE:</span>
            <span style="color:${rankColor}; font-weight:bold">LVL-${safeRank}</span>
        `;
        document.body.appendChild(hud);
    }

    /* ─── Vérification de niveau sans redirection ─────────────────────── */

    /**
     * Renvoie true/false sans redirection — utile pour afficher/masquer
     * des sections HTML selon l'accréditation.
     */
    function can(minLevel) {
        return isLoggedIn() && getLevel() >= minLevel;
    }

    /* ─── API publique ────────────────────────────────────────────────── */

    return {
        getSession,
        getToken,
        getLevel,
        getUsername,
        isLoggedIn,
        guard,
        guardUsers,
        injectHUD,
        can
    };
})();