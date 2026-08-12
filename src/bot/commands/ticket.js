const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    EmbedBuilder
} = require('discord.js');
const db = require('../../database/db');

async function handleClose(channel, user, member, guildId, reply) {
    if (!channel.topic || !channel.topic.startsWith('ticket-')) {
        return reply('⚠️ Este comando só funciona dentro de um ticket.');
    }

    const config = db.getGuildConfig(guildId);
    const tickets = config.tickets || {};
    const ownerId = channel.topic.replace('ticket-', '').split('|')[0];

    const isOwner = user.id === ownerId;
    const isStaff =
        member.permissions.has(PermissionFlagsBits.ManageChannels) ||
        (tickets.supportRole && member.roles.cache.has(tickets.supportRole));

    if (!isOwner && !isStaff) {
        return reply('Você não pode fechar este ticket.');
    }

    await reply('🔒 Ticket será fechado em 5 segundos...');
    setTimeout(async () => {
        try { await channel.delete('Ticket fechado via comando'); } catch {}
    }, 5000);
}

async function handleClaim(channel, user, member, guildId, reply) {
    if (!channel.topic || !channel.topic.startsWith('ticket-')) {
        return reply('⚠️ Este comando só funciona dentro de um ticket.');
    }

    const config = db.getGuildConfig(guildId);
    const tickets = config.tickets || {};

    const isStaff =
        member.permissions.has(PermissionFlagsBits.ManageChannels) ||
        (tickets.supportRole && member.roles.cache.has(tickets.supportRole));

    if (!isStaff) {
        return reply('Apenas a equipe de suporte pode reivindicar.');
    }

    if (channel.topic.includes('|claimed:')) {
        const claimedBy = channel.topic.split('|claimed:')[1];
        return reply(`Já reivindicado por <@${claimedBy}>.`);
    }

    const ownerId = channel.topic.replace('ticket-', '').split('|')[0];
    await channel.setTopic(`ticket-${ownerId}|claimed:${user.id}`);

    try {
        await channel.setName(
            `claimed-${user.username}`
                .slice(0, 90)
                .toLowerCase()
                .replace(/[^a-z0-9-]/g, '')
        );
    } catch {}

    const embed = new EmbedBuilder()
        .setColor(0x22c55e)
        .setDescription(`🙋 Ticket reivindicado por ${user}`)
        .setTimestamp();

    await reply({ embeds: [embed] });
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ticket')
        .setDescription('Gerenciar tickets de suporte')
        .addSubcommand(s => s.setName('fechar').setDescription('Fecha o ticket atual'))
        .addSubcommand(s => s.setName('reivindicar').setDescription('Reivindica o ticket atual')),

    // Aliases para prefixo: !ticket, !fecharticket, etc.
    aliases: ['tickets', 'fecharticket', 'reivindicarticket'],

    // ===== SLASH =====
    async execute(interaction) {
        const sub = interaction.options.getSubcommand();
        const reply = (payload) => {
            if (typeof payload === 'string') {
                return interaction.reply({ content: payload, ephemeral: true });
            }
            return interaction.reply(payload);
        };

        if (sub === 'fechar') {
            return handleClose(
                interaction.channel,
                interaction.user,
                interaction.member,
                interaction.guild.id,
                reply
            );
        }

        if (sub === 'reivindicar') {
            return handleClaim(
                interaction.channel,
                interaction.user,
                interaction.member,
                interaction.guild.id,
                reply
            );
        }
    },

    // ===== PREFIXO =====
    // !ticket fechar | !ticket reivindicar | !fecharticket | !reivindicarticket
    async executePrefix(message, args) {
        const reply = async (payload) => {
            if (typeof payload === 'string') return message.reply(payload);
            return message.reply(payload);
        };

        // Se o comando foi chamado pelo alias direto
        const raw = (message.content || '').toLowerCase();
        const prefix = (db.getGuildConfig(message.guild.id).prefix || '!').toLowerCase();
        const invoked = raw.slice(prefix.length).trim().split(/\s+/)[0];

        let action = (args[0] || '').toLowerCase();

        if (invoked === 'fecharticket' || action === 'fechar' || action === 'close') {
            action = 'fechar';
        } else if (invoked === 'reivindicarticket' || action === 'reivindicar' || action === 'claim') {
            action = 'reivindicar';
        }

        if (action === 'fechar') {
            return handleClose(message.channel, message.author, message.member, message.guild.id, reply);
        }

        if (action === 'reivindicar') {
            return handleClaim(message.channel, message.author, message.member, message.guild.id, reply);
        }

        return reply(
            'Uso:\n' +
            '`' + prefix + 'ticket fechar` — fecha o ticket\n' +
            '`' + prefix + 'ticket reivindicar` — reivindica o ticket\n' +
            '`' + prefix + 'fecharticket` / `' + prefix + 'reivindicarticket`'
        );
    }
};
