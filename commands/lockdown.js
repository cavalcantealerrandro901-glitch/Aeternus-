const { PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');

module.exports = {
    name: 'lockdown',
    aliases: ['bloqueio'],
    description: 'Bloquear canais de texto',
    data: new SlashCommandBuilder()
        .setName('bloqueio')
        .setDescription('Bloquear canais')
        .addStringOption((o) =>
            o
                .setName('modo')
                .setDescription('on ou off')
                .setRequired(true)
                .addChoices(
                    { name: 'Ativar', value: 'on' },
                    { name: 'Desativar', value: 'off' }
                )
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(message, args) {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply('❌ Só administradores.');
        }
        const mode = (args[0] || '').toLowerCase();
        if (!['on', 'off', 'ativar', 'desativar'].includes(mode)) {
            return message.reply('Uso: `O.lockdown on|off`');
        }
        const lock = mode === 'on' || mode === 'ativar';
        let n = 0;
        for (const ch of message.guild.channels.cache.values()) {
            if (!ch.isTextBased?.() || ch.isThread?.()) continue;
            try {
                await ch.permissionOverwrites.edit(message.guild.roles.everyone, {
                    SendMessages: lock ? false : null
                });
                n++;
            } catch (_) {}
        }
        await message.reply(lock ? `🔒 Bloqueio em **${n}** canais.` : `🔓 Bloqueio removido de **${n}** canais.`);
    },

    async executeSlash(i) {
        const lock = i.options.getString('modo', true) === 'on';
        let n = 0;
        for (const ch of i.guild.channels.cache.values()) {
            if (!ch.isTextBased?.() || ch.isThread?.()) continue;
            try {
                await ch.permissionOverwrites.edit(i.guild.roles.everyone, {
                    SendMessages: lock ? false : null
                });
                n++;
            } catch (_) {}
        }
        await i.reply(lock ? `🔒 Bloqueio em **${n}** canais.` : `🔓 Bloqueio removido de **${n}** canais.`);
    }
};
