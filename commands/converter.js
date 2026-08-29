const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');
const flocos = require('../utils/flocos');
const cristais = require('../utils/cristais');
const { resolveBet } = require('../utils/parseAmount');
const pending = require('../utils/converterPending');

/** Taxa oficial: 2 flocos = 1 cristal */
const RATE = 2;

function fmt(n) {
    return Number(n || 0).toLocaleString('pt-BR');
}

module.exports = {
    name: 'converter',
    aliases: ['cambio', 'câmbio', 'trocar', 'reverter', 'exchange', 'convert'],
    description: 'Converte flocos ↔ cristais (2❄️ = 1💠) com liquidação em 1 dia',
    async execute(message, args) {
        // libera pendências vencidas do usuário
        try {
            const rel = pending.releaseDue(message.author.id);
            if (rel.length) {
                const sum = rel.map((r) => `• ${fmt(r.amount)} → ${r.deposited}`).join('\n');
                await message.channel
                    .send({
                        content: `${message.author} 💼 **Câmbio liberado:**\n${sum}`
                    })
                    .catch(() => {});
            }
        } catch (_) {}

        const bet = resolveBet(args[0], Math.max(flocos.get(message.author.id), cristais.get(message.author.id)), {
            label: 'valor'
        });

        // resolveBet com max balance is wrong for dual currency — parse amount alone first
        const { parseAmount } = require('../utils/parseAmount');
        let amount = parseAmount(args[0], flocos.get(message.author.id));
        if (!Number.isFinite(amount) || amount <= 0) {
            amount = parseAmount(args[0], cristais.get(message.author.id));
        }
        if (!Number.isFinite(amount) || amount <= 0) {
            return message.reply(
                [
                    '💱 **Converter**',
                    'Uso: `O.converter <valor|all|half|k|m>`',
                    '',
                    'Taxa: **2 ❄️ = 1 💠**',
                    'Após escolher, o valor fica em liquidação **1 dia** e vai para o **banco** (flocos) ou carteira de cristais.'
                ].join('\n')
            );
        }

        // all/half: user picks direction on buttons — we store raw amount interpretation per button
        const rawArg = args[0];

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
                    `Valor informado: **${String(rawArg)}**`,
                    '',
                    '**Taxa oficial**',
                    '• **2 ❄️ flocos**  =  **1 💠 cristal**',
                    '',
                    'Escolha a direção da conversão:',
                    '💠 **Em cristais** — gasta flocos (2:1)',
                    '❄️ **Em flocos** — gasta cristais (×2)',
                    '',
                    '⏳ Após confirmar, o valor entra em **liquidação de 1 dia** e só então é depositado no banco / carteira.'
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
                .setCustomId(`converter:toCristais:${message.author.id}:${encodeURIComponent(rawArg)}`)
                .setLabel('Converter em cristais')
                .setEmoji('💠')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId(`converter:toFlocos:${message.author.id}:${encodeURIComponent(rawArg)}`)
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
        const rawArg = decodeURIComponent(parts.slice(3).join(':') || '');

        if (interaction.user.id !== owner) {
            return interaction.reply({ content: 'Esta mesa de câmbio não é sua.', ephemeral: true });
        }

        const { parseAmount } = require('../utils/parseAmount');

        if (action === 'toCristais') {
            // gasta flocos → recebe cristais (2 flocos = 1 cristal)
            const amount = parseAmount(rawArg, flocos.get(owner));
            if (!Number.isFinite(amount) || amount <= 0) {
                return interaction.reply({ content: 'Valor inválido.', ephemeral: true });
            }
            // amount = flocos a gastar; precisa ser par preferencialmente
            const spend = amount;
            if (flocos.get(owner) < spend) {
                return interaction.reply({
                    content: `❌ ❄️ Insuficiente. Você tem **${fmt(flocos.get(owner))}**.`,
                    ephemeral: true
                });
            }
            const gain = Math.floor(spend / RATE);
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
                source: `-${actualSpend}❄️`
            });

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
            // gasta cristais → recebe flocos (1 cristal = 2 flocos)
            const amount = parseAmount(rawArg, cristais.get(owner));
            if (!Number.isFinite(amount) || amount <= 0) {
                return interaction.reply({ content: 'Valor inválido.', ephemeral: true });
            }
            const spend = amount;
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
                source: `-${spend}💠`
            });

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
    }
};
