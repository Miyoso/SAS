const SAS_NOTIFY = (() => {
    let pusher = null;

    const css = `
        #sas-toast-container {
            position: fixed; top: 80px; right: 20px; z-index: 99999;
            display: flex; flex-direction: column; gap: 10px;
            pointer-events: none; width: 340px;
        }
        .sas-toast {
            background: rgba(6,10,15,0.97); border: 1px solid rgba(255,255,255,0.08);
            border-left: 3px solid #00ff9d; padding: 14px 16px 10px;
            font-family: 'Share Tech Mono', monospace; font-size: 0.78rem; color: #fff;
            opacity: 0; transform: translateX(30px);
            transition: opacity 0.3s ease, transform 0.3s ease;
            pointer-events: auto; position: relative; overflow: hidden; cursor: pointer;
            backdrop-filter: blur(10px);
        }
        .sas-toast.show { opacity: 1; transform: translateX(0); }
        .sas-toast-danger  { border-left-color: #ff3333; }
        .sas-toast-warning { border-left-color: #eebb00; }
        .sas-toast-info    { border-left-color: #00f3ff; }
        .sas-toast-success { border-left-color: #00ff9d; }
        .sas-toast-lbl { font-size: 0.58rem; letter-spacing: 2px; opacity: 0.6; margin-bottom: 4px; }
        .sas-toast-progress {
            position: absolute; bottom: 0; left: 0; height: 2px; width: 100%;
            transform-origin: left; animation: toastShrink var(--dur, 5s) linear forwards;
        }
        @keyframes toastShrink { to { transform: scaleX(0); } }
    `;
    const styleEl = document.createElement('style');
    styleEl.textContent = css;
    document.head.appendChild(styleEl);

    function getContainer() {
        let c = document.getElementById('sas-toast-container');
        if (!c) { c = document.createElement('div'); c.id = 'sas-toast-container'; document.body.appendChild(c); }
        return c;
    }

    function show(label, message, type = 'info', duration = 5000) {
        const colors = { danger: '#ff3333', warning: '#eebb00', info: '#00f3ff', success: '#00ff9d' };
        const color = colors[type] || '#00ff9d';
        const toast = document.createElement('div');
        toast.className = `sas-toast sas-toast-${type}`;
        toast.innerHTML = `
            <div class="sas-toast-lbl">${label}</div>
            <div>${message}</div>
            <div class="sas-toast-progress" style="background:${color}; --dur:${duration}ms;"></div>
        `;
        toast.onclick = () => toast.remove();
        getContainer().appendChild(toast);
        requestAnimationFrame(() => requestAnimationFrame(() => toast.classList.add('show')));
        setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 350); }, duration);
    }

    function init(username) {
        if (typeof Pusher === 'undefined' || pusher) return;
        pusher = new Pusher('51d51cc5bfc1c8ee90d4', { cluster: 'eu' });
        const channel = pusher.subscribe('sas-events');

        channel.bind('warning-issued', data => {
            if (data.target?.toLowerCase() === username?.toLowerCase()) {
                show('⚠ AVERTISSEMENT REÇU', `Motif: ${data.reason}`, 'danger', 9000);
            } else {
                show('DISCIPLINE', `${data.target} — avertissement émis`, 'warning');
            }
        });

        channel.bind('mission-update', data => {
            show('MISSION UPDATE', `"${data.title}" → ${data.status}`, 'info');
        });

        channel.bind('new-activity', data => {
            if (typeof window._activityFeedUpdate === 'function') window._activityFeedUpdate(data);
        });
    }

    return { init, show };
})();