const { EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');
const { getSettings } = require('../utils/settings');
const { setCountingNumber } = require('../systems/guildModules');

module.exports = {
    name: 'contagem',
    aliases: ['counting', 'setcount'],
    description: 'Definir número da contagem',
    data: new SlashCommandBuilder()
        .setName('alterar-contador')
        .setDescription('Alterar contador')
        .addIntegerOption((o) =>
            o.setName('numero').setDescription('Próximo número esperado').setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    async execute(message, args) {
        if (
            !message.member?.permissions?.has(PermissionFlagsBits.ManageGuild) &&
            !message.member?.permissions?.has(PermissionFlagsBits.Administrator)
        ) {
            return message.reply('❌ Sem permissão.');
        }
        const s = getSettings(message.guild.id);
        const ct = s.counting;
        if (!args[0]) {
            if (!ct?.enabled || !ct.channelId) {
                return message.reply('Contagem desativada. Ative no painel.');
            }
            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0x38bdf8)
                        .setTitle('Contagem')
                        .setDescription(
                            `Canal: <#${ct.channelId}>\nAtual: **${ct.current ?? 0}**\nPróximo: **${(ct.current ?? 0) + 1}**`
                        )
                ]
            });
        }
        const n = parseInt(args[0], 10);
        if (Number.isNaN(n) || n < 0) return message.reply('❌ Número inválido.');
        setCountingNumber(message.guild.id, n);
        await message.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(0x22c55e)
                    .setTitle('Contagem atualizada')
                    .setDescription(`Próximo número: **${n}**`)
            ]
        });
    },

    async executeSlash(i) {
        const s = getSettings(i.guild.id);
        const ct = s.counting;
        const n = i.options.getInteger('numero');
        if (n == null) {
            if (!ct?.enabled || !ct.channelId) {
                return i.reply({ content: 'Contagem desativada. Ative no painel.', ephemeral: true });
            }
            return i.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0x38bdf8)
                        .setTitle('Contagem')
                        .setDescription(
                            `Canal: <#${ct.channelId}>\nAtual: **${ct.current ?? 0}**\nPróximo: **${(ct.current ?? 0) + 1}**`
                        )
                ]
            });
        }
        if (n < 0) return i.reply({ content: '❌ Número inválido.', ephemeral: true });
        setCountingNumber(i.guild.id, n);
        await i.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(0x22c55e)
                    .setTitle('Contagem atualizada')
                    .setDescription(`Próximo número: **${n}**`)
            ]
        });
    }
};
