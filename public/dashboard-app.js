// Aeternus — Core Interactive Logic

document.addEventListener('DOMContentLoaded', () => {
    // Menu Dropdown Toggle para Mobile/Clique
    const menuBtn = document.querySelector('.menu-btn');
    const menuContainer = document.querySelector('.menu-container');

    if (menuBtn && menuContainer) {
        menuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            menuContainer.classList.toggle('active');
        });

        document.addEventListener('click', () => {
            menuContainer.classList.remove('active');
        });
    }

    // Sistema de Notificações Toast
    window.showToast = function(message, type = 'info') {
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            container.style.cssText = 'position: fixed; bottom: 20px; right: 20px; z-index: 9999; display: flex; flex-direction: column; gap: 10px;';
            document.body.appendChild(container);
        }

        const toast = document.createElement('div');
        toast.style.cssText = `
            background: #191928;
            color: #fff;
            border-left: 4px solid ${type === 'success' ? '#10b981' : type === 'warning' ? '#f59e0b' : '#8b3dff'};
            padding: 12px 20px;
            border-radius: 8px;
            box-shadow: 0 10px 25px rgba(0,0,0,0.5);
            font-size: 0.9rem;
            animation: fadeIn 0.3s ease-in-out;
        `;
        toast.innerText = message;
        container.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transition = 'opacity 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    };
});

// ===== SISTEMA DE BRASAS / EMEBERS EM CANVAS =====
const canvas = document.getElementById('ember-canvas');
if (canvas) {
    const ctx = canvas.getContext('2d');
    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;

    window.addEventListener('resize', () => {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
    });

    class Ember {
        constructor() {
            this.reset();
        }

        reset() {
            this.x = Math.random() * width;
            this.y = height + Math.random() * 100;
            this.size = Math.random() * 2.5 + 1;
            this.speedY = Math.random() * 1.5 + 0.8; // Velocidade de subida
            this.speedX = Math.random() * 0.8 - 0.4;  // Oscilação lateral
            this.opacity = Math.random() * 0.8 + 0.2;
            this.maxHeight = height * (Math.random() * 0.4 + 0.1); // Altura que sobem antes de apagar
            // Cores quentes de brasa e místicas (Laranja, Vermelho, Violeta)
            const colors = ['#ff4500', '#ff7700', '#ff2200', '#a855f7', '#3b82f6'];
            this.color = colors[Math.floor(Math.random() * colors.length)];
        }

        update() {
            this.y -= this.speedY;
            this.x += this.speedX + Math.sin(this.y * 0.01) * 0.3; // Efeito de balanço no ar

            // Diminui a opacidade à medida que sobe
            if (this.y < height * 0.6) {
                this.opacity -= 0.005;
            }

            if (this.y <= this.maxHeight || this.opacity <= 0) {
                this.reset();
            }
        }

        draw() {
            ctx.save();
            ctx.globalAlpha = Math.max(0, this.opacity);
            ctx.fillStyle = this.color;
            ctx.shadowBlur = 10;
            ctx.shadowColor = this.color;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }

    const embers = [];
    const emberCount = 60; // Quantidade de partículas

    for (let i = 0; i < emberCount; i++) {
        embers.push(new Ember());
    }

    function animateEmbers() {
        ctx.clearRect(0, 0, width, height);
        embers.forEach(ember => {
            ember.update();
            ember.draw();
        });
        requestAnimationFrame(animateEmbers);
    }

    animateEmbers();
}
