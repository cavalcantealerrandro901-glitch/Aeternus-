const { EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');
const { setCountingNumber, getCountingStatus } = require('../systems/guildModules');

function buildStatusEmbed(st) {
    return new EmbedBuilder()
        .setColor(0x38bdf8)
        .setTitle('🔢 Contagem')
        .setDescription(
            [
                st.channelId ? `**Canal:** <#${st.channelId}>` : '**Canal:** _não configurado_',
                `**Último válido:** \`${st.current ?? 0}\``,
                `**Próximo esperado:** **${st.next ?? 1}**`,
                st.enabled === false ? '\n⚠️ Contagem desativada no painel.' : '',
                '',
                '_Para alterar: `O.contagem <número>` — define o **próximo número esperado**._'
            ]
                .filter(Boolean)
                .join('\n')
        );
}

function buildUpdateEmbed({ admin, before, current, next, channelId, wasDisabled }) {
    return new EmbedBuilder()
        .setColor(0x22c55e)
        .setTitle('🔢 Contagem atualizada')
        .setDescription(
            [
                `**Administrador:** ${admin}`,
                `**Próximo esperado:** **${next}**`,
                
                channelId ? `**Canal:** <#${channelId}>` : null,
                wasDisabled ? '\n✅ Contagem **reativada** automaticamente.' : null,
                '',
                `_Quem enviar **${next}** no canal continua a sequência._`
            ]
                .filter((x) => x != null)
                .join('\n')
        )
        .setTimestamp();
}

async function announceInCountChannel(guild, res, adminTag) {
    if (!res?.channelId || !guild) return;
    try {
        const ch = await guild.channels.fetch(res.channelId).catch(() => null);
        if (!ch?.isTextBased?.()) return;
        await ch
            .send({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0x38bdf8)
                        .setTitle('🔢 Contador ajustado')
                        .setDescription(
                            `Um administrador definiu o contador em **${res.current}**.\n` +
                                `Próximo número: **${res.next}**\n` +
                                (adminTag ? `_por ${adminTag}_` : '')
                        )
                        .setTimestamp()
                ]
            })
            .catch(() => {});
    } catch (_) {}
}

function parseTarget(args) {
    if (!args?.length) return { mode: 'status' };
    const a0 = String(args[0]).toLowerCase();
    if (a0 === 'reset' || a0 === 'zerar') {
        return { mode: 'set', value: 1 };
    }
    if (!/^(0|[1-9]\d*)$/.test(a0)) return { mode: 'invalid' };
    const n = Number(a0);
    if (!Number.isSafeInteger(n) || n > 1_000_000_000) return { mode: 'invalid' };
    return { mode: 'set', value: n };
}

module.exports = {
    name: 'contagem',
    aliases: ['counting', 'setcount', 'contador'],
    description: 'Ver ou definir o próximo número esperado da contagem',
    data: new SlashCommandBuilder()
        .setName('alterar-contador')
        .setDescription('Ver ou alterar o número atual da contagem')
        .addIntegerOption((o) =>
            o
                .setName('numero')
                .setDescription('Próximo número esperado (ex: 100 → próximo será 100)')
                .setRequired(false)
                .setMinValue(1)
                .setMaxValue(1_000_000_000)
        )
        .addBooleanOption((o) =>
            o.setName('zerar').setDescription('Reiniciar a contagem; o próximo número será 1')
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
        const parsed = parseTarget(args);

        if (parsed.mode === 'status') {
            if (!st.channelId) {
                return message.reply(
                    'Contagem sem canal configurado. Ative e escolha o canal no painel.'
                );
            }
            return message.reply({ embeds: [buildStatusEmbed(st)] });
        }

        if (parsed.mode === 'invalid') {
            return message.reply(
                '❌ Número inválido.\n' +
                    'Use `O.contagem <número>` para definir o próximo número esperado (ex: `O.contagem 100`).\n' +
                    'Use `O.contagem reset` para reiniciar em 1.'
            );
        }

        if (!st.channelId) {
            return message.reply(
                '❌ Nenhum canal de contagem no painel. Configure o canal antes de alterar o número.'
            );
        }

        const before = Number(st.next ?? 1) || 1;
        const res = setCountingNumber(message.guild.id, parsed.value);

        if (!res?.ok) {
            return message.reply(`❌ ${res?.error || 'Falha ao atualizar.'}`);
        }

        const afterSt = getCountingStatus(message.guild.id);
        const admin = message.member?.displayName || message.author.username;

        await message.reply({
            embeds: [
                buildUpdateEmbed({
                    admin: `${message.author} (\`${admin}\`)`,
                    before,
                    current: afterSt.current ?? res.current,
                    next: afterSt.next ?? res.next,
                    channelId: res.channelId || afterSt.channelId,
                    wasDisabled: res.wasDisabled
                })
            ]
        });

        await announceInCountChannel(
            message.guild,
            {
                channelId: res.channelId,
                current: afterSt.current ?? res.current,
                next: afterSt.next ?? res.next
            },
            String(message.author)
        );
    },

    async executeSlash(i) {
        if (
            !i.memberPermissions?.has(PermissionFlagsBits.ManageGuild) &&
            !i.memberPermissions?.has(PermissionFlagsBits.Administrator)
        ) {
            return i.reply({ content: '❌ Sem permissão.', ephemeral: true });
        }

        const st = getCountingStatus(i.guild.id);
        const n = i.options.getInteger('numero');
        const reset = i.options.getBoolean('zerar') === true;

        if (reset && n != null) {
            return i.reply({ content: '❌ Use `numero` ou `zerar`, não os dois ao mesmo tempo.', ephemeral: true });
        }

        if (n == null && !reset) {
            if (!st.channelId) {
                return i.reply({
                    content: 'Contagem sem canal. Configure no painel.',
                    ephemeral: true
                });
            }
            return i.reply({ embeds: [buildStatusEmbed(st)], ephemeral: true });
        }

        const target = reset ? 1 : n;
        if (!Number.isSafeInteger(target) || target < 0 || target > 1_000_000_000) {
            return i.reply({ content: '❌ Número inválido. Use um inteiro entre 1 e 1.000.000.000.', ephemeral: true });
        }

        if (!st.channelId) {
            return i.reply({
                content: '❌ Nenhum canal de contagem no painel.',
                ephemeral: true
            });
        }

        const before = Number(st.next ?? 1) || 1;
        const res = setCountingNumber(i.guild.id, target);

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
                    current: afterSt.current ?? res.current,
                    next: afterSt.next ?? res.next,
                    channelId: res.channelId || afterSt.channelId,
                    wasDisabled: res.wasDisabled
                })
            ]
        });

        await announceInCountChannel(
            i.guild,
            {
                channelId: res.channelId,
                current: afterSt.current ?? res.current,
                next: afterSt.next ?? res.next
            },
            String(i.user)
        );
    }
};
