const { PermissionFlagsBits, EmbedBuilder, SlashCommandBuilder } = require('discord.js');
module.exports = {
    name: 'embed',
    data: new SlashCommandBuilder().setName('embed').setDescription('Criar embed'),
    description: 'Cria um embed rápido',
    async execute(message, args) {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages))
            return message.reply('❌ Sem permissão.');
        const text = args.join(' ');
        if (!text) return message.reply('Uso: título | descrição | cor(hex opcional)');
        const [title, desc, color] = text.split('|').map((s) => s.trim());
        await message.delete().catch(() => {});
        await message.channel.send({
            embeds: [
                new EmbedBuilder()
                    .setColor(color && /^#?[0-9a-fA-F]{6}$/.test(color) ? parseInt(color.replace('#', ''), 16) : 0xa78bfa)
                    .setTitle(title || 'Embed')
                    .setDescription(desc || '—')
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
            mentions: {
                users: { first: () => interaction.options?.getUser?.('usuario') || null },
                members: { first: () => null }
            },
            reply: (p) => interaction.reply(p),
            delete: async () => {}
        };
        return module.exports.execute(fake, args, interaction.client);
    }
};
