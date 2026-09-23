const { EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');
const {
    setCountingNumber,
    getCountingStatus
} = require('../systems/guildModules');

function buildStatusEmbed(st) {
    return new EmbedBuilder()
        .setColor(0x38bdf8)
        .setTitle('🔢 Contagem')
        .setDescription(
            (st.channelId ? `Canal: <#${st.channelId}>\n` : 'Canal: _não configurado_\n') +
                `Atual (último válido): **${st.current ?? 0}**\n` +
                `Próximo esperado: **${st.next ?? 1}**` +
                (st.enabled === false ? '\n\n⚠️ Contagem desativada no painel.' : '')
        );
}

function buildUpdateEmbed({ admin, before, next, channelId }) {
    const after = Math.max(0, next - 1);
    return new EmbedBuilder()
        .setColor(0x22c55e)
        .setTitle('🔢 Contagem atualizada')
        .setDescription(
            `**Administrador:** ${admin}\n` +
                `**Antes:** \`${before}\` → **Depois:** \`${after}\`\n` +
                `**Próximo número a enviar no canal:** **${next}**` +
                (channelId ? `\n**Canal:** <#${channelId}>` : '') +
                `\n\n_Quem digitar **${next}** no canal de contagem continua a sequência._`
        )
        .setTimestamp();
}

module.exports = {
    name: 'contagem',
    aliases: ['counting', 'setcount', 'contador'],
    description: 'Ver ou definir o número da contagem',
    data: new SlashCommandBuilder()
        .setName('alterar-contador')
        .setDescription('Ver ou alterar o número da contagem')
        .addIntegerOption((o) =>
            o
                .setName('numero')
                .setDescription('Próximo número esperado no canal (ex: 100)')
                .setRequired(false)
                .setMinValue(1)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    async execute(message, args) {
        if (
            !message.member?.permissions?.has(PermissionFlagsBits.ManageGuild) &&
            !message.member?.permissions?.has(PermissionFlagsBits.Administrator)
        ) {
            return message.reply('❌ Sem permissão.');
        }

        const st = getCountingStatus(message.guild.id);

        if (!args[0]) {
            if (!st.channelId) {
                return message.reply('Contagem sem canal. Configure no painel.');
            }
            return message.reply({ embeds: [buildStatusEmbed(st)] });
        }

        const n = parseInt(args[0], 10);
        if (Number.isNaN(n) || n < 1) {
            return message.reply(
                '❌ Número inválido. Use um inteiro ≥ 1.\n' +
                    '_O valor é o **próximo** número que deve ser enviado no canal._'
            );
        }

        const before = Number(st.current ?? 0) || 0;
        const res = setCountingNumber(message.guild.id, n);

        if (!res?.ok) {
            return message.reply(`❌ ${res?.error || 'Falha ao atualizar.'}`);
        }

        // re-lê ao vivo para confirmar
        const afterSt = getCountingStatus(message.guild.id);
        const admin = message.member?.displayName || message.author.username;

        await message.reply({
            embeds: [
                buildUpdateEmbed({
                    admin: `${message.author} (\`${admin}\`)`,
                    before,
                    next: afterSt.next || res.next,
                    channelId: res.channelId || afterSt.channelId
                })
            ]
        });
    },

    async executeSlash(i) {
        const st = getCountingStatus(i.guild.id);
        const n = i.options.getInteger('numero');

        if (n == null) {
            if (!st.channelId) {
                return i.reply({
                    content: 'Contagem sem canal. Configure no painel.',
                    ephemeral: true
                });
            }
            return i.reply({ embeds: [buildStatusEmbed(st)], ephemeral: true });
        }

        if (n < 1) {
            return i.reply({
                content: '❌ Número inválido. Use um inteiro ≥ 1.',
                ephemeral: true
            });
        }

        const before = Number(st.current ?? 0) || 0;
        const res = setCountingNumber(i.guild.id, n);

        if (!res?.ok) {
            return i.reply({
                content: `❌ ${res?.error || 'Falha ao atualizar.'}`,
                ephemeral: true
            });
        }

        const afterSt = getCountingStatus(i.guild.id);
        const admin = i.member?.displayName || i.user.username;

        await i.reply({
            embeds: [
                buildUpdateEmbed({
                    admin: `${i.user} (\`${admin}\`)`,
                    before,
                    next: afterSt.next || res.next,
                    channelId: res.channelId || afterSt.channelId
                })
            ]
        });
    }
};
