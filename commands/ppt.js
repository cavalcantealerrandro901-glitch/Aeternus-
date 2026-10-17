const { EmbedBuilder, SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const eter = require('../utils/eter');
const { resolveBet } = require('../utils/parseAmount');

const CHOICES = {
    pedra: { label: 'Pedra', emoji: '✊', beats: 'tesoura' },
    papel: { label: 'Papel', emoji: '🖐️', beats: 'pedra' },
    tesoura: { label: 'Tesoura', emoji: '✌️', beats: 'papel' }
};
const games = new Map();
const GAME_TIMEOUT = 2 * 60 * 1000;

function fmt(n) {
    return Number(n || 0).toLocaleString('pt-BR');
}

function outcome(a, b) {
    if (a === b) return 'empate';
    return CHOICES[a].beats === b ? 'vitoria' : 'derrota';
}

function gameEmbed(game, result = false) {
    const desc = result
        ? [
            `👤 <@${game.challenger}>: ${CHOICES[game.choices[game.challenger]].emoji} **${CHOICES[game.choices[game.challenger]].label}**`,
            `🎯 <@${game.opponent}>: ${CHOICES[game.choices[game.opponent]].emoji} **${CHOICES[game.choices[game.opponent]].label}**`,
            '',
            game.result === 'empate'
                ? '🤝 **Empate!** As escolhas foram iguais.'
                : `🏆 **Vencedor: ${game.result === 'vitoria' ? game.challengerName : game.opponentName}**`,
            game.bet ? (game.result === 'empate'
                ? `✨ A aposta de **${fmt(game.bet)} éter** foi devolvida para cada jogador.`
                : `💰 O vencedor recebeu **${fmt(game.bet * 2)} éter**.`) : '🎮 Partida por diversão.'
        ].join('\\n')
        : [
            `👤 <@${game.challenger}> contra <@${game.opponent}>`,
            game.bet ? `💰 Aposta: **${fmt(game.bet)} éter por jogador**` : '🎮 Modo diversão • sem aposta',
            '',
            `<@${game.challenger}>, escolha sua jogada nos botões.`,
            `<@${game.opponent}>, escolha também. As escolhas ficam ocultas até ambos decidirem.`,
            '',
            `Status: ${game.choices[game.challenger] ? '✅' : '⏳'} ${game.challengerName} • ${game.choices[game.opponent] ? '✅' : '⏳'} ${game.opponentName}`
        ].join('\\n');

    return new EmbedBuilder()
        .setColor(result ? (game.result === 'empate' ? 0xf59e0b : 0x8b5cf6) : 0x8b5cf6)
        .setTitle(result ? '✦ AETERNUS • PEDRA, PAPEL E TESOURA' : '✦ AETERNUS • DESAFIO PPT')
        .setDescription(desc)
        .setFooter({ text: result ? 'Partida encerrada' : 'Cada jogador pode escolher apenas uma vez.' });
}

function gameButtons(game, disabled = false) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`ppt:${game.id}:pedra`).setLabel('Pedra').setEmoji('✊').setStyle(ButtonStyle.Secondary).setDisabled(disabled),
        new ButtonBuilder().setCustomId(`ppt:${game.id}:papel`).setLabel('Papel').setEmoji('🖐️').setStyle(ButtonStyle.Primary).setDisabled(disabled),
        new ButtonBuilder().setCustomId(`ppt:${game.id}:tesoura`).setLabel('Tesoura').setEmoji('✌️').setStyle(ButtonStyle.Success).setDisabled(disabled)
    );
}

async function startGame({ challenger, opponent, channel, bet = 0 }) {
    if (!opponent) return { error: 'Mencione uma pessoa válida para desafiar.' };
    if (challenger.id === opponent.id) return { error: 'Você não pode jogar contra si mesmo.' };
    if (bet > 0) {
        if (eter.get(challenger.id) < bet) return { error: 'Você não tem éter suficiente para essa aposta.' };
        if (eter.get(opponent.id) < bet) return { error: `${opponent.username} não tem éter suficiente para cobrir a aposta de ${fmt(bet)}.` };
    }

    const id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
    const game = {
        id, challenger: challenger.id, opponent: opponent.id,
        challengerName: challenger.globalName || challenger.username,
        opponentName: opponent.globalName || opponent.username,
        choices: {}, bet, channel, done: false
    };
    // Bots escolhem automaticamente uma jogada aleatória.
    if (opponent.bot) {
        const options = Object.keys(CHOICES);
        game.choices[opponent.id] = options[Math.floor(Math.random() * options.length)];
    }
    games.set(id, game);
    game.timeout = setTimeout(async () => {
        if (game.done) return;
        game.done = true;
        games.delete(id);
        await game.message.edit({
            embeds: [new EmbedBuilder().setColor(0x64748b).setTitle('⌛ Desafio PPT expirado')
                .setDescription('A partida foi cancelada porque os dois jogadores não escolheram a tempo.')],
            components: [gameButtons(game, true)]
        }).catch(() => {});
    }, GAME_TIMEOUT);

    try {
        game.message = await channel.send({ content: `🎮 Desafio: <@${game.challenger}> contra <@${game.opponent}>`, allowedMentions: { users: [game.challenger, game.opponent] }, embeds: [gameEmbed(game)], components: [gameButtons(game)] });
    } catch (e) {
        clearTimeout(game.timeout);
        games.delete(id);
        throw e;
    }
    return { game };
}

async function settle(game) {
    game.done = true;
    clearTimeout(game.timeout);
    const a = game.choices[game.challenger];
    const b = game.choices[game.opponent];
    game.result = outcome(a, b);

    if (game.bet > 0) {
        // Revalidar os saldos antes de movimentar a moeda.
        if (eter.get(game.challenger) < game.bet || eter.get(game.opponent) < game.bet) {
            game.result = 'cancelada';
            games.delete(game.id);
            await game.message.edit({
                embeds: [new EmbedBuilder().setColor(0xef4444).setTitle('Partida cancelada')
                    .setDescription('Um dos jogadores não tem mais éter suficiente. Nenhuma aposta foi cobrada.')],
                components: [gameButtons(game, true)]
            });
            return;
        }
        if (game.result !== 'empate') {
            const winner = game.result === 'vitoria' ? game.challenger : game.opponent;
            const loser = winner === game.challenger ? game.opponent : game.challenger;
            eter.remove(game.challenger, game.bet, { reason: 'ppt aposta' });
            eter.remove(game.opponent, game.bet, { reason: 'ppt aposta' });
            eter.add(winner, game.bet * 2, { reason: 'ppt premio' });
        }
    }
    games.delete(game.id);
    await game.message.edit({ embeds: [gameEmbed(game, true)], components: [gameButtons(game, true)] });
}

module.exports = {
    name: 'ppt',
    aliases: ['jokenpo', 'rps'],
    description: 'Pedra, papel e tesoura contra pessoas ou bots',
    data: new SlashCommandBuilder()
        .setName('jokenpo')
        .setDescription('Desafie uma pessoa ou bot para pedra, papel e tesoura')
        .addUserOption(o => o.setName('adversario').setDescription('Pessoa ou bot que você quer desafiar').setRequired(true))
        .addStringOption(o => o.setName('valor').setDescription('Aposta em éter (opcional; vazio = diversão)').setRequired(false)),

    async execute(message, args) {
        const opponent = message.mentions?.users?.first?.();
        if (!opponent) return message.reply('Uso: `O.ppt @usuário [valor]` • Sem valor, é por diversão.');
        let bet = 0;
        const raw = args.find((a) => !/^<@!?\d+>$/.test(a)) || '';
        if (raw) {
            const resolved = resolveBet(raw, eter.get(message.author.id), { label: '✨' });
            if (!resolved.ok) return message.reply(`❌ ${resolved.error}`);
            bet = resolved.amount;
            if (bet <= 0) return message.reply('A aposta precisa ser maior que zero.');
        }
        const result = await startGame({ challenger: message.author, opponent, channel: message.channel, bet });
        if (result.error) return message.reply(`❌ ${result.error}`);
    },

    async executeSlash(i) {
        const opponent = i.options.getUser('adversario', true);
        const raw = i.options.getString('valor') || '';
        let bet = 0;
        if (raw.trim()) {
            const resolved = resolveBet(raw, eter.get(i.user.id), { label: '✨' });
            if (!resolved.ok) return i.reply({ content: `❌ ${resolved.error}`, ephemeral: true });
            bet = resolved.amount;
            if (bet <= 0) return i.reply({ content: 'A aposta precisa ser maior que zero.', ephemeral: true });
        }
        const result = await startGame({ challenger: i.user, opponent, channel: i.channel, bet });
        if (result.error) return i.reply({ content: `❌ ${result.error}`, ephemeral: true });
        return i.reply({ content: '🎮 Desafio criado!', ephemeral: true });
    },

    async handleComponent(i) {
        const [, id, choice] = String(i.customId || '').split(':');
        const game = games.get(id);
        if (!game || game.done) return i.reply({ content: 'Esta partida expirou ou já terminou.', ephemeral: true });
        if (!CHOICES[choice]) return i.reply({ content: 'Jogada inválida.', ephemeral: true });
        if (i.user.id !== game.challenger && i.user.id !== game.opponent) {
            return i.reply({ content: 'Só os dois jogadores desta partida podem escolher.', ephemeral: true });
        }
        if (game.choices[i.user.id]) return i.reply({ content: 'Você já escolheu sua jogada.', ephemeral: true });
        game.choices[i.user.id] = choice;
        await i.deferUpdate();
        if (game.choices[game.challenger] && game.choices[game.opponent]) {
            await settle(game);
        } else {
            await game.message.edit({ embeds: [gameEmbed(game)], components: [gameButtons(game)] });
        }
    }
};
