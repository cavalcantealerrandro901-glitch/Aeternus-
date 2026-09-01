const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    SlashCommandBuilder
} = require('discord.js');
const eter = require('../utils/eter');
const { resolveBet } = require('../utils/parseAmount');
const { againRow, fmt, C } = require('../utils/gameStyle');

const REELS = ['🍒', '🍋', '🍇', '🍉', '⭐', '💎', '7️⃣'];
const WEIGHTS = [28, 24, 18, 14, 10, 5, 1];

function pick() {
    const total = WEIGHTS.reduce((a, b) => a + b, 0);
    let r = Math.random() * total;
    for (let i = 0; i < REELS.length; i++) {
        r -= WEIGHTS[i];
        if (r <= 0) return REELS[i];
    }
    return REELS[0];
}

function multiplier(a, b, c) {
    if (a === b && b === c) {
        if (a === '7️⃣') return 25;
        if (a === '💎') return 18;
        if (a === '⭐') return 12;
        if (a === '🍉') return 8;
        if (a === '🍇') return 6;
        if (a === '🍋') return 5;
        return 4;
    }
    if (a === b || b === c || a === c) {
        const pair = a === b ? a : b === c ? b : a;
        if (pair === '7️⃣' || pair === '💎') return 2.5;
        if (pair === '⭐') return 2;
        return 1.5;
    }
    return 0;
}

function frame(a, b, c) {
    return [
        '```',
        '  ╔══════════════════╗',
        `  ║   ${a}  │  ${b}  │  ${c}   ║`,
        '  ╚══════════════════╝',
        '```'
    ].join('\n');
}

function spin(amount, userId) {
    eter.remove(userId, amount, { reason: 'slots' });
    const a = pick();
    const b = pick();
    const c = pick();
    const mult = multiplier(a, b, c);
    const payout = Math.floor(amount * mult);
    if (payout > 0) eter.add(userId, payout, { reason: 'slots win' });
    return { a, b, c, mult, payout, win: payout > 0, profit: payout - amount };
}

function vibe(r) {
    if (r.mult >= 18) return '🌟 **MEGA JACKPOT!** As estrelas se alinharam.';
    if (r.mult >= 8) return '🎉 **Grande vitória!** Os rolos te abençoaram.';
    if (r.win) return '✨ **Vitória!** Mais uma rodada vencedora.';
    return '💨 Os rolos giraram… a sorte volta na próxima.';
}

function payload(r, amount, user, userId) {
    const bal = eter.get(userId);
    const color = r.mult >= 12 ? C.gold : r.win ? C.win : C.lose;
    const title =
        r.mult >= 18
            ? '🎰  MEGA JACKPOT'
            : r.win
              ? '🎰  Slots · Vitória'
              : '🎰  Slots · Derrota';

    let money;
    if (r.win) {
        money = [
            `✨ **Ganhou** +✨ **${fmt(r.payout)}** (×${r.mult})`,
            `📈 Lucro: ✨ **${fmt(r.profit)}**`
        ].join('\n');
    } else {
        money = `💫 **Perdeu** −✨ **${fmt(amount)}**`;
    }

    const emb = new EmbedBuilder()
        .setColor(color)
        .setAuthor({
            name: `${user.username} · Cassino Aeternus`,
            iconURL: user.displayAvatarURL({ size: 64 })
        })
        .setTitle(title)
        .setDescription(
            [
                frame(r.a, r.b, r.c),
                `Aposta: ✨ **${fmt(amount)}**`,
                '',
                vibe(r),
                '',
                money,
                '',
                `💼 Saldo: ✨ **${fmt(bal)}**`
            ].join('\n')
        )
        .setFooter({ text: 'O.slots 1k · all · half  ·  7️⃣7️⃣7️⃣ ×25 · Aeternus' })
        .setTimestamp();

    return {
        embeds: [emb],
        components: [
            againRow(`slots:again:${amount}:${userId}`, 'Girar de novo'),
            new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`slots:again:${amount}:${userId}:x`)
                    .setLabel('Tabela de prêmios')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('📜')
            )
        ]
    };
}

function tableEmbed() {
    return new EmbedBuilder()
        .setColor(0xa78bfa)
        .setTitle('📜  Tabela · Slots Aeternus')
        .setDescription(
            [
                '**Três iguais**',
                '7️⃣7️⃣7️⃣ → ×**25**',
                '💎💎💎 → ×**18**',
                '⭐⭐⭐ → ×**12**',
                '🍉🍉🍉 → ×**8**',
                '🍇🍇🍇 → ×**6**',
                '🍋🍋🍋 → ×**5**',
                '🍒🍒🍒 → ×**4**',
                '',
                '**Dois iguais** → ×**1.5** a ×**2.5**',
                '',
                '_Moeda: Éter ✨ · Boa sorte._'
            ].join('\n')
        );
}

module.exports = {
    name: 'slots',
    aliases: ['slot', 'caça-niquel', 'cacaniquel', 'slotmachine'],
    description: 'Caça-níquel com éter',
    data: new SlashCommandBuilder()
        .setName('slots')
        .setDescription('Gira os slots (éter)')
        .addStringOption((o) =>
            o.setName('valor').setDescription('1k · 2.5m · all · half').setRequired(true)
        ),

    async execute(message, args) {
        if (!args[0]) {
            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0xa78bfa)
                        .setTitle('🎰  Slots Aeternus')
                        .setDescription(
                            [
                                'Uso: `O.slots <valor|all|half>`',
                                '',
                                '`O.slots 1k`',
                                '`O.slots half`',
                                '`O.slots all`',
                                '',
                                '7️⃣7️⃣7️⃣ paga **×25** — o jackpot dos deuses.'
                            ].join('\n')
                        )
                        .setFooter({ text: 'Apostas em Éter ✨' })
                ]
            });
        }
        const bet = resolveBet(args[0], eter.get(message.author.id), { label: '✨' });
        if (!bet.ok) return message.reply(`❌ ${bet.error}`);
        const r = spin(bet.amount, message.author.id);
        return message.reply(payload(r, bet.amount, message.author, message.author.id));
    },

    async executeSlash(interaction) {
        const bet = resolveBet(
            interaction.options.getString('valor'),
            eter.get(interaction.user.id),
            { label: '✨' }
        );
        if (!bet.ok) {
            return interaction.reply({ content: `❌ ${bet.error}`, ephemeral: true });
        }
        const r = spin(bet.amount, interaction.user.id);
        return interaction.reply(payload(r, bet.amount, interaction.user, interaction.user.id));
    },

    async handleComponent(interaction) {
        const parts = interaction.customId.split(':');
        if (parts[0] !== 'slots') return;

        if (parts[4] === 'x' || interaction.customId.includes(':x')) {
            return interaction.reply({ embeds: [tableEmbed()], ephemeral: true });
        }

        const amountStr = parts[2];
        const owner = parts[3];
        if (interaction.user.id !== owner) {
            return interaction.reply({ content: 'Não é a sua partida.', ephemeral: true });
        }
        const bet = resolveBet(amountStr, eter.get(owner), { label: '✨' });
        if (!bet.ok) {
            return interaction.reply({ content: `❌ ${bet.error}`, ephemeral: true });
        }
        const r = spin(bet.amount, owner);
        return interaction.update(payload(r, bet.amount, interaction.user, owner));
    }
};
