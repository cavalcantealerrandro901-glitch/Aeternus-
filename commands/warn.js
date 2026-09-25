const { EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');
const store = require('../utils/store');

function loadWarns(guildId, userId) {
    const all = store.load('warns.json', {});
    const key = `${guildId}:${userId}`;
    return Array.isArray(all[key]) ? all[key] : [];
}

function saveWarns(guildId, userId, list) {
    const all = store.load('warns.json', {});
    all[`${guildId}:${userId}`] = list;
    store.save('warns.json', all);
}

function addWarn(guildId, userId, modId, reason) {
    const list = loadWarns(guildId, userId);
    list.push({ reason, modId, at: Date.now() });
    saveWarns(guildId, userId, list);
    return list.length;
}

module.exports = {
    name: 'warn',
    aliases: ['advertir'],
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
        const user = message.mentions.users.first();
        if (!user) return message.reply('❌ Mencione o membro.');
        const reason = args.slice(1).join(' ').trim() || 'Sem motivo';
        const total = addWarn(message.guild.id, user.id, message.author.id, reason);
        await message.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(0xfbbf24)
                    .setTitle('Warn')
                    .setDescription(`**${user.tag}**\n${reason}\nTotal: **${total}**`)
                    .setFooter({ text: `Mod: ${message.author.tag}` })
                    .setTimestamp()
            ]
        });
    },

    async executeSlash(i) {
        const user = i.options.getUser('usuario', true);
        const reason = i.options.getString('motivo') || 'Sem motivo';
        const total = addWarn(i.guild.id, user.id, i.user.id, reason);
        await i.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(0xfbbf24)
                    .setTitle('Warn')
                    .setDescription(`**${user.tag}**\n${reason}\nTotal: **${total}**`)
                    .setFooter({ text: `Mod: ${i.user.tag}` })
                    .setTimestamp()
            ]
        });
    },

    // export helpers for warns.js
    loadWarns,
    saveWarns
};
