const { EmbedBuilder, SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const hierarchy = require('../utils/hierarchy');

function listText(guild) {
    return hierarchy.overview(guild).map((r) => {
        const limit = Number.isFinite(r.limit) ? r.limit : '∞';
        return `${r.icon} **${r.name}** — ${r.occupied}/${limit}`;
    }).join('\n');
}

function isManager(message) { return message.author.id === message.guild.ownerId || message.member.permissions.has(PermissionFlagsBits.ManageGuild); }

module.exports = {
    name: 'hierarquia',
    aliases: ['hierarchy', 'hier'],
    description: 'Gerencia a hierarquia de cargos da guilda.',
    data: new SlashCommandBuilder()
        .setName('hierarquia').setDescription('Gerencia a hierarquia de cargos da guilda.')
        .addSubcommand((s) => s.setName('ver').setDescription('Mostra a hierarquia e ocupação.'))
        .addSubcommand((s) => s.setName('configurar').setDescription('Cria e configura os cargos da hierarquia.'))
        .addSubcommand((s) => s.setName('promover').setDescription('Promove um membro.').addUserOption((o) => o.setName('usuario').setDescription('Membro').setRequired(true)))
        .addSubcommand((s) => s.setName('rebaixar').setDescription('Rebaixa um membro.').addUserOption((o) => o.setName('usuario').setDescription('Membro').setRequired(true))),

    async execute(message, args) {
        if (!message.guild) return message.reply('Este comando só pode ser usado em um servidor.');
        const action = String(args?.[0] || 'ver').toLowerCase();
        if (action === 'configurar' || action === 'config') {
            if (!isManager(message)) return message.reply('❌ Apenas o proprietário ou quem gerencia o servidor pode configurar a hierarquia.');
            const r = await hierarchy.ensureRoles(message.guild);
            if (!r.ok) return message.reply(`❌ ${r.error}`);
            return message.reply({ embeds: [new EmbedBuilder().setColor(0x8b5cf6).setTitle('👑 Hierarquia Aeternus configurada').setDescription(listText(message.guild)).setFooter({ text: 'O Mestre é atribuído automaticamente ao proprietário.' })] });
        }
        const member = message.mentions.members.first();
        if (action === 'promover' || action === 'promova') {
            if (!member) return message.reply('Use: `O.hierarquia promover @membro`');
            const r = await hierarchy.promote(member, message.member);
            return message.reply(r.ok ? `✅ ${member} agora é **${r.rank.icon} ${r.rank.name}**.` : `❌ ${r.error}`);
        }
        if (action === 'rebaixar' || action === 'rebaixe') {
            if (!member) return message.reply('Use: `O.hierarquia rebaixar @membro`');
            const r = await hierarchy.demote(member, message.member);
            return message.reply(r.ok ? `✅ ${member} agora é **${r.rank.icon} ${r.rank.name}**.` : `❌ ${r.error}`);
        }
        return message.reply({ embeds: [new EmbedBuilder().setColor(0x8b5cf6).setTitle('👑 Hierarquia da guilda').setDescription(listText(message.guild)).addFields({ name: 'Comandos', value: '`O.hierarquia configurar`\n`O.hierarquia promover @membro`\n`O.hierarquia rebaixar @membro`' })] });
    },

    async executeSlash(i) {
        if (!i.guild) return i.reply({ content: 'Este comando só pode ser usado em um servidor.', ephemeral: true });
        const action = i.options.getSubcommand();
        if (action === 'configurar') {
            if (i.user.id !== i.guild.ownerId && !i.member.permissions.has(PermissionFlagsBits.ManageGuild)) return i.reply({ content: '❌ Apenas o proprietário ou quem gerencia o servidor pode configurar a hierarquia.', ephemeral: true });
            const r = await hierarchy.ensureRoles(i.guild);
            if (!r.ok) return i.reply({ content: `❌ ${r.error}`, ephemeral: true });
        } else if (action === 'promover' || action === 'rebaixar') {
            const member = await i.guild.members.fetch(i.options.getUser('usuario').id).catch(() => null);
            if (!member) return i.reply({ content: 'Membro não encontrado.', ephemeral: true });
            const r = action === 'promover' ? await hierarchy.promote(member, i.member) : await hierarchy.demote(member, i.member);
            return i.reply(r.ok ? `✅ ${member} agora é **${r.rank.icon} ${r.rank.name}**.` : `❌ ${r.error}`);
        }
        return i.reply({ embeds: [new EmbedBuilder().setColor(0x8b5cf6).setTitle('👑 Hierarquia da guilda').setDescription(listText(i.guild))] });
    }
};