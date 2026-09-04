const { SlashCommandBuilder } = require('discord.js');
const afk = require('../utils/afk');

module.exports = {
    name: 'afk',
    aliases: ['ausente'],
    description: 'Modo ausente',
    data: new SlashCommandBuilder()
        .setName('ausente')
        .setDescription('Modo ausente')
        .addStringOption((o) =>
            o.setName('motivo').setDescription('Motivo').setRequired(false)
        ),

    async execute(message, args) {
        const reason = args.join(' ') || 'AFK';
        afk.set(message.author.id, reason);
        await message.reply(`💤 AFK: **${reason}**`);
    },

    async executeSlash(i) {
        const reason = i.options.getString('motivo') || 'AFK';
        afk.set(i.user.id, reason);
        await i.reply(`💤 AFK: **${reason}**`);
    }
};
