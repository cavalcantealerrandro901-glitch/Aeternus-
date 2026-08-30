const { EmbedBuilder } = require('discord.js');
const pending = require('../utils/converterPending');
const bank = require('../utils/bank');
const flocos = require('../utils/flocos');
const cristais = require('../utils/cristais');

function fmt(n) {
    return Number(n || 0).toLocaleString('pt-BR');
}

function bar(pct) {
    const p = Math.max(0, Math.min(100, Math.floor(Number(pct) || 0)));
    const filled = Math.round(p / 10);
    return '▓'.repeat(filled) + '░'.repeat(10 - filled) + ` ${p}%`;
}

async function showLocked(message, user) {
    let released = [];
    try {
        released = pending.releaseDue(user.id) || [];
    } catch (e) {
        console.error('[saldo-bloqueado] releaseDue:', e.message);
    }

    let list = [];
    try {
        list = pending.list(user.id) || [];
    } catch (e) {
        console.error('[saldo-bloqueado] list:', e.message);
    }

    const now = Date.now();
    let lockedFlocos = 0;
    let lockedCristais = 0;
    const lines = [];

    for (const p of list) {
        if (!p || p.done) continue;
        const amount = Math.floor(Number(p.amount) || 0);
        if (amount <= 0) continue;

        const isFlocos = p.to === 'bank_flocos';
        if (isFlocos) lockedFlocos += amount;
        else lockedCristais += amount;

        const created = Number(p.createdAt) || now - 864e5;
        const releaseAt = Number(p.releaseAt) || created + 864e5;
        const pct = Math.min(
            100,
            Math.floor(((now - created) / Math.max(1, releaseAt - created)) * 100)
        );
        const unix = Math.floor(releaseAt / 1000);
        const coin = isFlocos ? '❄️' : '💠';
        const dest = isFlocos ? 'banco' : 'carteira 💠';

        lines.push(
            [
                `${coin} **${fmt(amount)}** → ${dest}`,
                `└ ${bar(pct)}`,
                `└ libera <t:${unix}:R> · <t:${unix}:f>`,
                p.source ? `└ origem \`${String(p.source).slice(0, 40)}\`` : null
            ]
                .filter(Boolean)
                .join('\n')
        );
    }

    const totalLocked = lockedFlocos + lockedCristais;

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
                `Conta de **${user.username}**`,
                'Valores do **câmbio** ficam bloqueados por **24h**.',
                released.length
                    ? `\n✅ **Liberados agora:**\n${released
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
                    `❄️ Carteira **${fmt(flocos.get(user.id))}**`,
                    `🏦 Banco **${fmt(bank.get(user.id))}**`,
                    `💠 Cristais **${fmt(cristais.get(user.id))}**`
                ].join('\n')
            }
        )
        .setFooter({
            text: list.length
                ? 'O.converter · liquidação 24h'
                : 'Nada bloqueado · O.converter para câmbio'
        })
        .setTimestamp();

    if (lines.length) {
        const chunk = lines.join('\n\n').slice(0, 1000);
        embed.addFields({
            name: '📜 Detalhes',
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

module.exports = {
    name: 'saldo-bloqueado',
    aliases: [
        'saldobloqueado',
        'bloqueado',
        'locked',
        'liquidacao',
        'liquidação',
        'pending',
        'vault',
        'cofre'
    ],
    description: 'Saldo em liquidação do câmbio',
    showLocked,
    async execute(message) {
        const user = message.mentions.users.first() || message.author;
        await showLocked(message, user);
    }
};
