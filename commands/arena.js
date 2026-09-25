const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuBuilder
} = require('discord.js');
const player = require('../utils/player');
const arenaEngine = require('../utils/arenaEngine');
const eter = require('../utils/eter');
const { resolveBet } = require('../utils/parseAmount');

const BASE =
    process.env.RENDER_EXTERNAL_URL ||
    process.env.PANEL_URL ||
    'https://aeternus.onrender.com';

function panelUrl() {
    return BASE.replace(/\/$/, '') + '/arena';
}

function fightLinks(matchId, ids) {
    const base = panelUrl();
    return ids
        .map((id) => `<@${id}> → [Abrir luta](${base}?id=${matchId}&as=${id})`)
        .join('\n');
}

function parseTeams(args, authorId) {
    const vsIdx = args.findIndex((a) => /^vs$/i.test(a));
    const before = [];
    const after = [];
    if (vsIdx >= 0) {
        let side = before;
        for (const a of args) {
            if (/^vs$/i.test(a)) {
                side = after;
                continue;
            }
            const m = a.match(/^<@!?(\d+)>$/);
            if (m) side.push(m[1]);
        }
    } else {
        for (const a of args) {
            const m = a.match(/^<@!?(\d+)>$/);
            if (m) after.push(m[1]);
        }
    }
    const teamA = [authorId, ...before.filter((id) => id !== authorId)];
    // unique
    const uniq = (arr) => [...new Set(arr)];
    return { teamA: uniq(teamA), teamB: uniq(after.filter((id) => id !== authorId)) };
}

function parseBet(args, maxBal) {
    const { looksLikeAmount } = require('../utils/parseAmount');
    const raw = args.find(
        (a) => !a.startsWith('<@') && !/^vs$/i.test(a) && looksLikeAmount(a)
    );
    if (!raw) return { ok: true, amount: 0 };
    return resolveBet(raw, maxBal, { label: '✨' });
}

async function lockBets(ids, amount) {
    for (const id of ids) {
        if ((eter.get(id) || 0) < amount) {
            return { ok: false, error: `<@${id}> não tem ✨ suficiente (**${amount}**).` };
        }
    }
    for (const id of ids) {
        eter.remove(id, amount, { reason: 'pvp_bet_lock' });
    }
    return { ok: true };
}

function modeEmbed() {
    return new EmbedBuilder()
        .setColor(0xc9a227)
        .setTitle('⚔️ PvP — Escolha o modo')
        .setDescription(
            [
                '**🎮 Diversão** — 1v1 sem risco. XP leve, sem CP/itens/aposta.',
                '**💰 Aposta** — 1v1 com ✨ em jogo. Vencedor leva o pote + drops.',
                '**🛡️ Equipes** — times iguais (2v2, 3v3…). Recompensas de combate.',
                '**💰🛡️ Equipes + Aposta** — times com ✨ em jogo.',
                '',
                '**Atalhos**',
                '`O.pvp diversao @user`',
                '`O.pvp aposta @user 1000`',
                '`O.pvp equipes @aliado vs @inimigo1 @inimigo2`',
                '`O.pvp equipe-aposta @aliado vs @e1 @e2 500`',
                '',
                'Ou use o menu abaixo.'
            ].join('\n')
        )
        .setFooter({ text: 'O.pvp · O.arena · O.duelo' });
}

function modeMenu() {
    return new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId('pvp:mode')
            .setPlaceholder('Escolher modo de PvP')
            .addOptions([
                {
                    label: 'Diversão (1v1)',
                    value: 'diversao',
                    emoji: '🎮',
                    description: 'Sem aposta, XP leve'
                },
                {
                    label: 'Aposta (1v1)',
                    value: 'aposta',
                    emoji: '💰',
                    description: 'Aposte ✨ e dispute drops'
                },
                {
                    label: 'Equipes',
                    value: 'equipe',
                    emoji: '🛡️',
                    description: '2v2 / 3v3 sem aposta'
                },
                {
                    label: 'Equipes + Aposta',
                    value: 'equipe_aposta',
                    emoji: '🪙',
                    description: 'Times com ✨ em jogo'
                }
            ])
    );
}

async function startMatch(message, { teamA, teamB, bet, fun, modeLabel }) {
    for (const id of [...teamA, ...teamB]) {
        if (!player.has(id)) {
            return message.reply(`<@${id}> ainda não tem perfil (\`O.j criar\`).`);
        }
    }
    if (teamA.length !== teamB.length) {
        return message.reply('Os times precisam ter o **mesmo número** de jogadores.');
    }
    if (!teamB.length) {
        return message.reply('Informe o(s) oponente(s).');
    }

    if (bet > 0) {
        const lock = await lockBets([...teamA, ...teamB], bet);
        if (!lock.ok) return message.reply(lock.error);
    }

    const result = arenaEngine.createMatch({
        mode: fun ? 'diversao' : bet > 0 ? (teamA.length > 1 ? 'equipe_aposta' : 'aposta') : teamA.length > 1 ? 'equipe' : '1v1',
        teamA,
        teamB,
        bet: fun ? 0 : bet,
        fun
    });
    if (!result.ok) return message.reply(result.error);

    const all = [...teamA, ...teamB];
    const embed = new EmbedBuilder()
        .setColor(fun ? 0x22c55e : bet > 0 ? 0xf59e0b : 0xc9a227)
        .setTitle(modeLabel)
        .setDescription(
            [
                bet > 0 ? `💰 Aposta: **${bet}** ✨ por jogador (pote: **${bet * all.length}**)` : 'Sem aposta',
                fun ? '🎮 Modo diversão — sem risco de itens/CP' : '',
                `🛡️ ${teamA.length}v${teamB.length}`,
                '',
                fightLinks(result.match.id, all),
                '',
                fun
                    ? '_Vitória: XP leve._'
                    : bet > 0
                      ? '_Vitória: pote de ✨ + XP + CP + 3–5 itens._'
                      : '_Vitória: XP + CP + 3–5 itens._'
            ]
                .filter(Boolean)
                .join('\n')
        )
        .setFooter({ text: `Match ${result.match.id}` })
        .setTimestamp();

    return message.reply({ embeds: [embed] });
}

module.exports = {
    name: 'arena',
    aliases: ['pvp', 'duelo', 'batalha'],
    description: 'PvP: diversão, aposta, equipes e equipes+aposta',

    async execute(message, args) {
        if (!player.has(message.author.id)) {
            return message.reply('Crie seu perfil com `O.j criar`.');
        }

        const modeRaw = String(args[0] || '').toLowerCase();
        const modes = {
            diversao: 'diversao',
            diversão: 'diversao',
            fun: 'diversao',
            aposta: 'aposta',
            bet: 'aposta',
            equipes: 'equipe',
            equipe: 'equipe',
            time: 'equipe',
            team: 'equipe',
            'equipe-aposta': 'equipe_aposta',
            'equipes-aposta': 'equipe_aposta',
            equipeaposta: 'equipe_aposta',
            equipesa: 'equipe_aposta',
            ranked: 'aposta'
        };

        // Sem args ou só help → menu
        if (!args.length || modeRaw === 'help' || modeRaw === 'ajuda' || modeRaw === 'modos') {
            return message.reply({ embeds: [modeEmbed()], components: [modeMenu()] });
        }

        const mode = modes[modeRaw];
        const rest = mode ? args.slice(1) : args;

        // Se primeiro arg não é modo mas tem menção → 1v1 padrão (aposta se número)
        const { teamA, teamB } = parseTeams(rest.length ? rest : args, message.author.id);
        const betRes = parseBet(rest.length ? rest : args, eter.get(message.author.id) || 0);
        if (!betRes.ok) return message.reply(betRes.error);

        if (mode === 'diversao') {
            if (teamB.length !== 1 || teamA.length !== 1) {
                return message.reply('**Diversão:** `O.pvp diversao @oponente`');
            }
            return startMatch(message, {
                teamA,
                teamB,
                bet: 0,
                fun: true,
                modeLabel: '🎮 PvP · Diversão'
            });
        }

        if (mode === 'aposta') {
            if (teamB.length !== 1 || teamA.length !== 1) {
                return message.reply('**Aposta:** `O.pvp aposta @oponente <valor>`');
            }
            if (betRes.amount <= 0) {
                return message.reply('Informe o valor da aposta. Ex.: `O.pvp aposta @user 1000`');
            }
            return startMatch(message, {
                teamA,
                teamB,
                bet: betRes.amount,
                fun: false,
                modeLabel: '💰 PvP · Aposta 1v1'
            });
        }

        if (mode === 'equipe') {
            if (teamB.length < 1 || teamA.length < 1) {
                return message.reply(
                    '**Equipes:** `O.pvp equipes @aliado vs @inimigo1 @inimigo2`\n' +
                        'Times com a **mesma quantidade** de jogadores.'
                );
            }
            return startMatch(message, {
                teamA,
                teamB,
                bet: 0,
                fun: false,
                modeLabel: `🛡️ PvP · Equipes ${teamA.length}v${teamB.length}`
            });
        }

        if (mode === 'equipe_aposta') {
            if (teamB.length < 1 || teamA.length < 1) {
                return message.reply(
                    '**Equipes + Aposta:** `O.pvp equipe-aposta @aliado vs @e1 @e2 500`'
                );
            }
            if (betRes.amount <= 0) {
                return message.reply('Informe o valor da aposta por jogador.');
            }
            return startMatch(message, {
                teamA,
                teamB,
                bet: betRes.amount,
                fun: false,
                modeLabel: `💰🛡️ PvP · Equipes + Aposta ${teamA.length}v${teamB.length}`
            });
        }

        // Atalho: O.pvp @user [valor] → aposta se valor, senão diversão
        if (teamB.length === 1 && teamA.length === 1) {
            if (betRes.amount > 0) {
                return startMatch(message, {
                    teamA,
                    teamB,
                    bet: betRes.amount,
                    fun: false,
                    modeLabel: '💰 PvP · Aposta 1v1'
                });
            }
            return startMatch(message, {
                teamA,
                teamB,
                bet: 0,
                fun: true,
                modeLabel: '🎮 PvP · Diversão'
            });
        }

        // Atalho equipes com vs
        if (teamB.length >= 1 && args.some((a) => /^vs$/i.test(a))) {
            if (betRes.amount > 0) {
                return startMatch(message, {
                    teamA,
                    teamB,
                    bet: betRes.amount,
                    fun: false,
                    modeLabel: `💰🛡️ PvP · Equipes + Aposta ${teamA.length}v${teamB.length}`
                });
            }
            return startMatch(message, {
                teamA,
                teamB,
                bet: 0,
                fun: false,
                modeLabel: `🛡️ PvP · Equipes ${teamA.length}v${teamB.length}`
            });
        }

        return message.reply({ embeds: [modeEmbed()], components: [modeMenu()] });
    },

    async handleComponent(interaction) {
        if (interaction.customId !== 'pvp:mode') return false;
        const value = interaction.values?.[0];
        const tips = {
            diversao: 'Use: `O.pvp diversao @oponente`',
            aposta: 'Use: `O.pvp aposta @oponente <valor>`',
            equipe: 'Use: `O.pvp equipes @aliado vs @inimigo1 @inimigo2`',
            equipe_aposta: 'Use: `O.pvp equipe-aposta @aliado vs @e1 @e2 <valor>`'
        };
        await interaction.reply({
            content: tips[value] || 'Modo inválido.',
            ephemeral: true
        });
        return true;
    }
};
