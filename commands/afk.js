const { SlashCommandBuilder } = require('discord.js');
const afk = require('../utils/afk');

module.exports = {
    name: 'afk',
    description: 'Modo AFK',
    data: new SlashCommandBuilder()
        .setName('afk')
        .setDescription('Modo AFK')
        .addStringOption((o) => o.setName('motivo').setDescription('Motivo').setRequired(false)),

    async execute(message, args) {
        const reason = args.join(' ') || 'AFK';
        afk.set(message.author.id, reason);
        await message.reply(`💤 **${reason}**`);
    },

    async executeSlash(i) {
        const reason = i.options.getString('motivo') || 'AFK';
        afk.set(i.user.id, reason);
        await i.reply(`💤 **${reason}**`);
    }
};
