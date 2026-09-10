const { EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');
const { getSettings } = require('../utils/settings');
const { setCountingNumber } = require('../systems/guildModules');

function buildStatusEmbed(ct) {
    return new EmbedBuilder()
        .setColor(0x38bdf8)
        .setTitle('🔢 Contagem')
        .setDescription(
            `Canal: <#${ct.channelId}>\n` +
                `Atual: **${ct.current ?? 0}**\n` +
                `Próximo: **${(ct.current ?? 0) + 1}**`
        );
}

function buildUpdateEmbed({ admin, before, next, channelId }) {
    const after = Math.max(0, next - 1);
    return new EmbedBuilder()
        .setColor(0x22c55e)
        .setTitle('🔢 Contagem atualizada')
        .setDescription(
            `**Administrador:** ${admin}\n` +
                `**Antes:** \`${before}\`\n` +
                `**Depois:** \`${after}\`\n` +
                `**Próximo a usar:** **${next}**` +
                (channelId ? `\n**Canal:** <#${channelId}>` : '')
        )
        .setTimestamp();
}

module.exports = {
    name: 'contagem',
    aliases: ['counting', 'setcount'],
    description: 'Definir número da contagem',
    data: new SlashCommandBuilder()
        .setName('alterar-contador')
        .setDescription('Alterar o número da contagem')
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
            return message.reply({ embeds: [buildStatusEmbed(ct)] });
        }
        const n = parseInt(args[0], 10);
        if (Number.isNaN(n) || n < 1) return message.reply('❌ Número inválido. Use um inteiro ≥ 1.');
        const before = Number(ct?.current ?? 0) || 0;
        const res = setCountingNumber(message.guild.id, n);
        if (!res?.ok) return message.reply(`❌ ${res?.error || 'Falha ao atualizar.'}`);
        const admin = message.member?.displayName || message.author.username;
        await message.reply({
            embeds: [
                buildUpdateEmbed({
                    admin: `${message.author} (\`${admin}\`)`,
                    before,
                    next: res.next,
                    channelId: res.channelId
                })
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
            return i.reply({ embeds: [buildStatusEmbed(ct)], ephemeral: true });
        }
        if (n < 1) return i.reply({ content: '❌ Número inválido. Use um inteiro ≥ 1.', ephemeral: true });
        const before = Number(ct?.current ?? 0) || 0;
        const res = setCountingNumber(i.guild.id, n);
        if (!res?.ok) {
            return i.reply({ content: `❌ ${res?.error || 'Falha ao atualizar.'}`, ephemeral: true });
        }
        const admin = i.member?.displayName || i.user.username;
        await i.reply({
            embeds: [
                buildUpdateEmbed({
                    admin: `${i.user} (\`${admin}\`)`,
                    before,
                    next: res.next,
                    channelId: res.channelId
                })
            ]
        });
    }
};
