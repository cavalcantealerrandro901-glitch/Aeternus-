const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const eter = require('../utils/eter');
const store = require('../utils/store');

module.exports = {
    name: 'resgatar',
    data: new SlashCommandBuilder().setName('resgatar').setDescription('Resgatar codigo'),
    aliases: ['redeem', 'codigo', 'código'],
    async execute(message, args) {
        const code = (args[0] || '').toUpperCase();
        if (!code) return message.reply('Uso: O.resgatar <código>');
        const codes = store.load('codes.json', {});
        const entry = codes[code];
        if (!entry) return message.reply('❌ Código inválido.');
        if (entry.usedBy?.includes(message.author.id))
            return message.reply('❌ Você já resgatou este código.');
        if (entry.maxUses && (entry.usedBy?.length || 0) >= entry.maxUses)
            return message.reply('❌ Código esgotado.');
        const amount = entry.amount || 0;
        eter.add(message.author.id, amount, { reason: `code:${code}` });
        entry.usedBy = entry.usedBy || [];
        entry.usedBy.push(message.author.id);
        codes[code] = entry;
        store.save('codes.json', codes);
        await message.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(0x34d399)
                    .setTitle('Código resgatado')
                    .setDescription(`✨ **+${amount.toLocaleString('pt-BR')}**`)
            ]
        });
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
