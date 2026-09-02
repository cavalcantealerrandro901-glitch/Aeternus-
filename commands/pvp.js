const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');
const eter = require('../utils/eter');
const { parseAmount } = require('../utils/parseAmount');

const pending = new Map();
const COOLDOWN_MS = 15_000;
const lastFight = new Map();
const BOT_ACCEPT_DELAY_MS = 1500;

const HITS = [
    'desferiu um golpe preciso',
    'acertou um combo devastador',
    'esquivou e contra-atacou',
    'usou um golpe especial',
    'lançou uma rajada de energia',
    'feriu o oponente com agilidade',
    'bloqueou e revidou forte'
];

function fightKey(a, b) {
    return [a, b].sort().join(':');
}

function rollFight(aId, bId) {
    let scoreA = 0;
    let scoreB = 0;
    const log = [];
    let round = 1;
    while (scoreA < 2 && scoreB < 2 && round <= 5) {
        const aHit = Math.random();
        const bHit = Math.random();
        if (aHit === bHit) continue;
        const winner = aHit > bHit ? aId : bId;
        if (winner === aId) scoreA++;
        else scoreB++;
        const move = HITS[Math.floor(Math.random() * HITS.length)];
        log.push(`Round ${round}: <@${winner}> ${move}!`);
        round++;
    }
    const winnerId = scoreA > scoreB ? aId : bId;
    const loserId = winnerId === aId ? bId : aId;
    return { winnerId, loserId, log, scoreA, scoreB };
}

function challengeRow(challengerId, targetId, bet) {
    const betPart = String(Math.max(0, Math.floor(bet || 0)));
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`pvp:accept:${challengerId}:${targetId}:${betPart}`)
            .setLabel('Aceitar')
            .setStyle(ButtonStyle.Success)
            .setEmoji('⚔️'),
        new ButtonBuilder()
            .setCustomId(`pvp:decline:${challengerId}:${targetId}:${betPart}`)
            .setLabel('Recusar')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('❌')
    );
}

function disabledRow() {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('pvp:done:x:x:0')
            .setLabel('Encerrado')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(true)
    );
}

/**
 * Resolve o duelo (aposta + combate + mensagem).
 * vsBot: só o humano paga a aposta; se ganhar recebe 2x; se perder, perde a aposta.
 */
function settleFight(challengerId, targetId, bet, vsBot) {
    if (bet > 0) {
        if (vsBot) {
            if (eter.get(challengerId) < bet) {
                return { error: '❌ Você não tem éter suficiente.' };
            }
            eter.remove(challengerId, bet, { reason: 'pvp_bet' });
        } else {
            if (eter.get(challengerId) < bet || eter.get(targetId) < bet) {
                return { error: '❌ Alguém ficou sem éter suficiente. Duelo cancelado.' };
            }
            eter.remove(challengerId, bet, { reason: 'pvp_bet' });
            eter.remove(targetId, bet, { reason: 'pvp_bet' });
        }
    }

    const result = rollFight(challengerId, targetId);

    if (bet > 0) {
        if (vsBot) {
            if (result.winnerId === challengerId) {
                eter.add(challengerId, bet * 2, { reason: 'pvp_win' });
            }
            // se o bot ganhou, a aposta já foi removida
        } else {
            eter.add(result.winnerId, bet * 2, { reason: 'pvp_win' });
        }
    }

    const lines = [
        `⚔️ **PVP** · <@${challengerId}> vs <@${targetId}>${vsBot ? ' · _bot_' : ''}`,
        '',
        ...result.log,
        '',
        `🏆 Vencedor: <@${result.winnerId}>`,
        `💥 Derrotado: <@${result.loserId}>`
    ];

    if (bet > 0) {
        if (vsBot) {
            if (result.winnerId === challengerId) {
                lines.push(
                    `🎁 Você ganhou **${eter.formatPlain(bet * 2)}** éter!`
                );
            } else {
                lines.push(
                    `💸 Você perdeu **${eter.formatPlain(bet)}** éter.`
                );
            }
        } else {
            lines.push(
                `🎁 Pot: **${eter.formatPlain(bet * 2)}** éter para o vencedor!`
            );
        }
    } else {
        lines.push('_Duelo amistoso — sem aposta._');
    }

    return { result, content: lines.join('\n') };
}

module.exports = {
    name: 'pvp',
    aliases: ['duelo', 'desafiar', 'luta'],
    description: 'Desafia usuário ou bot para PVP (bots aceitam automaticamente)',

    async execute(message, args) {
        const target =
            message.mentions.users.first() ||
            (args[0] && (await message.client.users.fetch(args[0]).catch(() => null)));

        if (!target) {
            return message.reply(
                'Uso: `O.pvp @usuário|@bot [aposta]`\nExemplo: `O.pvp @fulano 500`'
            );
        }

        if (target.id === message.author.id) {
            return message.reply('Você não pode duelar consigo mesmo.');
        }

        const vsBot = !!target.bot;

        const betRaw = args.find((a) => !/^<@!?\d+>$/.test(a) && a !== target.id);
        let bet = 0;
        if (betRaw) {
            const amount = parseAmount(betRaw, eter.get(message.author.id));
            if (!Number.isFinite(amount) || amount < 0) {
                return message.reply('Aposta inválida. Use número, `1k`, `all`, etc.');
            }
            bet = Math.floor(amount);
        }

        if (bet > 0) {
            if (eter.get(message.author.id) < bet) {
                return message.reply('Você não tem éter suficiente para essa aposta.');
            }
            // contra humano: os dois precisam ter saldo; contra bot: só o desafiante
            if (!vsBot && eter.get(target.id) < bet) {
                return message.reply(`${target} não tem éter suficiente para essa aposta.`);
            }
        }

        const key = fightKey(message.author.id, target.id);
        const now = Date.now();
        if (pending.has(key)) {
            return message.reply('Já existe um desafio pendente entre vocês.');
        }
        const cd = lastFight.get(key) || 0;
        if (now - cd < COOLDOWN_MS) {
            return message.reply('Aguarde alguns segundos antes de outro duelo.');
        }

        // —— vs BOT: aceita automaticamente ——
        if (vsBot) {
            lastFight.set(key, now);

            const waitMsg = await message.channel.send({
                content: [
                    `⚔️ **Desafio PVP**`,
                    `${message.author} desafiou ${target} *(bot)*!`,
                    bet > 0
                        ? `Aposta: **${eter.formatPlain(bet)}** éter (1x ou 2x se ganhar)`
                        : 'Duelo amistoso (sem aposta).',
                    '',
                    `🤖 O bot está aceitando automaticamente…`
                ].join('\n')
            });

            await new Promise((r) => setTimeout(r, BOT_ACCEPT_DELAY_MS));

            const settled = settleFight(message.author.id, target.id, bet, true);
            if (settled.error) {
                return waitMsg.edit({ content: settled.error }).catch(() => {});
            }

            await waitMsg
                .edit({
                    content: `⚔️ ${target} **aceitou** automaticamente! Combate em andamento…`
                })
                .catch(() => {});

            await message.channel.send({ content: settled.content }).catch(() => {});
            return;
        }

        // —— vs HUMANO: botão Aceitar ——
        pending.set(key, {
            challengerId: message.author.id,
            targetId: target.id,
            bet,
            channelId: message.channel.id,
            at: now
        });

        setTimeout(() => {
            if (pending.get(key)?.at === now) pending.delete(key);
        }, 60_000);

        const betLine =
            bet > 0
                ? `Aposta: **${eter.formatPlain(bet)}** éter cada (pot **${eter.formatPlain(bet * 2)}**)`
                : 'Duelo amistoso (sem aposta).';

        await message.channel.send({
            content: [
                `⚔️ **Desafio PVP**`,
                `${message.author} desafiou ${target}!`,
                betLine,
                '',
                `${target}, clique em **Aceitar** para lutar (expira em 60s).`
            ].join('\n'),
            components: [challengeRow(message.author.id, target.id, bet)]
        });
    },

    async handleComponent(interaction) {
        const id = interaction.customId || '';
        if (!id.startsWith('pvp:')) return;

        const parts = id.split(':');
        const action = parts[1];
        const challengerId = parts[2];
        const targetId = parts[3];
        const bet = Math.max(0, Math.floor(Number(parts[4]) || 0));

        if (action === 'done') {
            return interaction.deferUpdate().catch(() => {});
        }

        const key = fightKey(challengerId, targetId);
        const challenge = pending.get(key);

        if (action === 'decline') {
            if (interaction.user.id !== targetId && interaction.user.id !== challengerId) {
                return interaction.reply({
                    content: 'Só quem foi desafiado (ou o desafiante) pode recusar.',
                    ephemeral: true
                });
            }
            pending.delete(key);
            await interaction.update({
                content: `❌ Desafio cancelado por ${interaction.user}.`,
                components: [disabledRow()]
            });
            return;
        }

        if (action === 'accept') {
            if (interaction.user.id !== targetId) {
                return interaction.reply({
                    content: 'Só quem foi desafiado pode aceitar.',
                    ephemeral: true
                });
            }

            if (!challenge) {
                return interaction.update({
                    content: '⏰ Este desafio expirou.',
                    components: [disabledRow()]
                });
            }

            pending.delete(key);
            lastFight.set(key, Date.now());

            const settled = settleFight(challengerId, targetId, bet, false);
            if (settled.error) {
                return interaction.update({
                    content: settled.error,
                    components: [disabledRow()]
                });
            }

            await interaction.update({
                content: `⚔️ ${interaction.user} **aceitou** o duelo! Preparando o combate…`,
                components: [disabledRow()]
            });

            await interaction.channel.send({ content: settled.content }).catch(() => {});
        }
    }
};
