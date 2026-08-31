const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    SlashCommandBuilder
} = require('discord.js');
const flocos = require('../utils/flocos');
const { resolveBet } = require('../utils/parseAmount');
const { againRow, fmt } = require('../utils/gameStyle');

const REELS = ['🍒', '🍋', '🍇', '🍉', '⭐', '💎', '7️⃣'];

/** pesos: índice 0..6 — 7️⃣ e 💎 mais raros */
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
        return 4; // cereja
    }
    // dois iguais
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
        '  ╔═══════════════╗',
        `  ║  ${a} │ ${b} │ ${c}  ║`,
        '  ╚═══════════════╝',
        '```'
    ].join('\n');
}

function spin(amount, userId) {
    flocos.remove(userId, amount, { reason: 'slots' });
    const a = pick();
    const b = pick();
    const c = pick();
    const mult = multiplier(a, b, c);
    const payout = Math.floor(amount * mult);
    if (payout > 0) flocos.add(userId, payout, { reason: 'slots win' });
    return {
        a,
        b,
        c,
        mult,
        payout,
        win: payout > 0,
        profit: payout - amount
    };
}

function payload(r, amount, user, userId) {
    const bal = flocos.get(userId);
    const color = r.win ? 0x34d399 : 0xf43f5e;
    const title = r.win ? '🎰  JACKPOT · Vitória' : '🎰  Slots · Derrota';

    let money;
    if (r.win) {
        money = [
            `✨ **Ganhou** +❄️ **${fmt(r.payout)}** (×${r.mult})`,
            `📈 Lucro: ❄️ **${fmt(r.profit)}**`
        ].join('\n');
    } else {
        money = [
            `💫 **Perdeu** −❄️ **${fmt(amount)}**`,
            `_Tente de novo — a sorte muda._`
        ].join('\n');
    }

    const emb = new EmbedBuilder()
        .setColor(color)
        .setAuthor({
            name: `${user.username} · Cassino`,
            iconURL: user.displayAvatarURL({ size: 64 })
        })
        .setTitle(title)
        .setDescription(
            [
                frame(r.a, r.b, r.c),
                `Aposta: ❄️ **${fmt(amount)}**`,
                '',
                money,
                '',
                `💼 Saldo: ❄️ **${fmt(bal)}**`
            ].join('\n')
        )
        .setFooter({ text: 'O.slots 1k · all · half  ·  7️⃣7️⃣7️⃣ ×25' })
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
        .setTitle('📜  Tabela · Slots')
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
                '_Moeda: flocos ❄️_'
            ].join('\n')
        );
}

module.exports = {
    name: 'slots',
    aliases: ['slot', 'caça-niquel', 'cacaniquel', 'slotmachine'],
    description: 'Caça-níquel com flocos',
    data: new SlashCommandBuilder()
        .setName('slots')
        .setDescription('Gira os slots (flocos)')
        .addStringOption((o) =>
            o.setName('valor').setDescription('1k · 2.5m · all · half').setRequired(true)
        ),

    async execute(message, args) {
        if (!args[0]) {
            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0xa78bfa)
                        .setTitle('🎰  Slots')
                        .setDescription(
                            [
                                'Uso: `O.slots <valor|all|half>`',
                                '',
                                '`O.slots 1k`',
                                '`O.slots half`',
                                '`O.slots all`'
                            ].join('\n')
                        )
                        .setFooter({ text: 'Apostas em flocos ❄️' })
                ]
            });
        }
        const bet = resolveBet(args[0], flocos.get(message.author.id), { label: '❄️' });
        if (!bet.ok) return message.reply(`❌ ${bet.error}`);
        const r = spin(bet.amount, message.author.id);
        return message.reply(payload(r, bet.amount, message.author, message.author.id));
    },

    async executeSlash(interaction) {
        const bet = resolveBet(
            interaction.options.getString('valor'),
            flocos.get(interaction.user.id),
            { label: '❄️' }
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

        // tabela
        if (parts[4] === 'x' || interaction.customId.includes(':x')) {
            return interaction.reply({ embeds: [tableEmbed()], ephemeral: true });
        }

        const amountStr = parts[2];
        const owner = parts[3];
        if (interaction.user.id !== owner) {
            return interaction.reply({ content: 'Não é a sua partida.', ephemeral: true });
        }
        const bet = resolveBet(amountStr, flocos.get(owner), { label: '❄️' });
        if (!bet.ok) {
            return interaction.reply({ content: `❌ ${bet.error}`, ephemeral: true });
        }
        const r = spin(bet.amount, owner);
        return interaction.update(payload(r, bet.amount, interaction.user, owner));
    }
};
