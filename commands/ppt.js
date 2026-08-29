const { EmbedBuilder } = require('discord.js');
const cristais = require('../utils/cristais');
const { parseAmount } = require('../utils/parseAmount');
const OPTS = ['pedra', 'papel', 'tesoura'];
const WIN = { pedra: 'tesoura', papel: 'pedra', tesoura: 'papel' };

module.exports = {
    name: 'ppt',
    aliases: ['jokenpo', 'rps'],
    async execute(message, args) {
        const choice = (args[0] || '').toLowerCase();
        const amount = parseAmount(args[1]);
        if (!OPTS.includes(choice) || !amount) return message.reply('Uso: `O.ppt <pedra|papel|tesoura> <valor>`');
        if (cristais.get(message.author.id) < amount) return message.reply('💠 Insuficiente.');
        cristais.remove(message.author.id, amount);
        const bot = OPTS[Math.floor(Math.random() * 3)];
        let result = 'lose';
        if (choice === bot) result = 'empate';
        else if (WIN[choice] === bot) result = 'win';
        if (result === 'win') cristais.add(message.author.id, amount * 2);
        else if (result === 'empate') cristais.add(message.author.id, amount);
        await message.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(result === 'win' ? 0x34d399 : result === 'empate' ? 0xfbbf24 : 0xef4444)
                    .setTitle('✊ Pedra Papel Tesoura')
                    .setDescription(`Você **${choice}** · Bot **${bot}**\n${result === 'win' ? 'Vitória ×2' : result === 'empate' ? 'Empate' : 'Derrota'}`)
            ]
        });
    }
};
