const { EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder, ChannelType } = require('discord.js');
const { setCountingNumber, getCountingStatus } = require('../systems/guildModules');

function buildStatusEmbed(st) {
    return new EmbedBuilder()
        .setColor(0x38bdf8)
        .setTitle('🔢 Contagem')
        .setDescription(
            [
                st.channelId ? `**Canal:** <#${st.channelId}>` : '**Canal:** _não configurado_',
                `**Atual (último válido):** \\`${st.current ?? 0}\\``,
                `**Próximo esperado:** **${st.next ?? 1}**`,
                st.enabled === false ? '\n⚠️ Contagem desativada no painel.' : '',
                '',
                '_Para alterar: `O.contagem <número>` — define o valor **atual**._'
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
                `**Antes:** \\`${before}\\` → **Agora:** \\`${current}\\``,
                `**Próximo no canal:** **${next}**`,
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
    if (a0 === 'reset' || a0 === 'zerar' || a0 === '0') {
        return { mode: 'set', value: 0 };
    }
    const n = parseInt(a0, 10);
    if (Number.isNaN(n) || n < 0) return { mode: 'invalid' };
    return { mode: 'set', value: n };
}

module.exports = {
    name: 'contagem',
    aliases: ['counting', 'setcount', 'contador'],
    description: 'Ver ou definir o número atual da contagem',
    data: new SlashCommandBuilder()
        .setName('alterar-contador')
        .setDescription('Ver ou alterar o número atual da contagem')
        .addIntegerOption((o) =>
            o
                .setName('numero')
                .setDescription('Número ATUAL da contagem (ex: 100 → próximo será 101)')
                .setRequired(false)
                .setMinValue(0)
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
                    'Use `O.contagem <número>` para definir o valor **atual** (ex: `O.contagem 100`).\n' +
                    'Use `O.contagem reset` para zerar.'
            );
        }

        if (!st.channelId) {
            return message.reply(
                '❌ Nenhum canal de contagem no painel. Configure o canal antes de alterar o número.'
            );
        }

        const before = Number(st.current ?? 0) || 0;
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

        if (n == null) {
            if (!st.channelId) {
                return i.reply({
                    content: 'Contagem sem canal. Configure no painel.',
                    ephemeral: true
                });
            }
            return i.reply({ embeds: [buildStatusEmbed(st)], ephemeral: true });
        }

        if (n < 0) {
            return i.reply({ content: '❌ Número inválido. Use ≥ 0.', ephemeral: true });
        }

        if (!st.channelId) {
            return i.reply({
                content: '❌ Nenhum canal de contagem no painel.',
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
