const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { getSettings } = require('../utils/settings');
const { setCountingNumber } = require('../systems/guildModules');

module.exports = {
    name: 'contagem',
    aliases: ['counting', 'setcount', 'definircontagem'],
    description: 'Define o próximo número da contagem (ex.: O.contagem 10)',

    async execute(message, args) {
        if (!message.guild) {
            return message.reply('Use este comando no servidor.');
        }

        const canManage =
            message.member?.permissions?.has(PermissionFlagsBits.ManageGuild) ||
            message.member?.permissions?.has(PermissionFlagsBits.ManageChannels) ||
            message.member?.permissions?.has(PermissionFlagsBits.Administrator);

        if (!canManage) {
            return message.reply(
                'Você precisa de **Gerenciar servidor** ou **Gerenciar canais**.'
            );
        }

        const s = getSettings(message.guild.id);
        const ct = s.counting;

        if (!args[0]) {
            if (!ct?.enabled || !ct.channelId) {
                return message.reply(
                    'Contagem **desativada** ou sem canal.\nAtive no painel → Contagem.\nUso: `O.contagem <número>`'
                );
            }
            const { getCountState } = require('../systems/guildModules');
            const state = getCountState(String(ct.channelId), ct.current);
            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0x38bdf8)
                        .setTitle('🔢 Contagem')
                        .setDescription(
                            [
                                `Canal: <#${ct.channelId}>`,
                                `Número atual: **${state.current}**`,
                                `Próximo esperado: **${state.current + 1}**`,
                                '',
                                'Defina com: `O.contagem <número>`',
                                'Ex.: `O.contagem 10` → próximo a enviar é **10**'
                            ].join('\n')
                        )
                ]
            });
        }

        const raw = String(args[0]).replace(/[^\d]/g, '');
        if (!raw) {
            return message.reply('Uso: `O.contagem <número>`\nEx.: `O.contagem 10`');
        }

        const n = parseInt(raw, 10);
        const res = setCountingNumber(message.guild.id, n);
        if (!res.ok) {
            return message.reply(`❌ ${res.error}`);
        }

        await message.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(0x34d399)
                    .setTitle('🔢 Contagem atualizada')
                    .setDescription(
                        [
                            'Contagem ajustada.',
                            `Último número considerado: **${res.current}**`,
                            `Próximo a enviar: **${res.next}**`,
                            `Canal: <#${res.channelId}>`
                        ].join('\n')
                    )
                    .setFooter({ text: `Por ${message.author.tag}` })
                    .setTimestamp()
            ]
        });

        if (String(message.channel.id) !== String(res.channelId)) {
            const ch = await message.guild.channels.fetch(res.channelId).catch(() => null);
            if (ch?.isTextBased()) {
                await ch
                    .send({
                        embeds: [
                            new EmbedBuilder()
                                .setColor(0xfbbf24)
                                .setDescription(
                                    `🔢 Contagem ajustada.\nPróximo número a enviar: **${res.next}**`
                                )
                        ]
                    })
                    .catch(() => {});
            }
        }
    }
};
