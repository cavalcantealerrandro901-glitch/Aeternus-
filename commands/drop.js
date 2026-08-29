const { PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const drops = require('../utils/drops');
const { getSettings } = require('../utils/settings');
const { schedule } = require('../systems/drops');

module.exports = {
    name: 'drop',
    aliases: ['sorteio', 'giveaway', 'sortear'],
    description: 'Cria um drop/sorteio',
    /**
     * O.drop <tempo> <vencedores> <prêmio…>
     * Ex: O.drop 10m 1 5000 flocos
     *     O.drop 1h 3 Nitro 1 mês
     *     O.drop 30s 2 100 cristais
     */
    async execute(message, args, client) {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild) &&
            !message.member.permissions.has(PermissionFlagsBits.ManageEvents) &&
            !message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply({ embeds: [err('Você precisa de **Gerenciar Servidor**.')] });
        }

        if (args.length < 3) {
            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0x8b5cf6)
                        .setTitle('🎁 Como usar drops')
                        .setDescription(
                            [
                                '`O.drop <tempo> <vencedores> <prêmio>`',
                                '',
                                '**Tempo:** `30s` `5m` `1h` `2d`',
                                '**Vencedores:** número (ex: `1` ou `3`)',
                                '**Prêmio:** texto livre **ou** valor automático',
                                '• `5000 flocos` → paga ❄️ sozinho',
                                '• `100 cristais` → paga 💠 sozinho',
                                '• `Nitro 1 mês` → só anuncia',
                                '',
                                '**Exemplos**',
                                '`O.drop 10m 1 5000 flocos`',
                                '`O.drop 1h 3 VIP no servidor`',
                                '`O.drop 30s 2 50 cristais`'
                            ].join('\n')
                        )
                ]
            });
        }

        const ms = drops.parseDuration(args[0]);
        const winners = parseInt(args[1], 10);
        const prizeRaw = args.slice(2).join(' ');

        if (!ms) return message.reply({ embeds: [err('Tempo inválido. Use `30s`, `5m`, `1h`, `2d`.')] });
        if (!winners || winners < 1 || winners > 20)
            return message.reply({ embeds: [err('Número de vencedores: **1** a **20**.')] });
        if (!prizeRaw.trim())
            return message.reply({ embeds: [err('Informe o prêmio.')] });

        const conf = getSettings(message.guild.id).drops || {};
        const emoji = conf.emoji || '🎉';
        const prize = drops.parsePrize(prizeRaw);

        // canal: painel > canal atual
        let channel = message.channel;
        if (conf.channelId) {
            const ch = message.guild.channels.cache.get(conf.channelId);
            if (ch?.isTextBased()) channel = ch;
        }

        const endsAt = Date.now() + ms;
        const endsUnix = Math.floor(endsAt / 1000);

        const embed = new EmbedBuilder()
            .setColor(0xf472b6)
            .setTitle('🎁 DROP EM ANDAMENTO')
            .setDescription(
                [
                    `**Prêmio:** ${prize.label}`,
                    `**Vencedores:** ${winners}`,
                    `**Termina:** <t:${endsUnix}:R> (<t:${endsUnix}:f>)`,
                    '',
                    `Reaja com ${emoji} para participar!`,
                    prize.type !== 'text'
                        ? `_Pagamento automático de ${prize.amount.toLocaleString('pt-BR')} ${prize.type}_`
                        : '_Prêmio entregue pela staff / anunciado no fim_' 
                ].join('\n')
            )
            .setFooter({ text: `Por ${message.author.tag}` })
            .setTimestamp(endsAt);

        const msg = await channel.send({ embeds: [embed] });
        await msg.react(emoji).catch(() => msg.react('🎉').catch(() => {}));

        const id = `${message.guild.id}_${msg.id}`;
        const entry = {
            id,
            guildId: message.guild.id,
            channelId: channel.id,
            messageId: msg.id,
            hostId: message.author.id,
            hostTag: message.author.tag,
            winners,
            emoji: emoji === '🎉' ? '🎉' : emoji,
            prize,
            endsAt,
            createdAt: Date.now(),
            ended: false
        };

        drops.createDrop(entry);
        schedule(client || message.client, entry);

        if (channel.id !== message.channel.id) {
            await message.reply({ embeds: [new EmbedBuilder().setColor(0x34d399).setDescription(`✅ Drop criado em ${channel}`)] });
        } else {
            await message.delete().catch(() => {});
        }
    }
};

function err(t) {
    return new EmbedBuilder().setColor(0xef4444).setDescription(`❌ ${t}`);
}
