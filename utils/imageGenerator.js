const Jimp = require('jimp');

module.exports = {
    async createDailyImage(guildIconUrl, botAvatarUrl) {
        // 1. Cria um fundo escuro 800x400 (cor hexadecimal convertida para formato do Jimp)
        const image = new Jimp(800, 400, '#1e1e1e');

        // 2. Carrega as imagens das URLs
        const defaultIcon = 'https://cdn.discordapp.com/embed/avatars/0.png';
        const guildImg = await Jimp.read(guildIconUrl || defaultIcon);
        const botImg = await Jimp.read(botAvatarUrl);

        // 3. Redimensiona as imagens para 200x200 pixels
        guildImg.resize(200, 200);
        botImg.resize(200, 200);

        // 4. Cola as imagens no fundo escuro nas posições (X, Y)
        image.composite(guildImg, 100, 100);
        image.composite(botImg, 500, 100);

        // 5. Carrega a fonte padrão do Jimp e escreve o texto
        const font = await Jimp.loadFont(Jimp.FONT_SANS_32_WHITE);
        image.print(font, 200, 40, 'Aeternus - Recompensa Diaria');

        // 6. Retorna a imagem como um Buffer PNG para o Discord
        return await image.getBufferAsync(Jimp.MIME_PNG);
    }
};
