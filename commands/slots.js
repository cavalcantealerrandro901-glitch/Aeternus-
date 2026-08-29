const { EmbedBuilder } = require('discord.js');
const cristais = require('../utils/cristais');
const { parseAmount } = require('../utils/parseAmount');
const SYM = ['🍒', '🍋', '🔔', '⭐', '💎', '7️⃣'];

module.exports = {
    name: 'slots',
    aliases: ['slot'],
    async execute(message, args) {
        const amount = parseAmount(args[0]);
        if (!amount) return message.reply('Uso: `O.slots <valor>`');
        if (cristais.get(message.author.id) < amount) return message.reply('💠 Insuficiente.');
        cristais.remove(message.author.id, amount);
        const a = SYM[Math.floor(Math.random() * SYM.length)];
        const b = SYM[Math.floor(Math.random() * SYM.length)];
        const c = SYM[Math.floor(Math.random() * SYM.length)];
        let mult = 0;
        if (a === b && b === c) mult = a === '7️⃣' ? 12 : a === '💎' ? 8 : 5;
        else if (a === b || b === c || a === c) mult = 1.5;
        const win = Math.floor(amount * mult);
        if (win) cristais.add(message.author.id, win);
        await message.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(win ? 0x34d399 : 0xef4444)
                    .setTitle('🎰 Slots')
                    .setDescription(`**[ ${a} | ${b} | ${c} ]**\n${win ? `+${cristais.formatPlain(win)}` : `-${cristais.formatPlain(amount)}`} cristais`)
            ]
        });
    }
};
