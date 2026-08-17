document.addEventListener('DOMContentLoaded', () => {
    const snowContainer = document.createElement('div');
    snowContainer.style.position = 'fixed';
    snowContainer.style.top = '0';
    snowContainer.style.left = '0';
    snowContainer.style.width = '100%';
    snowContainer.style.height = '100%';
    snowContainer.style.pointerEvents = 'none';
    snowContainer.style.zIndex = '9999';
    document.body.appendChild(snowContainer);

    const snowflakesCount = 30;
    for (let i = 0; i < snowflakesCount; i++) {
        const flake = document.createElement('div');
        flake.innerHTML = '❄';
        flake.style.position = 'absolute';
        flake.style.color = 'rgba(56, 189, 248, 0.6)';
        // Aumentado o tamanho para 20px - 40px
        flake.style.fontSize = `${Math.random() * 20 + 20}px`;
        flake.style.top = `${Math.random() * -100}vh`;
        flake.style.left = `${Math.random() * 100}vw`;
        flake.style.opacity = Math.random();
        flake.style.animation = `fall ${Math.random() * 5 + 5}s linear infinite`;
        snowContainer.appendChild(flake);
    }

    const style = document.createElement('style');
    style.innerHTML = `
        @keyframes fall {
            0% { transform: translateY(0px) rotate(0deg); }
            100% { transform: translateY(105vh) rotate(360deg); }
        }
    `;
    document.head.appendChild(style);
});
