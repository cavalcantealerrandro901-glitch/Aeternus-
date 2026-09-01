const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    SlashCommandBuilder
} = require('discord.js');
const flocos = require('../utils/flocos');
const { resolveBet } = require('../utils/parseAmount');
const { againRow, fmt, C } = require('../utils/gameStyle');

const RED = new Set([
    1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36
]);

function colorOf(n) {
    if (n === 0) return 'verde';
    return RED.has(n) ? 'vermelho' : 'preto';
}

function colorEmoji(c) {
    if (c === 'verde') return '🟢';
    if (c === 'vermelho') return '🔴';
    return '⚫';
}

function normalizeChoice(raw) {
    const s = String(raw || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim();
    if (['vermelho', 'red', 'r', 'vermelha'].includes(s)) return 'vermelho';
    if (['preto', 'black', 'b', 'preta'].includes(s)) return 'preto';
    if (['verde', 'green', 'g', 'zero', '0'].includes(s)) return s === '0' ? '0' : 'verde';
    if (/^\d+$/.test(s)) {
        const n = parseInt(s, 10);
        if (n >= 0 && n <= 36) return String(n);
    }
    return null;
}

function play(choice, amount, userId) {
    flocos.remove(userId, amount, { reason: 'roleta' });
    const n = Math.floor(Math.random() * 37);
    const color = colorOf(n);
    let mult = 0;
    let win = false;
    let kind = '';

    if (choice === 'verde' || choice === '0') {
        if (n === 0) {
            win = true;
            mult = choice === '0' ? 36 : 14;
            kind = choice === '0' ? 'número 0' : 'cor verde';
        }
    } else if (choice === 'vermelho' || choice === 'preto') {
        if (choice === color) {
            win = true;
            mult = 2;
            kind = `cor ${color}`;
        }
    } else if (/^\d+$/.test(choice) && parseInt(choice, 10) === n) {
        win = true;
        mult = 36;
        kind = `número ${n}`;
    }

    const payout = Math.floor(amount * mult);
    if (payout > 0) flocos.add(userId, payout, { reason: 'roleta win' });
    return { n, color, win, mult, payout, kind, profit: payout - amount };
}

function wheelArt(n, color) {
    const e = colorEmoji(color);
    return [
        '```',
        '     ╭───────────╮',
        `     │   ${e}  ${String(n).padStart(2, ' ')}   │`,
        '     ╰───────────╯',
        '```'
    ].join('\n');
}

function vibe(r) {
    if (r.mult >= 36) return '🌟 **Número certeiro!** A roda te escolheu.';
    if (r.mult >= 14) return '🟢 **Verde lendário!** Quase impossível.';
    if (r.win) return '🎉 **Cor certa!** A mesa pagou.';
    return '🌀 A bola parou… não era a sua vez.';
}

function payload(r, choice, amount, user, userId) {
    const bal = flocos.get(userId);
    const emb = new EmbedBuilder()
        .setColor(r.mult >= 14 ? C.gold : r.win ? C.win : C.lose)
        .setAuthor({
            name: `${user.username} · Roleta`,
            iconURL: user.displayAvatarURL({ size: 64 })
        })
        .setTitle(r.win ? (r.mult >= 14 ? '🎡  Roleta · Jackpot' : '🎡  Roleta · Vitória') : '🎡  Roleta · Derrota')
        .setDescription(
            [
                wheelArt(r.n, r.color),
                `Apostou em **${choice}**`,
                `Saiu **${r.n}** ${colorEmoji(r.color)} (**${r.color}**)`,
                r.win && r.kind ? `Acerto: **${r.kind}** · ×**${r.mult}**` : '',
                '',
                vibe(r),
                '',
                r.win
                    ? `✨ **Ganhou** +❄️ **${fmt(r.payout)}**\n📈 Lucro: ❄️ **${fmt(r.profit)}**`
                    : `💫 **Perdeu** −❄️ **${fmt(amount)}**`,
                '',
                `💼 Saldo: ❄️ **${fmt(bal)}**`
            ]
                .filter(Boolean)
                .join('\n')
        )
        .setFooter({
            text: 'vermelho/preto ×2 · verde ×14 · número ×36 · Aeternus'
        })
        .setTimestamp();

    return {
        embeds: [emb],
        components: [
            againRow(`roleta:again:${choice}:${amount}:${userId}`, 'Girar de novo'),
            new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`roleta:quick:vermelho:${amount}:${userId}`)
                    .setLabel('Vermelho')
                    .setEmoji('🔴')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId(`roleta:quick:preto:${amount}:${userId}`)
                    .setLabel('Preto')
                    .setEmoji('⚫')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId(`roleta:quick:verde:${amount}:${userId}`)
                    .setLabel('Verde')
                    .setEmoji('🟢')
                    .setStyle(ButtonStyle.Success)
            )
        ]
    };
}

module.exports = {
    name: 'roleta',
    aliases: ['roulette', 'rl'],
    description: 'Roleta europeia (flocos)',
    data: new SlashCommandBuilder()
        .setName('roleta')
        .setDescription('Gira a roleta (flocos)')
        .addStringOption((o) =>
            o
                .setName('aposta')
                .setDescription('vermelho | preto | verde | 0-36')
                .setRequired(true)
        )
        .addStringOption((o) =>
            o.setName('valor').setDescription('1k · all · half').setRequired(true)
        ),

    async execute(message, args) {
        const choice = normalizeChoice(args[0]);
        if (!choice || !args[1]) {
            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0xa78bfa)
                        .setTitle('🎡  Roleta Aeternus')
                        .setDescription(
                            [
                                '**Uso**',
                                '`O.roleta <vermelho|preto|verde|0-36> <valor>`',
                                '',
                                '`O.roleta vermelho 1k`',
                                '`O.roleta preto half`',
                                '`O.roleta 17 2k`',
                                '`O.roleta verde 500`',
                                '',
                                '🔴/⚫ ×**2** · 🟢 ×**14** · número ×**36**'
                            ].join('\n')
                        )
                ]
            });
        }
        const bet = resolveBet(args[1], flocos.get(message.author.id), { label: '❄️' });
        if (!bet.ok) return message.reply(`❌ ${bet.error}`);
        const r = play(choice, bet.amount, message.author.id);
        return message.reply(
            payload(r, choice, bet.amount, message.author, message.author.id)
        );
    },

    async executeSlash(interaction) {
        const choice = normalizeChoice(interaction.options.getString('aposta'));
        if (!choice) {
            return interaction.reply({
                content: '❌ Aposta inválida. Use vermelho, preto, verde ou 0–36.',
                ephemeral: true
            });
        }
        const bet = resolveBet(
            interaction.options.getString('valor'),
            flocos.get(interaction.user.id),
            { label: '❄️' }
        );
        if (!bet.ok) {
            return interaction.reply({ content: `❌ ${bet.error}`, ephemeral: true });
        }
        const r = play(choice, bet.amount, interaction.user.id);
        return interaction.reply(
            payload(r, choice, bet.amount, interaction.user, interaction.user.id)
        );
    },

    async handleComponent(interaction) {
        const parts = interaction.customId.split(':');
        if (parts[0] !== 'roleta') return;

        const choice = normalizeChoice(parts[2]) || parts[2];
        const amountStr = parts[3];
        const owner = parts[4];

        if (interaction.user.id !== owner) {
            return interaction.reply({ content: 'Não é a sua partida.', ephemeral: true });
        }

        const bet = resolveBet(amountStr, flocos.get(owner), { label: '❄️' });
        if (!bet.ok) {
            return interaction.reply({ content: `❌ ${bet.error}`, ephemeral: true });
        }

        const r = play(choice, bet.amount, owner);
        return interaction.update(
            payload(r, choice, bet.amount, interaction.user, owner)
        );
    }
};
