// ===== SISTEMA AUTOMÁTICO DE BRASAS / EMBERS PARA TODAS AS PÁGINAS =====
document.addEventListener('DOMContentLoaded', () => {
    // 1. Injeta o Canvas automaticamente se não existir
    let canvas = document.getElementById('global-ember-canvas');
    if (!canvas) {
        canvas = document.createElement('canvas');
        canvas.id = 'global-ember-canvas';
        document.body.prepend(canvas);
    }

    const ctx = canvas.getContext('2d');
    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;

    window.addEventListener('resize', () => {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
    });

    // 2. Classe das Partículas de Brasa
    class Ember {
        constructor() {
            this.reset();
        }

        reset() {
            this.x = Math.random() * width;
            this.y = height + Math.random() * 100;
            this.size = Math.random() * 2.5 + 1;
            this.speedY = Math.random() * 1.5 + 0.8; // Velocidade de subida
            this.speedX = Math.random() * 0.8 - 0.4;  // Oscilação suave
            this.opacity = Math.random() * 0.8 + 0.2;
            this.maxHeight = height * (Math.random() * 0.5 + 0.05); // Altura de subida
            
            // Cores de brasa mística (Laranja, Vermelho, Roxo, Azul)
            const colors = ['#ff4500', '#ff7700', '#ff2200', '#a855f7', '#3b82f6'];
            this.color = colors[Math.floor(Math.random() * colors.length)];
        }

        update() {
            this.y -= this.speedY;
            this.x += this.speedX + Math.sin(this.y * 0.01) * 0.3; // Efeito de balanço no ar

            // Desvanece à medida que sobe
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

    // 3. Inicializa as partículas
    const embers = [];
    const emberCount = 65; // Quantidade de brasas no ar

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
});
