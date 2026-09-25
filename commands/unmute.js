const { EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');

function resolveMember(message, args) {
    const m = message.mentions.members.first();
    if (m) return m;
    const id = String(args[0] || '').replace(/\D/g, '');
    if (id) return message.guild.members.cache.get(id) || null;
    return null;
}

module.exports = {
    name: 'unmute',
    aliases: ['desilenciar'],
    description: 'Remover silêncio',
    data: new SlashCommandBuilder()
        .setName('desilenciar')
        .setDescription('Remover silêncio')
        .addUserOption((o) => o.setName('usuario').setDescription('Membro').setRequired(true))
        .addStringOption((o) => o.setName('motivo').setDescription('Motivo').setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    async execute(message, args) {
        if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
            return message.reply('❌ Sem permissão.');
        }
        const member = resolveMember(message, args);
        if (!member) return message.reply('❌ Mencione o membro ou informe o ID.');
        const reason = args.slice(1).join(' ').trim() || 'Sem motivo';
        try {
            await member.timeout(null, `${reason} · por ${message.author.tag}`);
            await message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0x22c55e)
                        .setTitle('Unmute')
                        .setDescription(`**${member.user.tag}**\n${reason}`)
                        .setFooter({ text: `Mod: ${message.author.tag}` })
                        .setTimestamp()
                ]
            });
        } catch {
            await message.reply('❌ Não consegui remover o silêncio.');
        }
    },

    async executeSlash(i) {
        const user = i.options.getUser('usuario', true);
        const reason = i.options.getString('motivo') || 'Sem motivo';
        const member = await i.guild.members.fetch(user.id).catch(() => null);
        if (!member) return i.reply({ content: '❌ Membro não encontrado.', ephemeral: true });
        try {
            await member.timeout(null, `${reason} · por ${i.user.tag}`);
            await i.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0x22c55e)
                        .setTitle('Unmute')
                        .setDescription(`**${user.tag}**\n${reason}`)
                        .setFooter({ text: `Mod: ${i.user.tag}` })
                        .setTimestamp()
                ]
            });
        } catch {
            await i.reply({ content: '❌ Não consegui remover o silêncio.', ephemeral: true });
        }
    }
};
