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

const FUN_WIN = [
    'Só de zoeira — e você acertou.',
    'Modo diversão, mas a vitória foi real.',
    'Sem flocos em jogo… só o ego.'
];

const FUN_LOSE = [
    'Diversão pura. Sem prejuízo no bolso.',
    'Errou a face, mas não perdeu nada.',
    'A moeda riu de você — de graça.'
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

function spinningEmbed({ user, amount, choice, frame, step, total, fun }) {
    const dots = '•'.repeat(step + 1) + '·'.repeat(Math.max(0, total - step - 1));
    return new EmbedBuilder()
        .setColor(fun ? 0x38bdf8 : 0xfbbf24)
        .setAuthor({
            name: fun ? 'Aeternus · Cara ou Coroa · Diversão' : 'Aeternus Casino · Cara ou Coroa',
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
                fun
                    ? `${user} escolheu **${sideLabel(choice)}** ${sideEmoji(choice)} · 🎮 **modo diversão**`
                    : `${user} apostou ❄️ **${fmt(amount)}** em **${sideLabel(choice)}** ${sideEmoji(choice)}`,
                '',
                `🌀 Girando ${dots}`,
                '',
                fun
                    ? '_Sem aposta. Só a emoção do giro._'
                    : '_Ninguém respira. A face ainda não decidiu._'
            ].join('\n')
        )
        .setFooter({
            text: fun ? 'Modo diversão · sem flocos' : '50/50 real · ' + betFooter()
        })
        .setTimestamp();
}

function resultEmbed({ user, amount, choice, result, win, balance, fun }) {
    const payout = amount * 2;
    const line = fun
        ? (win ? FUN_WIN : FUN_LOSE)[Math.floor(Math.random() * 3)]
        : (win ? WIN_LINES : LOSE_LINES)[Math.floor(Math.random() * 5)];

    const face = result === 'cara' ? '🟡 CARA' : '⚪ COROA';

    const moneyBlock = fun
        ? win
            ? '🎉 **Acertou!**\n🎮 Diversão — nenhum floco movimentado.'
            : '💨 **Errou!**\n🎮 Diversão — seu saldo continua igual.'
        : win
          ? `🎉 **VITÓRIA**\n✨ +❄️ **${fmt(payout)}** (2×)`
          : `💥 **DERROTA**\n💫 −❄️ **${fmt(amount)}**`;

    const lines = [
        '```',
        '   ╔════════════════════════════╗',
        fun
            ? '   ║  COIN FLIP  ·  DIVERSÃO    ║'
            : '   ║   AETERNUS  ·  COIN FLIP   ║',
        '   ╚════════════════════════════╝',
        '```',
        fun ? '🎮 **Modo diversão**' : null,
        `🎯 Escolha: **${sideLabel(choice)}** ${sideEmoji(choice)}`,
        `🪙 Resultado: **${face}**`,
        '',
        moneyBlock,
        '',
        `_${line}_`,
        fun ? null : '',
        fun ? null : `💼 Saldo: ❄️ **${fmt(balance)}**`
    ].filter((x) => x != null);

    return new EmbedBuilder()
        .setColor(win ? C.win : C.lose)
        .setAuthor({
            name: user.username,
            iconURL: user.displayAvatarURL({ size: 64 })
        })
        .setTitle(
            fun
                ? win
                    ? '🪙  Diversão · Acertou'
                    : '🪙  Diversão · Errou'
                : win
                  ? '🪙  Cara ou Coroa · Você levou'
                  : '🪙  Cara ou Coroa · A casa levou'
        )
        .setDescription(lines.join('\n'))
        .setThumbnail(user.displayAvatarURL({ size: 128 }))
        .setFooter({
            text: fun
                ? 'O.cara <cara|coroa> · diversão · com valor = aposta'
                : 'Cara 🟡 · Coroa ⚪ · ' + betFooter()
        })
        .setTimestamp();
}

function againRow(side, amount, userId, fun) {
    const amt = fun ? 'fun' : String(amount);
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`cara:again:${side}:${amt}:${userId}`)
            .setLabel('Tentar novamente')
            .setEmoji('🔁')
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId(`cara:switch:${side === 'cara' ? 'coroa' : 'cara'}:${amt}:${userId}`)
            .setLabel(side === 'cara' ? 'Jogar COROA' : 'Jogar CARA')
            .setEmoji(side === 'cara' ? '⚪' : '🟡')
            .setStyle(ButtonStyle.Secondary)
    );
}

async function runFlip({ updateFn, replyFn, user, userId, side, amount, fun, isUpdate }) {
    if (!fun) {
        flocos.remove(userId, amount, { reason: 'cara bet' });
    }

    const total = SPIN_FRAMES.length;
    let msg = null;

    for (let i = 0; i < total; i++) {
        const embed = spinningEmbed({
            user,
            amount,
            choice: side,
            frame: SPIN_FRAMES[i],
            step: i,
            total,
            fun
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

    const result = Math.random() < 0.5 ? 'cara' : 'coroa';
    const win = result === side;
    if (!fun && win) {
        flocos.add(userId, amount * 2, { reason: 'cara win' });
    }

    const payload = {
        embeds: [
            resultEmbed({
                user,
                amount,
                choice: side,
                result,
                win,
                balance: flocos.get(userId),
                fun
            })
        ],
        components: [againRow(side, amount, userId, fun)]
    };

    if (isUpdate && updateFn) {
        await updateFn(payload);
        return;
    }
    if (msg) {
        await msg.edit(payload).catch(() => {});
        return;
    }
    await replyFn(payload);
}

module.exports = {
    name: 'cara',
    aliases: ['coroa', 'coinflip', 'cf', 'caracoroa'],
    description: 'Cara ou coroa · aposta ou diversão',

    async execute(message, args) {
        const side = (args[0] || '').toLowerCase();
        if (!['cara', 'coroa'].includes(side)) {
            return message.reply(
                [
                    '🪙 **Cara ou Coroa**',
                    '🎮 Diversão: `O.cara <cara|coroa>`',
                    '❄️ Aposta: `O.cara <cara|coroa> <valor|all|half>`',
                    '',
                    '🟡 **cara** · ⚪ **coroa** · vitória **2×**'
                ].join('\n')
            );
        }

        // sem valor → diversão
        if (args[1] == null || args[1] === '') {
            return runFlip({
                replyFn: (p) => message.reply(p),
                user: message.author,
                userId: message.author.id,
                side,
                amount: 0,
                fun: true,
                isUpdate: false
            });
        }

        const bet = resolveBet(args[1], flocos.get(message.author.id), { label: '❄️' });
        if (!bet.ok) return message.reply(`❌ ${bet.error}`);

        return runFlip({
            replyFn: (p) => message.reply(p),
            user: message.author,
            userId: message.author.id,
            side,
            amount: bet.amount,
            fun: false,
            isUpdate: false
        });
    },

    async handleComponent(interaction) {
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

        const fun = amountStr === 'fun';
        let amount = 0;

        if (!fun) {
            const bet = resolveBet(amountStr, flocos.get(owner), { label: '❄️' });
            if (!bet.ok) {
                return interaction.reply({ content: `❌ ${bet.error}`, ephemeral: true });
            }
            amount = bet.amount;
        }

        await interaction.deferUpdate();

        await runFlip({
            updateFn: (p) => interaction.editReply(p),
            user: interaction.user,
            userId: owner,
            side,
            amount,
            fun,
            isUpdate: true
        });
    }
};
