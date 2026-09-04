const { SlashCommandBuilder } = require('discord.js');
const { rerollDrop } = require('../systems/drops');

module.exports = {
    name: 'reroll',
    data: new SlashCommandBuilder().setName('reroll').setDescription('Reroll de drop'),
    description: 'Sorteia de novo um drop',
    async execute(message, args) {
        const msgId = args[0];
        if (!msgId) return message.reply('Uso: O.reroll <id da mensagem do drop>');
        try {
            const result = await rerollDrop(message, msgId);
            if (result?.error) return message.reply(`❌ ${result.error}`);
            await message.reply(result?.text || '✅ Reroll feito.');
        } catch (e) {
            await message.reply(`❌ ${e.message}`);
        }
    },

    async executeSlash(interaction) {
        const args = [];
        try {
            const raw = interaction.options?.getString?.('args');
            if (raw) args.push(...String(raw).trim().split(/\s+/).filter(Boolean));
        } catch (_) {}
        const fake = {
            author: interaction.user,
            member: interaction.member,
            guild: interaction.guild,
            channel: interaction.channel,
            client: interaction.client,
            mentions: { users: { first: () => null }, members: { first: () => null } },
            reply: (p) => interaction.reply(p)
        };
        return module.exports.execute(fake, args, interaction.client);
    }
};
