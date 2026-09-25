const { EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');

function resolveMember(message, args) {
    const m = message.mentions.members.first();
    if (m) return m;
    const id = String(args[0] || '').replace(/\D/g, '');
    if (id) return message.guild.members.cache.get(id) || null;
    return null;
}

function reasonFrom(args, hasMention) {
    const start = hasMention || (args[0] && /^\d{15,}$/.test(args[0].replace(/\D/g, ''))) ? 1 : 1;
    const r = args.slice(start).join(' ').trim();
    return r || 'Sem motivo';
}

module.exports = {
    name: 'ban',
    aliases: ['banir'],
    description: 'Banir membro',
    data: new SlashCommandBuilder()
        .setName('banir-membro')
        .setDescription('Banir membro')
        .addUserOption((o) => o.setName('usuario').setDescription('Membro').setRequired(true))
        .addStringOption((o) => o.setName('motivo').setDescription('Motivo').setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

    async execute(message, args) {
        if (!message.member.permissions.has(PermissionFlagsBits.BanMembers)) {
            return message.reply('❌ Sem permissão.');
        }
        const member = resolveMember(message, args);
        if (!member) return message.reply('❌ Mencione o membro ou informe o ID.');
        if (member.id === message.author.id) return message.reply('❌ Você não pode se banir.');
        if (member.id === message.client.user.id) return message.reply('❌ Não posso me banir.');
        if (!member.bannable) return message.reply('❌ Não consigo banir este membro (cargo mais alto).');
        const reason = reasonFrom(args, !!message.mentions.members.first());
        try {
            await member.ban({ reason: `${reason} · por ${message.author.tag}` });
            await message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0xef4444)
                        .setTitle('Ban')
                        .setDescription(`**${member.user.tag}**\n${reason}`)
                        .setFooter({ text: `Mod: ${message.author.tag}` })
                        .setTimestamp()
                ]
            });
        } catch {
            await message.reply('❌ Não consegui banir.');
        }
    },

    async executeSlash(i) {
        const user = i.options.getUser('usuario', true);
        const reason = i.options.getString('motivo') || 'Sem motivo';
        const member = await i.guild.members.fetch(user.id).catch(() => null);
        if (!member) return i.reply({ content: '❌ Membro não encontrado.', ephemeral: true });
        if (!member.bannable) {
            return i.reply({ content: '❌ Não consigo banir este membro (cargo mais alto).', ephemeral: true });
        }
        try {
            await member.ban({ reason: `${reason} · por ${i.user.tag}` });
            await i.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0xef4444)
                        .setTitle('Ban')
                        .setDescription(`**${user.tag}**\n${reason}`)
                        .setFooter({ text: `Mod: ${i.user.tag}` })
                        .setTimestamp()
                ]
            });
        } catch {
            await i.reply({ content: '❌ Não consegui banir.', ephemeral: true });
        }
    }
};
