(function () {
    // Attend que Pusher soit dispo (chargé sur la page)
    function waitForPusher(cb) {
        if (typeof Pusher !== 'undefined') return cb();
        let tries = 0;
        const iv = setInterval(() => {
            if (typeof Pusher !== 'undefined') { clearInterval(iv); cb(); }
            if (++tries > 40) clearInterval(iv);
        }, 250);
    }

    // ── CSS injecté ──
    const style = document.createElement('style');
    style.textContent = `
        #sas-broadcast-banner {
            position: fixed;
            top: -120px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 99998;
            width: min(700px, 94vw);
            background: rgba(6, 10, 15, 0.97);
            border: 1px solid rgba(0,255,157,0.4);
            border-top: 3px solid #00ff9d;
            backdrop-filter: blur(12px);
            padding: 14px 20px 12px;
            font-family: 'Share Tech Mono', monospace;
            transition: top 0.45s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            box-shadow: 0 8px 40px rgba(0,0,0,0.8), 0 0 20px rgba(0,255,157,0.08);
        }
        #sas-broadcast-banner.show { top: 16px; }
        #sas-broadcast-banner.urgent {
            border-color: rgba(238,187,0,0.5);
            border-top-color: #eebb00;
            box-shadow: 0 8px 40px rgba(0,0,0,0.8), 0 0 20px rgba(238,187,0,0.1);
        }
        #sas-broadcast-banner.critical {
            border-color: rgba(255,51,51,0.5);
            border-top-color: #ff3333;
            box-shadow: 0 8px 40px rgba(0,0,0,0.8), 0 0 25px rgba(255,51,51,0.15);
            animation: critShake 0.4s ease;
        }
        @keyframes critShake {
            0%,100%{transform:translateX(-50%)}
            20%{transform:translateX(calc(-50% - 5px))}
            40%{transform:translateX(calc(-50% + 5px))}
            60%{transform:translateX(calc(-50% - 3px))}
            80%{transform:translateX(calc(-50% + 3px))}
        }
        .bcst-header {
            display: flex; align-items: center; gap: 10px;
            margin-bottom: 6px;
        }
        .bcst-tag {
            font-size: 0.58rem; letter-spacing: 3px; padding: 2px 8px;
            border: 1px solid; font-weight: bold;
        }
        .bcst-tag.normal   { color: #00ff9d; border-color: rgba(0,255,157,0.5); }
        .bcst-tag.urgent   { color: #eebb00; border-color: rgba(238,187,0,0.5); }
        .bcst-tag.critical { color: #ff3333; border-color: rgba(255,51,51,0.5); animation: blinkTag 0.8s infinite; }
        @keyframes blinkTag { 50%{opacity:0.4} }
        .bcst-sender {
            font-size: 0.65rem; color: #667788; letter-spacing: 2px;
        }
        .bcst-sender span { color: #fff; }
        .bcst-close {
            margin-left: auto; background: none; border: none;
            color: #445566; cursor: pointer; font-size: 1rem;
            padding: 0 4px; line-height: 1; transition: color 0.2s;
        }
        .bcst-close:hover { color: #fff; }
        .bcst-msg {
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.92rem; color: #eee;
            line-height: 1.5; letter-spacing: 0.5px;
        }
        .bcst-time {
            font-size: 0.6rem; color: #445566;
            margin-top: 6px; letter-spacing: 1px;
        }

        /* ── SEND UI ── */
        #sas-broadcast-btn {
            position: fixed; bottom: 24px; left: 24px; z-index: 99997;
            background: rgba(6,10,15,0.9);
            border: 1px solid rgba(0,255,157,0.3);
            color: rgba(0,255,157,0.65);
            width: 42px; height: 42px; border-radius: 50%;
            font-size: 16px; cursor: pointer;
            display: flex; align-items: center; justify-content: center;
            transition: all 0.2s;
            box-shadow: 0 4px 15px rgba(0,0,0,0.5);
            font-family: 'Share Tech Mono', monospace;
        }
        #sas-broadcast-btn:hover {
            border-color: rgba(0,255,157,0.7);
            color: #00ff9d;
            box-shadow: 0 0 12px rgba(0,255,157,0.2);
        }
        #sas-broadcast-btn.open {
            border-color: rgba(255,51,51,0.5);
            color: rgba(255,51,51,0.7);
        }

        #sas-broadcast-form {
            position: fixed; bottom: 78px; left: 24px; z-index: 99997;
            background: rgba(6,10,15,0.97);
            border: 1px solid rgba(0,255,157,0.3);
            width: min(380px, 90vw);
            padding: 16px;
            font-family: 'Share Tech Mono', monospace;
            box-shadow: 0 8px 30px rgba(0,0,0,0.7);
            transform-origin: bottom left;
            transform: scale(0.9);
            opacity: 0;
            pointer-events: none;
            transition: transform 0.2s ease, opacity 0.2s ease;
        }
        #sas-broadcast-form.open {
            transform: scale(1);
            opacity: 1;
            pointer-events: auto;
        }
        .bcst-form-title {
            font-size: 0.65rem; color: #00ff9d;
            letter-spacing: 3px; margin-bottom: 12px;
            border-bottom: 1px dashed rgba(0,255,157,0.2);
            padding-bottom: 8px;
        }
        .bcst-priority-row {
            display: flex; gap: 6px; margin-bottom: 10px;
        }
        .bcst-prio-btn {
            flex: 1; background: transparent; padding: 6px 4px;
            font-family: 'Share Tech Mono', monospace;
            font-size: 0.62rem; letter-spacing: 1px;
            cursor: pointer; transition: 0.2s; border: 1px solid #334;
            color: #667788;
        }
        .bcst-prio-btn.active.normal   { border-color: #00ff9d; color: #00ff9d; background: rgba(0,255,157,0.08); }
        .bcst-prio-btn.active.urgent   { border-color: #eebb00; color: #eebb00; background: rgba(238,187,0,0.08); }
        .bcst-prio-btn.active.critical { border-color: #ff3333; color: #ff3333; background: rgba(255,51,51,0.08); }
        #bcst-input {
            width: 100%; background: rgba(0,0,0,0.4);
            border: 1px solid rgba(255,255,255,0.1); color: #fff;
            padding: 10px; font-family: 'JetBrains Mono', monospace;
            font-size: 0.85rem; outline: none; resize: none;
            height: 72px; margin-bottom: 10px;
            transition: border-color 0.2s;
            box-sizing: border-box;
        }
        #bcst-input:focus { border-color: rgba(0,255,157,0.4); }
        .bcst-send-row {
            display: flex; justify-content: space-between; align-items: center;
        }
        .bcst-char { font-size: 0.6rem; color: #445566; }
        .bcst-char.warn { color: #eebb00; }
        #bcst-send {
            background: rgba(0,255,157,0.1);
            border: 1px solid rgba(0,255,157,0.4);
            color: #00ff9d; padding: 8px 18px;
            font-family: 'Share Tech Mono', monospace;
            font-size: 0.75rem; letter-spacing: 2px;
            cursor: pointer; transition: 0.2s;
        }
        #bcst-send:hover { background: #00ff9d; color: #000; }
        #bcst-send:disabled { opacity: 0.4; cursor: not-allowed; }
        #bcst-feedback {
            font-size: 0.65rem; margin-top: 8px;
            letter-spacing: 1px; min-height: 16px;
        }
    `;
    document.head.appendChild(style);

    // ── BANNER ──
    const banner = document.createElement('div');
    banner.id = 'sas-broadcast-banner';
    banner.innerHTML = `
        <div class="bcst-header">
            <span class="bcst-tag normal" id="bcst-tag">BROADCAST</span>
            <span class="bcst-sender">DE: <span id="bcst-sender-name">—</span></span>
            <button class="bcst-close" id="bcst-close">✖</button>
        </div>
        <div class="bcst-msg" id="bcst-msg">—</div>
        <div class="bcst-time" id="bcst-time">—</div>
    `;
    document.body.appendChild(banner);

    let bannerTimer = null;
    document.getElementById('bcst-close').addEventListener('click', hideBanner);

    function showBanner(data) {
        const tag   = document.getElementById('bcst-tag');
        const msg   = document.getElementById('bcst-msg');
        const sender = document.getElementById('bcst-sender-name');
        const time  = document.getElementById('bcst-time');

        const p = data.priority || 'normal';
        const labels = { normal: 'BROADCAST', urgent: '⚠ URGENT', critical: '🚨 CRITIQUE' };

        banner.className = p;
        tag.className    = `bcst-tag ${p}`;
        tag.textContent  = labels[p];
        msg.textContent  = data.message;
        sender.textContent = (data.sender || 'AGENT').toUpperCase();
        time.textContent = new Date(data.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

        banner.classList.add('show');
        clearTimeout(bannerTimer);

        const duration = p === 'critical' ? 12000 : p === 'urgent' ? 9000 : 6000;
        bannerTimer = setTimeout(hideBanner, duration);
    }

    function hideBanner() {
        banner.classList.remove('show');
    }

    // ── SEND FORM ──
    const session = JSON.parse(localStorage.getItem('sas_session') || '{}');
    const token   = localStorage.getItem('sas_token');

    // Seulement si connecté
    if (token && session.username && session.username === 'LoveLace') {
        const toggleBtn = document.createElement('button');
        toggleBtn.id    = 'sas-broadcast-btn';
        toggleBtn.title = 'Diffuser un message';
        toggleBtn.innerHTML = '📢';
        document.body.appendChild(toggleBtn);

        const form = document.createElement('div');
        form.id = 'sas-broadcast-form';
        form.innerHTML = `
            <div class="bcst-form-title">DIFFUSER UN MESSAGE</div>
            <div class="bcst-priority-row">
                <button class="bcst-prio-btn active normal" data-p="normal">NORMAL</button>
                <button class="bcst-prio-btn urgent"        data-p="urgent">URGENT</button>
                <button class="bcst-prio-btn critical"      data-p="critical">CRITIQUE</button>
            </div>
            <textarea id="bcst-input" placeholder="Message à diffuser à tous les agents..."></textarea>
            <div class="bcst-send-row">
                <span class="bcst-char" id="bcst-char">0 / 300</span>
                <button id="bcst-send">[ DIFFUSER ]</button>
            </div>
            <div id="bcst-feedback"></div>
        `;
        document.body.appendChild(form);

        let currentPriority = 'normal';
        let formOpen = false;

        toggleBtn.addEventListener('click', () => {
            formOpen = !formOpen;
            form.classList.toggle('open', formOpen);
            toggleBtn.classList.toggle('open', formOpen);
            if (formOpen) document.getElementById('bcst-input').focus();
        });

        // Priorité
        form.querySelectorAll('.bcst-prio-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                form.querySelectorAll('.bcst-prio-btn').forEach(b => b.classList.remove('active', 'normal', 'urgent', 'critical'));
                currentPriority = btn.dataset.p;
                btn.classList.add('active', currentPriority);
            });
        });

        // Compteur caractères
        const input = document.getElementById('bcst-input');
        const charEl = document.getElementById('bcst-char');
        input.addEventListener('input', () => {
            const len = input.value.length;
            charEl.textContent = `${len} / 300`;
            charEl.classList.toggle('warn', len > 250);
        });

        // Envoi
        document.getElementById('bcst-send').addEventListener('click', sendBroadcast);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) sendBroadcast();
        });

        async function sendBroadcast() {
            const msg      = input.value.trim();
            const feedback = document.getElementById('bcst-feedback');
            const sendBtn  = document.getElementById('bcst-send');

            if (!msg) return;

            sendBtn.disabled    = true;
            sendBtn.textContent = '[ ENVOI... ]';

            try {
                const res = await fetch('/api/broadcast', {
                    method:  'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ message: msg, priority: currentPriority })
                });

                if (res.ok) {
                    feedback.textContent = '✓ MESSAGE DIFFUSÉ';
                    feedback.style.color = '#00ff9d';
                    input.value          = '';
                    charEl.textContent   = '0 / 300';
                    setTimeout(() => {
                        feedback.textContent = '';
                        formOpen = false;
                        form.classList.remove('open');
                        toggleBtn.classList.remove('open');
                    }, 1800);
                } else {
                    const err = await res.json();
                    feedback.textContent = `✗ ${err.error}`;
                    feedback.style.color = '#ff3333';
                }
            } catch (e) {
                feedback.textContent = '✗ ERREUR RÉSEAU';
                feedback.style.color = '#ff3333';
            }

            sendBtn.disabled    = false;
            sendBtn.textContent = '[ DIFFUSER ]';
        }
    }

    // ── PUSHER — écoute sur toutes les pages ──
    waitForPusher(() => {
        const pusher  = new Pusher('51d51cc5bfc1c8ee90d4', { cluster: 'eu' });
        const channel = pusher.subscribe('sas-events');

        channel.bind('broadcast-message', (data) => {
            showBanner(data);
        });
    });

})();