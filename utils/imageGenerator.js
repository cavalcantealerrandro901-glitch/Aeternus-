const Jimp = require('jimp');

module.exports = {
    async createDailyImage(guildIconUrl, botAvatarUrl) {
        const image = new Jimp(800, 400, '#1e1e1e');

        const defaultIcon = 'https://cdn.discordapp.com/embed/avatars/0.png';
        const guildImg = await Jimp.read(guildIconUrl || defaultIcon);
        const botImg = await Jimp.read(botAvatarUrl);

        guildImg.resize(200, 200);
        botImg.resize(200, 200);

        image.composite(guildImg, 100, 100);
        image.composite(botImg, 500, 100);

        const font = await Jimp.loadFont(Jimp.FONT_SANS_32_WHITE);
        image.print(font, 200, 40, 'Aeternus - Recompensa Diaria');

        return await image.getBufferAsync(Jimp.MIME_PNG);
    }
};
