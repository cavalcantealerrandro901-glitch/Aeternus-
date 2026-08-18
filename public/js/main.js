document.addEventListener('DOMContentLoaded', async () => {
    try {
        const response = await fetch('/api/bot-info');
        const bot = await response.json();

        if (bot.error) return;

        // Preenche o avatar do bot
        const avatarImg = document.querySelector('.circle-avatar, .bot-avatar, .avatar img, img');
        if (avatarImg && bot.avatar) {
            avatarImg.src = bot.avatar;
        }

        // Configura o botão "Adicionar ao Servidor"
        const addBtn = document.querySelectorAll('a, button');
        addBtn.forEach(btn => {
            if (btn.textContent.includes('Adicionar')) {
                btn.onclick = () => window.open(bot.inviteUrl, '_blank');
            }
        });
    } catch (err) {
        console.error('Erro ao carregar dados da Home:', err);
    }
});
