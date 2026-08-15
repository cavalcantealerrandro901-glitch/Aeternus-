const Jimp = require('jimp');
const axios = require('axios');

module.exports = {
    async createDailyImage(guildIconUrl, botAvatarUrl) {
        const image = new Jimp(800, 400, '#1e1e1e');

        try {
            // Busca uma imagem aleatória da API
            const response = await axios.get('https://nekos.best/api/v2/neko');
            const animeUrl = response.data.results[0].url;
            
            const bgImg = await Jimp.read(animeUrl);
            bgImg.resize(800, 400);
            bgImg.opacity(0.3); // Fundo sutil
            image.composite(bgImg, 0, 0);
        } catch (e) {
            console.error("Erro ao buscar imagem da API:", e);
        }

        const defaultIcon = 'https://cdn.discordapp.com/embed/avatars/0.png';
        const guildImg = await Jimp.read(guildIconUrl || defaultIcon);
        const botImg = await Jimp.read(botAvatarUrl);

        guildImg.resize(120, 120);
        botImg.resize(120, 120);

        image.composite(guildImg, 150, 150);
        image.composite(botImg, 530, 150);

        const font = await Jimp.loadFont(Jimp.FONT_SANS_32_WHITE);
        image.print(font, 180, 50, 'Aeternus - Recompensa');

        return await image.getBufferAsync(Jimp.MIME_PNG);
    }
};
