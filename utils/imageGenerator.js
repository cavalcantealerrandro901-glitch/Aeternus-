const Jimp = require('jimp');

// Lista de imagens de anime temáticas para o fundo
const animeBackgrounds = [
    'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&auto=format&fit=crop&q=60',
    'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=800&auto=format&fit=crop&q=60',
    'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800&auto=format&fit=crop&q=60',
    'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=60'
];

module.exports = {
    async createDailyImage(guildIconUrl, botAvatarUrl) {
        // Cria a base 800x400
        const image = new Jimp(800, 400, '#1e1e1e');

        try {
            // Seleciona um fundo de anime aleatório
            const randomBgUrl = animeBackgrounds[Math.floor(Math.random() * animeBackgrounds.length)];
            const bgImg = await Jimp.read(randomBgUrl);
            bgImg.resize(800, 400);
            bgImg.opacity(0.4); // Deixa o fundo levemente escuro/transparente
            image.composite(bgImg, 0, 0);
        } catch (e) {
            console.log("Erro ao carregar fundo de anime, usando cor sólida.");
        }

        // Carrega o ícone do servidor e o avatar do bot
        const defaultIcon = 'https://cdn.discordapp.com/embed/avatars/0.png';
        const guildImg = await Jimp.read(guildIconUrl || defaultIcon);
        const botImg = await Jimp.read(botAvatarUrl);

        // Redimensiona
        guildImg.resize(150, 150);
        botImg.resize(150, 150);

        // Insere na imagem principal
        image.composite(guildImg, 120, 125);
        image.composite(botImg, 530, 125);

        // Adiciona texto estilizado
        const font = await Jimp.loadFont(Jimp.FONT_SANS_32_WHITE);
        image.print(font, 180, 50, 'Aeternus - Recompensa Diaria');

        return await image.getBufferAsync(Jimp.MIME_PNG);
    }
};
