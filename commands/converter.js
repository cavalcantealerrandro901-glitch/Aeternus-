const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');
const flocos = require('../utils/flocos');
const cristais = require('../utils/cristais');
const { parseAmount } = require('../utils/parseAmount');
const pending = require('../utils/converterPending');

/** Taxa oficial: 2 flocos = 1 cristal */
const RATE = 2;

function fmt(n) {
    return Number(n || 0).toLocaleString('pt-BR');
}

function usage() {
    return [
        '💱 **Converter**',
        'Uso: `O.converter <valor|all|half|k|m>`',
        '',
        'Taxa: **2 ❄️ = 1 💠**',
        'Depois de escolher a direção, o valor fica em liquidação por **1 dia**.',
        '• Flocos → depositados no **banco**',
        '• Cristais → liberados na **carteira 💠**'
    ].join('\n');
}

module.exports = {
    name: 'converter',
    aliases: ['cambio', 'câmbio', 'trocar', 'reverter', 'exchange', 'convert'],
    description: 'Converte flocos ↔ cristais (2❄️ = 1💠) com liquidação em 1 dia',

    async execute(message, args) {
        try {
            const rel = pending.releaseDue(message.author.id);
            if (rel.length) {
                const sum = rel.map((r) => `• ${fmt(r.amount)} → ${r.deposited}`).join('\n');
                await message.channel
                    .send(`${message.author} 💼 **Câmbio liberado:**\n${sum}`)
                    .catch(() => {});
            }
        } catch (_) {}

        if (!args[0]) return message.reply(usage());

        const rawArg = String(args[0]).trim();
        // valida se o valor faz sentido em pelo menos uma moeda
        const asFlocos = parseAmount(rawArg, flocos.get(message.author.id));
        const asCristais = parseAmount(rawArg, cristais.get(message.author.id));
        const okNum =
            (Number.isFinite(asFlocos) && asFlocos > 0) ||
            (Number.isFinite(asCristais) && asCristais > 0);

        if (!okNum) return message.reply(usage());

        // customId limitado a 100 chars no Discord
        const safeArg = encodeURIComponent(rawArg).slice(0, 40);

        const embed = new EmbedBuilder()
            .setColor(0xa78bfa)
            .setAuthor({
                name: 'Aeternus Exchange',
                iconURL: message.client.user.displayAvatarURL({ size: 64 })
            })
            .setTitle('💱  Mesa de câmbio')
            .setDescription(
                [
                    '```',
                    '  ╔══════════════════════════╗',
                    '  ║   AETERNUS   EXCHANGE    ║',
                    '  ╚══════════════════════════╝',
                    '```',
                    `Valor informado: **${rawArg}**`,
                    '',
                    '**Taxa oficial**',
                    '• **2 ❄️ flocos**  =  **1 💠 cristal**',
                    '',
                    'Escolha a direção da conversão:',
                    '💠 **Em cristais** — gasta flocos (2:1)',
                    '❄️ **Em flocos** — gasta cristais (×2)',
                    '',
                    '⏳ Após confirmar, o valor entra em **liquidação de 1 dia**.'
                ].join('\n')
            )
            .addFields(
                {
                    name: '❄️ Carteira',
                    value: `**${fmt(flocos.get(message.author.id))}**`,
                    inline: true
                },
                {
                    name: '💠 Cristais',
                    value: `**${fmt(cristais.get(message.author.id))}**`,
                    inline: true
                }
            )
            .setFooter({ text: 'Liquidação · 24h · Aeternus Bank' })
            .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`converter:toCristais:${message.author.id}:${safeArg}`)
                .setLabel('Converter em cristais')
                .setEmoji('💠')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId(`converter:toFlocos:${message.author.id}:${safeArg}`)
                .setLabel('Converter em flocos')
                .setEmoji('❄️')
                .setStyle(ButtonStyle.Success)
        );

        await message.reply({ embeds: [embed], components: [row] });
    },

    async handleComponent(interaction) {
        const parts = interaction.customId.split(':');
        const action = parts[1];
        const owner = parts[2];
        let rawArg = '';
        try {
            rawArg = decodeURIComponent(parts.slice(3).join(':') || '');
        } catch (_) {
            rawArg = parts.slice(3).join(':') || '';
        }

        if (interaction.user.id !== owner) {
            return interaction.reply({
                content: 'Esta mesa de câmbio não é sua.',
                ephemeral: true
            });
        }

        if (action === 'toCristais') {
            // gasta flocos → recebe cristais
            const spendWanted = parseAmount(rawArg, flocos.get(owner));
            if (!Number.isFinite(spendWanted) || spendWanted <= 0) {
                return interaction.reply({ content: 'Valor inválido.', ephemeral: true });
            }
            if (flocos.get(owner) < spendWanted) {
                return interaction.reply({
                    content: `❌ ❄️ Insuficiente. Você tem **${fmt(flocos.get(owner))}**.`,
                    ephemeral: true
                });
            }

            const gain = Math.floor(spendWanted / RATE);
            if (gain < 1) {
                return interaction.reply({
                    content: `❌ Mínimo **${RATE}** flocos para obter 1 cristal.`,
                    ephemeral: true
                });
            }

            const actualSpend = gain * RATE;
            flocos.remove(owner, actualSpend, { reason: 'câmbio → liquidação' });
            const p = pending.addPending(owner, {
                to: 'bank_cristais',
                amount: gain,
                source: `-${fmt(actualSpend)}❄️`
            });

            if (!p) {
                flocos.add(owner, actualSpend, false);
                return interaction.reply({ content: '❌ Erro ao registrar liquidação.', ephemeral: true });
            }

            const release = Math.floor(p.releaseAt / 1000);
            return interaction.update({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0x22d3ee)
                        .setTitle('✅  Conversão bem-sucedida')
                        .setDescription(
                            [
                                `Você converteu ❄️ **${fmt(actualSpend)}** → 💠 **${fmt(gain)}**`,
                                '',
                                '📦 O valor entrará na sua **carteira de cristais**',
                                `quando o cooldown terminar: <t:${release}:R> (<t:${release}:f>)`,
                                '',
                                '_Liquidação de 1 dia · Aeternus Exchange_'
                            ].join('\n')
                        )
                        .setFooter({ text: 'Não é possível cancelar a liquidação' })
                        .setTimestamp()
                ],
                components: []
            });
        }

        if (action === 'toFlocos') {
            // gasta cristais → recebe flocos no banco após 1d
            const spend = parseAmount(rawArg, cristais.get(owner));
            if (!Number.isFinite(spend) || spend <= 0) {
                return interaction.reply({ content: 'Valor inválido.', ephemeral: true });
            }
            if (cristais.get(owner) < spend) {
                return interaction.reply({
                    content: `❌ 💠 Insuficiente. Você tem **${fmt(cristais.get(owner))}**.`,
                    ephemeral: true
                });
            }

            const gain = spend * RATE;
            cristais.remove(owner, spend);
            const p = pending.addPending(owner, {
                to: 'bank_flocos',
                amount: gain,
                source: `-${fmt(spend)}💠`
            });

            if (!p) {
                cristais.add(owner, spend);
                return interaction.reply({ content: '❌ Erro ao registrar liquidação.', ephemeral: true });
            }

            const release = Math.floor(p.releaseAt / 1000);
            return interaction.update({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0x34d399)
                        .setTitle('✅  Conversão bem-sucedida')
                        .setDescription(
                            [
                                `Você converteu 💠 **${fmt(spend)}** → ❄️ **${fmt(gain)}**`,
                                '',
                                '🏦 O valor será **depositado no seu banco**',
                                `quando o cooldown terminar: <t:${release}:R> (<t:${release}:f>)`,
                                '',
                                '_Liquidação de 1 dia · Aeternus Exchange_'
                            ].join('\n')
                        )
                        .setFooter({ text: 'Não é possível cancelar a liquidação' })
                        .setTimestamp()
                ],
                components: []
            });
        }

        return interaction.reply({ content: 'Ação inválida.', ephemeral: true }).catch(() => {});
    }
};
