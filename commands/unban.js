const { EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');

module.exports = {
    name: 'unban',
    aliases: ['desbanir'],
    description: 'Desbanir usuário por ID',
    data: new SlashCommandBuilder()
        .setName('desbanir')
        .setDescription('Desbanir usuário')
        .addStringOption((o) => o.setName('id').setDescription('ID do usuário').setRequired(true))
        .addStringOption((o) => o.setName('motivo').setDescription('Motivo').setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

    async execute(message, args) {
        if (!message.member.permissions.has(PermissionFlagsBits.BanMembers)) {
            return message.reply('❌ Sem permissão.');
        }
        const id = String(args[0] || '').trim();
        if (!/^\d{15,20}$/.test(id)) return message.reply('❌ Informe um ID válido do Discord.');
        const reason = args.slice(1).join(' ').trim() || 'Sem motivo';
        try {
            await message.guild.members.unban(id, `${reason} · por ${message.author.tag}`);
            await message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0x22c55e)
                        .setTitle('🔓 AETERNUS • DESBANIMENTO CONCLUÍDO')
                        .setDescription(`**ID do usuário:** \`${id}\`\n**Motivo:** ${reason}`)
                        .setFooter({ text: 'Aeternus Moderation • Desbanimento' })
                        .setFooter({ text: `Mod: ${message.author.tag}` })
                        .setTimestamp()
                ]
            });
        } catch {
            await message.reply('❌ Não encontrei esse ban.');
        }
    },

    async executeSlash(i) {
        if (!i.memberPermissions?.has(PermissionFlagsBits.BanMembers)) return i.reply({ content: '❌ Sem permissão.', ephemeral: true });
        const id = String(i.options.getString('id', true)).trim();
        if (!/^\d{15,20}$/.test(id)) return i.reply({ content: '❌ Informe um ID válido do Discord.', ephemeral: true });
        const reason = i.options.getString('motivo') || 'Sem motivo';
        try {
            await i.guild.members.unban(id, `${reason} · por ${i.user.tag}`);
            await i.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0x22c55e)
                        .setTitle('Unban')
                        .setDescription(`**ID:** \`${id}\`\n${reason}`)
                        .setFooter({ text: `Mod: ${i.user.tag}` })
                        .setTimestamp()
                ]
            });
        } catch {
            await i.reply({ content: '❌ Não encontrei esse ban.', ephemeral: true });
        }
    }
};
