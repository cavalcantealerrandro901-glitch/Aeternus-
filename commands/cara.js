const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');
const flocos = require('../utils/flocos');
const { resolveBet } = require('../utils/parseAmount');
const { fmt, betFooter, C } = require('../utils/gameStyle');

const SPIN_FRAMES = ['🪙', '⚪', '🪙', '⚫', '🪙', '⚪', '🪙'];

const WIN_LINES = [
    'A moeda caiu do seu lado. Frio na barriga — e saldo subindo.',
    'Você leu o giro. A sorte respondeu.',
    'Clique no ar. Vitória limpa.',
    'A mesa inclinou a seu favor.',
    'Momento perfeito. A face certa olhou pra você.'
];

const LOSE_LINES = [
    'Quase… a moeda traiu no último giro.',
    'A sorte piscou pro outro lado.',
    'Não foi dessa vez. A casa respira.',
    'O metal esfriou contra você.',
    'Giro cruel. Prejuízo na mesa.'
];

function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
}

function sideEmoji(side) {
    return side === 'cara' ? '🟡' : '⚪';
}

function sideLabel(side) {
    return side === 'cara' ? 'CARA' : 'COROA';
}

function spinningEmbed({ user, amount, choice, frame, step, total }) {
    const dots = '•'.repeat(step + 1) + '·'.repeat(Math.max(0, total - step - 1));
    return new EmbedBuilder()
        .setColor(0xfbbf24)
        .setAuthor({
            name: 'Aeternus Casino · Cara ou Coroa',
            iconURL: user.displayAvatarURL({ size: 64 })
        })
        .setTitle('🪙  A moeda está no ar…')
        .setDescription(
            [
                '```',
                '        ╔══════════════════╗',
                `        ║      ${frame}  GIRO      ║`,
                '        ╚══════════════════╝',
                '```',
                `${user} apostou ❄️ **${fmt(amount)}** em **${sideLabel(choice)}** ${sideEmoji(choice)}`,
                '',
                `🌀 Girando ${dots}`,
                '',
                '_Ninguém respira. A face ainda não decidiu._'
            ].join('\n')
        )
        .setFooter({ text: '50/50 real · ' + betFooter() })
        .setTimestamp();
}

function resultEmbed({ user, amount, choice, result, win, balance }) {
    const payout = amount * 2;
    const line = win
        ? WIN_LINES[Math.floor(Math.random() * WIN_LINES.length)]
        : LOSE_LINES[Math.floor(Math.random() * LOSE_LINES.length)];

    const face = result === 'cara' ? '🟡 CARA' : '⚪ COROA';

    const lines = [
        '```',
        '   ╔════════════════════════════╗',
        '   ║   AETERNUS  ·  COIN FLIP   ║',
        '   ╚════════════════════════════╝',
        '```',
        `🎯 Escolha: **${sideLabel(choice)}** ${sideEmoji(choice)}`,
        `🪙 Resultado: **${face}**`,
        '',
        win
            ? `🎉 **VITÓRIA**\n✨ +❄️ **${fmt(payout)}** (2×)`
            : `💥 **DERROTA**\n💫 −❄️ **${fmt(amount)}**`,
        '',
        `_${line}_`,
        '',
        `💼 Saldo: ❄️ **${fmt(balance)}**`
    ];

    return new EmbedBuilder()
        .setColor(win ? C.win : C.lose)
        .setAuthor({
            name: user.username,
            iconURL: user.displayAvatarURL({ size: 64 })
        })
        .setTitle(win ? '🪙  Cara ou Coroa · Você levou' : '🪙  Cara ou Coroa · A casa levou')
        .setDescription(lines.join('\n'))
        .setThumbnail(user.displayAvatarURL({ size: 128 }))
        .setFooter({ text: 'Cara 🟡 · Coroa ⚪ · ' + betFooter() })
        .setTimestamp();
}

function againRow(side, amount, userId) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`cara:again:${side}:${amount}:${userId}`)
            .setLabel('Tentar novamente')
            .setEmoji('🔁')
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId(`cara:switch:${side === 'cara' ? 'coroa' : 'cara'}:${amount}:${userId}`)
            .setLabel(side === 'cara' ? 'Jogar COROA' : 'Jogar CARA')
            .setEmoji(side === 'cara' ? '⚪' : '🟡')
            .setStyle(ButtonStyle.Secondary)
    );
}

function flipOnce(userId, amount) {
    // 50/50 realista
    const result = Math.random() < 0.5 ? 'cara' : 'coroa';
    return result;
}

async function runFlip({ replyFn, updateFn, user, userId, side, amount, isUpdate }) {
    // debita antes do giro
    flocos.remove(userId, amount, { reason: 'cara bet' });

    const total = SPIN_FRAMES.length;
    let msg = null;

    for (let i = 0; i < total; i++) {
        const embed = spinningEmbed({
            user,
            amount,
            choice: side,
            frame: SPIN_FRAMES[i],
            step: i,
            total
        });
        if (i === 0) {
            if (isUpdate && updateFn) {
                await updateFn({ embeds: [embed], components: [] });
            } else {
                msg = await replyFn({ embeds: [embed], components: [] });
            }
        } else if (isUpdate && updateFn) {
            await updateFn({ embeds: [embed], components: [] });
        } else if (msg) {
            await msg.edit({ embeds: [embed], components: [] }).catch(() => {});
        }
        await sleep(i < total - 1 ? 380 : 520);
    }

    const result = flipOnce(userId, amount);
    const win = result === side;
    if (win) flocos.add(userId, amount * 2, { reason: 'cara win' });

    const payload = {
        embeds: [
            resultEmbed({
                user,
                amount,
                choice: side,
                result,
                win,
                balance: flocos.get(userId)
            })
        ],
        components: [againRow(side, amount, userId)]
    };

    if (isUpdate && updateFn) {
        await updateFn(payload);
        return null;
    }
    if (msg) {
        await msg.edit(payload).catch(() => {});
        return msg;
    }
    return replyFn(payload);
}

module.exports = {
    name: 'cara',
    aliases: ['coroa', 'coinflip', 'cf', 'caracoroa'],
    description: 'Cara ou coroa realista · nível max',

    async execute(message, args) {
        const side = (args[0] || '').toLowerCase();
        if (!['cara', 'coroa'].includes(side)) {
            return message.reply(
                [
                    '🪙 **Cara ou Coroa**',
                    'Uso: `O.cara <cara|coroa> <valor|all|half|k|m>`',
                    '',
                    '🟡 **cara** · ⚪ **coroa**',
                    'Vitória paga **2×** · chance real **50/50**'
                ].join('\n')
            );
        }

        const bet = resolveBet(args[1], flocos.get(message.author.id), { label: '❄️' });
        if (!bet.ok) return message.reply(`❌ ${bet.error}`);

        await runFlip({
            replyFn: (p) => message.reply(p),
            user: message.author,
            userId: message.author.id,
            side,
            amount: bet.amount,
            isUpdate: false
        });
    },

    async handleComponent(interaction) {
        const parts = interaction.customId.split(':');
        // cara:again:side:amount:userId  |  cara:switch:side:amount:userId
        const action = parts[1];
        const side = parts[2];
        const amountStr = parts[3];
        const owner = parts[4];

        if (interaction.user.id !== owner) {
            return interaction.reply({ content: 'Não é a sua moeda.', ephemeral: true });
        }
        if (!['cara', 'coroa'].includes(side)) {
            return interaction.reply({ content: 'Dados inválidos.', ephemeral: true });
        }

        const bet = resolveBet(amountStr, flocos.get(owner), { label: '❄️' });
        if (!bet.ok) {
            return interaction.reply({ content: `❌ ${bet.error}`, ephemeral: true });
        }

        // acknowledge + animar via update
        await runFlip({
            updateFn: (p) => interaction.editReply(p),
            replyFn: (p) => interaction.editReply(p),
            user: interaction.user,
            userId: owner,
            side,
            amount: bet.amount,
            isUpdate: true
        });

        // primeira update precisa de defer se ainda não respondeu
        // runFlip chama updateFn — garantir defer antes
    }
};

// Wrapper: defer na interaction antes do giro (discord exige resposta em 3s)
const _handle = module.exports.handleComponent;
module.exports.handleComponent = async function handleComponent(interaction) {
    const parts = interaction.customId.split(':');
    const side = parts[2];
    const amountStr = parts[3];
    const owner = parts[4];

    if (interaction.user.id !== owner) {
        return interaction.reply({ content: 'Não é a sua moeda.', ephemeral: true });
    }
    if (!['cara', 'coroa'].includes(side)) {
        return interaction.reply({ content: 'Dados inválidos.', ephemeral: true });
    }

    const bet = resolveBet(amountStr, flocos.get(owner), { label: '❄️' });
    if (!bet.ok) {
        return interaction.reply({ content: `❌ ${bet.error}`, ephemeral: true });
    }

    await interaction.deferUpdate();

    await runFlip({
        updateFn: (p) => interaction.editReply(p),
        user: interaction.user,
        userId: owner,
        side,
        amount: bet.amount,
        isUpdate: true
    });
};
