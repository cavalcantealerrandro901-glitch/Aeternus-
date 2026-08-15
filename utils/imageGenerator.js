const { createCanvas, loadImage } = require('canvas');

module.exports = {
    async createDailyImage(guildIconUrl, botAvatarUrl) {
        const canvas = createCanvas(800, 400);
        const ctx = canvas.getContext('2d');

        // Fundo Sombrio
        ctx.fillStyle = '#1e1e1e';
        ctx.fillRect(0, 0, 800, 400);

        // Carregar imagens
        const guildImg = await loadImage(guildIconUrl || 'https://cdn.discordapp.com/embed/avatars/0.png');
        const botImg = await loadImage(botAvatarUrl);

        // Desenhar imagens
        ctx.drawImage(guildImg, 100, 100, 200, 200);
        ctx.drawImage(botImg, 500, 100, 200, 200);

        // Texto
        ctx.fillStyle = '#ffffff';
        ctx.font = '30px Arial';
        ctx.fillText('Aeternus - Recompensa Diária', 220, 50);

        return canvas.toBuffer();
    }
};
