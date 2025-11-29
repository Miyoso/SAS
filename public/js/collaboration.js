/* public/js/collaboration.js */

// Nécessite la librairie pusher-js dans le HTML avant ce script
// <script src="https://js.pusher.com/8.2.0/pusher.min.js"></script>

const SAS_COLLAB = {
    pusher: null,
    channel: null,
    myId: null,
    cursors: {}, // Stocke les éléments DOM des autres curseurs

    init: function(username, color) {
        // 1. Connexion à Pusher
        this.pusher = new Pusher('51d51cc5bfc1c8ee90d4', {
            cluster: 'eu',
            // MODIFICATION : Point d'entrée consolidé pour l'auth Pusher
            authEndpoint: '/api/comms?type=pusher-auth',
            auth: {
                params: {
                    username: username,
                    color: color
                }
            }
        });

        // 2. Souscription au canal "presence-sas-ops"
        // Le préfixe "presence-" est OBLIGATOIRE pour voir qui est là
        this.channel = this.pusher.subscribe('presence-sas-ops');

        // 3. Événements
        this.channel.bind('pusher:subscription_succeeded', (members) => {
            this.myId = members.myID;
            console.log("CONNEXION TACTIQUE ÉTABLIE. AGENTS EN LIGNE : " + members.count);
        });

        this.channel.bind('pusher:member_added', (member) => {
            this.notify(`AGENT ${member.info.name} CONNECTÉ`, 'success');
        });

        this.channel.bind('pusher:member_removed', (member) => {
            this.removeCursor(member.id);
            this.notify(`AGENT ${member.info.name} DÉCONNECTÉ`, 'warning');
        });

        // Écouter les mouvements (client-cursor-move)
        this.channel.bind('client-cursor-move', (data) => {
            this.updateCursor(data.id, data.x, data.y, data.name, data.color);
        });

        // 4. Diffuser mes mouvements
        this.trackMyMouse();
    },

    trackMyMouse: function() {
        const board = document.getElementById('board-world') || document.body;
        let throttle = false;

        document.addEventListener('mousemove', (e) => {
            if (throttle) return;

            // Limiter l'envoi à toutes les 50ms pour ne pas saturer le quota gratuit
            throttle = true;
            setTimeout(() => throttle = false, 50);

            // Coordonnées relatives (%) pour que ça marche sur tous les écrans
            const x = (e.pageX / window.innerWidth) * 100;
            const y = (e.pageY / window.innerHeight) * 100;

            // Envoi direct aux autres clients (bypass le serveur pour la rapidité)
            this.channel.trigger('client-cursor-move', {
                id: this.myId,
                x: x,
                y: y,
                name: "Moi", // Le nom est déjà connu via presence, mais simple ici
                color: "#fff"
            });
        });
    },

    updateCursor: function(id, x, y, name, color) {
        if (id === this.myId) return; // Ignorer mon propre curseur

        let el = this.cursors[id];

        // Créer le curseur s'il n'existe pas
        if (!el) {
            el = document.createElement('div');
            el.className = 'remote-cursor';
            el.innerHTML = `
                <div class="cursor-pointer" style="border-color:${color}"></div>
                <div class="cursor-label" style="color:${color}">${name}</div>
            `;
            document.body.appendChild(el);
            this.cursors[id] = el;
        }

        // Mise à jour position
        el.style.left = x + '%';
        el.style.top = y + '%';
    },

    removeCursor: function(id) {
        if (this.cursors[id]) {
            this.cursors[id].remove();
            delete this.cursors[id];
        }
    },

    notify: function(msg, type) {
        // Optionnel : afficher un petit log en bas d'écran style terminal
        console.log(`[SYSTEM] ${msg}`);
    }
};

// CSS injecté pour les curseurs
const style = document.createElement('style');
style.textContent = `
    .remote-cursor {
        position: absolute; pointer-events: none; z-index: 9999;
        transition: top 0.1s linear, left 0.1s linear;
    }
    .cursor-pointer {
        width: 0; height: 0;
        border-left: 10px solid transparent;
        border-right: 10px solid transparent;
        border-bottom: 20px solid currentColor;
        transform: rotate(-45deg) translate(-5px, -5px);
    }
    .cursor-label {
        font-family: 'Share Tech Mono'; font-size: 10px;
        margin-left: 10px; text-shadow: 0 0 2px black; background: rgba(0,0,0,0.5);
    }
`;
document.head.appendChild(style);