(function () {
    const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%^&*';

    function bootScreen() {
        const screen = document.getElementById('boot-screen');
        if (!screen) return;
        const text = screen.querySelector('.boot-text');
        const msgs = (screen.dataset.msgs || '').split('|').filter(Boolean);
        msgs.forEach((msg, i) => setTimeout(() => { if (text) text.textContent = msg; }, (i + 1) * 700));
        setTimeout(() => {
            screen.style.opacity = '0';
            setTimeout(() => screen.remove(), 500);
        }, (msgs.length + 1) * 700);
    }

    function card3D() {
        const card = document.getElementById('card');
        const wrap = document.querySelector('.id-card-container');
        if (!card || !wrap) return;
        wrap.addEventListener('mousemove', e => {
            const r = wrap.getBoundingClientRect();
            const rx = ((e.clientY - r.top - r.height / 2) / r.height) * -10;
            const ry = ((e.clientX - r.left - r.width / 2) / r.width) * 10;
            card.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg) scale(1.02)`;
        });
        wrap.addEventListener('mouseleave', () => {
            card.style.transform = 'rotateX(0) rotateY(0) scale(1)';
        });
    }

    function scramble() {
        document.querySelectorAll('.redacted').forEach(el => {
            el.textContent = el.dataset.scramble || '';
            el.addEventListener('mouseover', () => {
                const target = el.dataset.real;
                if (!target) return;
                let i = 0;
                const iv = setInterval(() => {
                    el.textContent = target.split('').map((c, idx) =>
                        idx < i ? target[idx] : CHARS[Math.floor(Math.random() * CHARS.length)]
                    ).join('');
                    if (i >= target.length) clearInterval(iv);
                    i += 0.5;
                }, 30);
            });
            el.addEventListener('mouseleave', () => {
                el.textContent = el.dataset.scramble || '';
            });
        });
    }

    document.addEventListener('DOMContentLoaded', () => {
        bootScreen();
        card3D();
        scramble();
    });
})();