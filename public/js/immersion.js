/* public/js/immersion.js */

const SAS_IMMERSION = {
    // Configuration des sons (utilise des URLs valides ou tes propres fichiers)
    sounds: {
        click: new Audio('https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3'), // Bruit mécanique sec
        hover: new Audio('https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3'), // Bip léger
        
        alert: new Audio('https://assets.mixkit.co/active_storage/sfx/995/995-preview.mp3') // Alarme (pour le mode rouge)
    },

    settings: {
        muted: localStorage.getItem('sas_muted') === 'true',
        theme: localStorage.getItem('sas_theme') || 'default'
    },

    init: function() {
        this.setupAudio();
        this.setupTheme();
        this.attachUIListeners();
        this.createControls(); // Ajoute les boutons à l'écran
    },

    setupAudio: function() {
        // Config Ambience
        this.sounds.ambience.loop = true;
        this.sounds.ambience.volume = 0.15; // Assez bas pour pas gêner

        // Config SFX
        this.sounds.hover.volume = 0.1;
        this.sounds.click.volume = 0.3;

        // Démarrer l'ambiance au premier clic (les navigateurs bloquent l'autoplay)
        document.body.addEventListener('click', () => {
            if (!this.settings.muted && this.sounds.ambience.paused) {
                this.sounds.ambience.play().catch(e => console.log("Audio autoplay bloqué"));
            }
        }, { once: true });
    },

    toggleMute: function() {
        this.settings.muted = !this.settings.muted;
        localStorage.setItem('sas_muted', this.settings.muted);

        if (this.settings.muted) {
            this.sounds.ambience.pause();
        } else {
            this.sounds.ambience.play();
        }
        this.updateButtonState();
    },

    playSFX: function(type) {
        if (this.settings.muted) return;

        // Rembobiner pour jouer rapidement si on spam
        const sound = this.sounds[type];
        sound.currentTime = 0;
        sound.play().catch(() => {});
    },

    setupTheme: function() {
        // Appliquer le thème sauvegardé
        document.body.classList.remove('theme-amber', 'theme-red');
        if (this.settings.theme !== 'default') {
            document.body.classList.add(`theme-${this.settings.theme}`);
        }
    },

    toggleTheme: function(mode) {
        // Mode: 'default', 'amber', 'red'
        this.settings.theme = mode;
        localStorage.setItem('sas_theme', mode);

        document.body.classList.remove('theme-amber', 'theme-red');
        if (mode !== 'default') {
            document.body.classList.add(`theme-${mode}`);
        }

        // Petit effet sonore spécial changement de mode
        this.playSFX('click');
    },

    attachUIListeners: function() {
        // Attacher les sons à TOUS les boutons et liens actuels et futurs
        document.addEventListener('mouseover', (e) => {
            if (e.target.matches('button, a, .tool-btn, input, select')) {
                this.playSFX('hover');
            }
        });

        document.addEventListener('mousedown', (e) => {
            if (e.target.matches('button, a, .tool-btn, .modal-close')) {
                this.playSFX('click');
            }
        });
    },

    createControls: function() {
        // Création dynamique du widget de contrôle en bas à gauche
        const div = document.createElement('div');
        div.id = 'sas-immersion-controls';
        div.innerHTML = `
            <div class="immersion-panel">
                <button id="btn-mute" title="Couper le son">🔊</button>
                <div class="theme-switch">
                    <button onclick="SAS_IMMERSION.toggleTheme('default')" class="dot-green" title="Standard"></button>
                    <button onclick="SAS_IMMERSION.toggleTheme('amber')" class="dot-amber" title="Vision Nocturne"></button>
                    <button onclick="SAS_IMMERSION.toggleTheme('red')" class="dot-red" title="Alerte"></button>
                </div>
            </div>
        `;
        document.body.appendChild(div);

        // Style rapide injecté en JS pour pas toucher au CSS si tu veux
        const style = document.createElement('style');
        style.textContent = `
            #sas-immersion-controls {
                position: fixed; bottom: 20px; left: 20px; z-index: 9999;
                font-family: 'Share Tech Mono', monospace;
            }
            .immersion-panel {
                display: flex; gap: 10px; align-items: center;
                background: rgba(0,0,0,0.8); padding: 8px;
                border: 1px solid var(--primary); border-radius: 4px;
            }
            #btn-mute { background: none; border: none; font-size: 1.2rem; cursor: pointer; color: var(--primary); }
            .theme-switch { display: flex; gap: 5px; }
            .theme-switch button {
                width: 12px; height: 12px; border-radius: 50%; border: 1px solid #fff; cursor: pointer; padding: 0;
            }
            .dot-green { background: #00ff9d; }
            .dot-amber { background: #ffb000; }
            .dot-red { background: #ff3333; }
            .theme-switch button:hover { transform: scale(1.2); }
        `;
        document.head.appendChild(style);

        // Logique bouton Mute
        document.getElementById('btn-mute').onclick = () => this.toggleMute();
        this.updateButtonState();
    },

    updateButtonState: function() {
        const btn = document.getElementById('btn-mute');
        if (btn) btn.textContent = this.settings.muted ? '🔇' : '🔊';
    }
};

// Lancer le script au chargement
document.addEventListener('DOMContentLoaded', () => SAS_IMMERSION.init());