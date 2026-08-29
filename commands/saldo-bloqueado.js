const { EmbedBuilder } = require('discord.js');
const pending = require('../utils/converterPending');
const bank = require('../utils/bank');
const flocos = require('../utils/flocos');
const cristais = require('../utils/cristais');

function fmt(n) {
    return Number(n || 0).toLocaleString('pt-BR');
}

function bar(pct) {
    const p = Math.max(0, Math.min(100, Math.floor(pct)));
    const filled = Math.round(p / 10);
    return '▓'.repeat(filled) + '░'.repeat(10 - filled) + ` ${p}%`;
}

module.exports = {
    name: 'saldo-bloqueado',
    aliases: [
        'saldobloqueado',
        'bloqueado',
        'locked',
        'liquidacao',
        'liquidação',
        'pending',
        'saldo bloqueado'
    ],
    description: 'Mostra saldos em liquidação (câmbio 24h)',

    async execute(message) {
        // libera o que já venceu
        let released = [];
        try {
            released = pending.releaseDue(message.author.id) || [];
        } catch (_) {}

        const list = pending.list(message.author.id) || [];
        const now = Date.now();

        let lockedFlocos = 0;
        let lockedCristais = 0;
        const lines = [];

        for (const p of list) {
            const amount = Math.floor(Number(p.amount) || 0);
            if (!amount) continue;
            const isFlocos = p.to === 'bank_flocos';
            if (isFlocos) lockedFlocos += amount;
            else lockedCristais += amount;

            const left = Math.max(0, (p.releaseAt || 0) - now);
            const pct = Math.min(100, Math.floor(((now - (p.createdAt || p.releaseAt - 864e5)) / 864e5) * 100));
            const unix = Math.floor((p.releaseAt || now) / 1000);
            const coin = isFlocos ? '❄️' : '💠';
            const dest = isFlocos ? 'banco' : 'carteira 💠';

            lines.push(
                [
                    `${coin} **${fmt(amount)}** → ${dest}`,
                    `└ ${bar(pct)}`,
                    `└ libera <t:${unix}:R> · <t:${unix}:f>`,
                    p.source ? `└ origem \\`${p.source}\\`` : null
                ]
                    .filter(Boolean)
                    .join('\n')
            );
        }

        const totalLocked = lockedFlocos + lockedCristais;
        const wallet = flocos.get(message.author.id);
        const bankBal = bank.get(message.author.id);
        const cris = cristais.get(message.author.id);

        const embed = new EmbedBuilder()
            .setColor(totalLocked > 0 ? 0xf59e0b : 0x34d399)
            .setAuthor({
                name: 'Aeternus · Saldo Bloqueado',
                iconURL: message.client.user.displayAvatarURL({ size: 64 })
            })
            .setTitle('🔒  Liquidação em curso')
            .setDescription(
                [
                    '```',
                    '  ╔════════════════════════════╗',
                    '  ║   VAULT  ·  LOCKED FUNDS   ║',
                    '  ╚════════════════════════════╝',
                    '```',
                    'Valores convertidos no **câmbio** ficam bloqueados por **24h**',
                    'antes de entrar no banco / carteira.',
                    '',
                    released.length
                        ? `✅ **Acabaram de liberar:**\n${released
                              .map((r) => `• ${fmt(r.amount)} → ${r.deposited}`)
                              .join('\n')}`
                        : null
                ]
                    .filter((x) => x != null)
                    .join('\n')
            )
            .addFields(
                {
                    name: '🔒 Flocos bloqueados',
                    value: `❄️ **${fmt(lockedFlocos)}**`,
                    inline: true
                },
                {
                    name: '🔒 Cristais bloqueados',
                    value: `💠 **${fmt(lockedCristais)}**`,
                    inline: true
                },
                {
                    name: '📋 Operações',
                    value: `**${list.length}** pendente(s)`,
                    inline: true
                },
                {
                    name: '💼 Disponível agora',
                    value: [
                        `❄️ Carteira **${fmt(wallet)}**`,
                        `🏦 Banco **${fmt(bankBal)}**`,
                        `💠 Cristais **${fmt(cris)}**`
                    ].join('\n'),
                    inline: false
                }
            )
            .setFooter({
                text: list.length
                    ? 'O.converter · liquidação automática em 24h'
                    : 'Nada bloqueado · use O.converter para câmbio'
            })
            .setTimestamp();

        if (lines.length) {
            // Discord field value max 1024
            const chunk = lines.join('\n\n').slice(0, 1000);
            embed.addFields({
                name: '📜 Detalhes da liquidação',
                value: chunk + (lines.join('\n\n').length > 1000 ? '\n…' : '')
            });
        } else if (!released.length) {
            embed.addFields({
                name: '✨ Status',
                value: '_Nenhuma liquidação em andamento._\nSeu capital está 100% liberado.'
            });
        }

        await message.reply({ embeds: [embed] });
    }
};
