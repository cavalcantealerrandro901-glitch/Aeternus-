const { EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');
const store = require('../utils/store');

module.exports = {
    name: 'warn',
    aliases: ['advertir', 'aviso'],
    description: 'Advertir membro',
    data: new SlashCommandBuilder()
        .setName('advertir')
        .setDescription('Advertir membro')
        .addUserOption((o) => o.setName('usuario').setDescription('Membro').setRequired(true))
        .addStringOption((o) => o.setName('motivo').setDescription('Motivo').setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    async execute(message, args) {
        if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
            return message.reply('❌ Sem permissão.');
        }
        const member = message.mentions.members.first();
        if (!member) return message.reply('❌ Mencione o membro.');
        const reason = args.slice(1).join(' ') || 'Sem motivo';
        const key = `warns_${message.guild.id}`;
        const data = store.load(key, {});
        if (!data[member.id]) data[member.id] = [];
        data[member.id].push({ reason, at: Date.now(), by: message.author.id });
        store.save(key, data);
        await message.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(0xf59e0b)
                    .setTitle('Advertência')
                    .setDescription(`**${member.user.tag}**\n${reason}\nTotal: **${data[member.id].length}**`)
            ]
        });
    },

    async executeSlash(i) {
        const user = i.options.getUser('usuario', true);
        const reason = i.options.getString('motivo') || 'Sem motivo';
        const key = `warns_${i.guild.id}`;
        const data = store.load(key, {});
        if (!data[user.id]) data[user.id] = [];
        data[user.id].push({ reason, at: Date.now(), by: i.user.id });
        store.save(key, data);
        await i.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(0xf59e0b)
                    .setTitle('Advertência')
                    .setDescription(`**${user.tag}**\n${reason}\nTotal: **${data[user.id].length}**`)
            ]
        });
    }
};
