const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { getPrefix, setSettings, getSettings } = require('../utils/settings');

module.exports = {
    name: 'prefixo',
    aliases: ['prefix', 'setprefix', 'setarprefixo'],
    description: 'Ver ou alterar o prefixo do servidor',

    async execute(message, args) {
        if (!message.guild) {
            return message.reply('Use este comando em um **servidor**.');
        }

        const atual = getPrefix(message.guild.id);

        if (!args[0] || ['ver', 'atual', 'show'].includes(String(args[0]).toLowerCase())) {
            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0xa78bfa)
                        .setTitle('Prefixo do servidor')
                        .setDescription(
                            [
                                `Prefixo atual: \`${atual}\``,
                                '',
                                `Exemplo: \`${atual}rank\``,
                                '',
                                'Para alterar (Gerenciar Servidor):',
                                `\`${atual}prefixo <novo>\` — ex.: \`${atual}prefixo !\``,
                                '',
                                '_Quando você mudar, o prefixo antigo (ex.: `O.`) **deixa de funcionar** neste servidor._'
                            ].join('\n')
                        )
                ]
            });
        }

        if (
            !message.member?.permissions?.has(PermissionFlagsBits.ManageGuild) &&
            !message.member?.permissions?.has(PermissionFlagsBits.Administrator)
        ) {
            return message.reply('❌ Você precisa de **Gerenciar Servidor** para mudar o prefixo.');
        }

        let novo = String(args[0] || '').trim();
        if (!novo || novo.length > 8) {
            return message.reply('❌ Prefixo inválido (1 a 8 caracteres).');
        }
        // Evita espaços no meio
        if (/\s/.test(novo)) {
            return message.reply('❌ O prefixo não pode ter espaços.');
        }

        const antigo = atual;
        setSettings(message.guild.id, { prefix: novo });

        return message.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(0x34d399)
                    .setTitle('✅ Prefixo atualizado')
                    .setDescription(
                        [
                            `**Antes:** \`${antigo}\``,
                            `**Agora:** \`${novo}\``,
                            '',
                            `Use \`${novo}rank\`, \`${novo}saldo\`, etc.`,
                            `O prefixo \`${antigo}\` **não responde mais** neste servidor.`
                        ].join('\n')
                    )
            ]
        });
    }
};
