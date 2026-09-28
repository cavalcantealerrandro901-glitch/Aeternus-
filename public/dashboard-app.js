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
