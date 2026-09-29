const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    SlashCommandBuilder
} = require('discord.js');
const xp = require('../utils/xp');

function fmt(n) {
    return Number(n || 0).toLocaleString('pt-BR');
}

function bar(pct, size = 14) {
    const p = Math.max(0, Math.min(100, Number(pct) || 0));
    const filled = Math.round((p / 100) * size);
    return '█'.repeat(filled) + '░'.repeat(size - filled);
}

function titleForLevel(level) {
    if (level >= 100) return { emoji: '🌌', name: 'Cósmico' };
    if (level >= 75) return { emoji: '👑', name: 'Soberano' };
    if (level >= 50) return { emoji: '💎', name: 'Diamante' };
    if (level >= 35) return { emoji: '🏆', name: 'Mestre' };
    if (level >= 25) return { emoji: '⚔️', name: 'Veterano' };
    if (level >= 15) return { emoji: '🎯', name: 'Experiente' };
    if (level >= 8) return { emoji: '📘', name: 'Aprendiz' };
    if (level >= 3) return { emoji: '🌱', name: 'Iniciante' };
    return { emoji: '⭐', name: 'Novato' };
}

async function respond(ctx, payload) {
    const data = typeof payload === 'string' ? { content: payload } : payload;
    if (ctx.isChatInputCommand?.() || ctx.isButton?.()) {
        if (ctx.deferred || ctx.replied) return ctx.editReply(data);
        return ctx.reply(data);
    }
    return ctx.reply(data);
}

function profileEmbed(user, p, rankInfo) {
    p = p || {
        level: 0,
        totalXp: 0,
        current: 0,
        need: 1000,
        pct: 0,
        toNext: 1000,
        mult: 1,
        nextLevelTotal: 1000
    };
    const st = xp.get(user.id);
    const title = titleForLevel(p.level);
    const nextTotal = p.nextLevelTotal != null ? p.nextLevelTotal : (p.level + 1) * 1000;

    const lines = [
        `${title.emoji} **Título:** ${title.name}`,
        '',
        `🎚️ **Nível** **${p.level}**`,
        `✨ **XP total** · **${fmt(p.totalXp)}** _(não é gasto ao upar)_`,
        `🎯 Próximo nível em **${fmt(nextTotal)}** XP total`,
        '',
        '**Progresso no nível atual**',
        `\`${bar(p.pct)}\` **${p.pct}%**`,
        `🔹 ${fmt(p.current)} / ${fmt(p.need)} XP neste nível`,
        `⏳ Faltam **${fmt(p.toNext)}** XP para o nível **${p.level + 1}**`,
        '',
        `🃏 **Pontos de atributo:** **${fmt(st.attrPoints || 0)}**`,
        '_Distribua em `O.j atributos` · +5 por nível_',
        '',
        `🎁 **Multiplicador do Daily:** ×**${Number(p.mult ?? 1).toFixed(2)}**`,
        '_Cada nível aumenta o daily (máx. ×3.00)._',
        '',
        rankInfo
            ? `🏅 **Ranking XP:** #**${rankInfo.rank}** de ${fmt(rankInfo.total)}`
            : ''
    ].filter(Boolean);

    return new EmbedBuilder()
        .setColor(0xa78bfa)
        .setAuthor({
            name: `${user.globalName || user.username} · Experiência`,
            iconURL: user.displayAvatarURL({ size: 64 })
        })
        .setTitle(`${title.emoji}  Nível ${p.level}`)
        .setDescription(lines.join('\n'))
        .setThumbnail(user.displayAvatarURL({ size: 256 }))
        .setFooter({
            text: 'XP cumulativo · 1000 XP por nível · O.xp · /nivel'
        })
        .setTimestamp();
}

function leaderboardEmbed(client, list) {
    const medals = ['🥇', '🥈', '🥉'];
    const lines = (list || []).map((e, i) => {
        const medal = medals[i] || `**#${i + 1}**`;
        const name = client.users.cache.get(e.userId)?.username || `ID ${e.userId}`;
        return `${medal} **@${name}** = ID [\`${e.userId}\`]\n   ⭐ **${fmt(e.xp)}** XP · Nv. **${e.level}**`;
    });

    return new EmbedBuilder()
        .setColor(0xa78bfa)
        .setTitle('AETERNUS RANK XP · GLOBAL')
        .setDescription(
            lines.length
                ? lines.join('\n\n')
                : '_Ninguém no ranking ainda. Converse no chat!_'
        )
        .setFooter({ text: 'Aeternus rank XP • total acumulado • 1000 XP = 1 nível' })
        .setTimestamp();
}

function helpEmbed() {
    return new EmbedBuilder()
        .setColor(0xa78bfa)
        .setTitle('📖 Como funciona o XP')
        .setDescription(
            [
                '**Sistema cumulativo**',
                '• O XP **nunca some** ao subir de nível.',
                '• Nível **1** = **1.000** XP total',
                '• Nível **2** = **2.000** XP total',
                '• Nível **3** = **3.000** XP total',
                '• E assim por diante (**+1.000** por nível).',
                '',
                '**Como ganhar**',
                '• Conversando no chat (com cooldown)',
                '• Masmorra, PvP, eventos e recompensas',
                '• Admins: `/dar-xp` · `/editar-xp`',
                '• Entre jogadores: `/transferir-xp`',
                '',
                '**Ao subir de nível**',
                '• **+5** pontos de atributo livres',
                '• Bônus aleatório nos atributos',
                '• Daily um pouco maior (até ×3)',
                '',
                '**Comandos**',
                '`O.xp` / `/nivel` — seu progresso',
                '`O.xp rank` / `O.rank xp global` — ranking',
                '`O.j atributos` — gastar pontos',
                '`O.xp info` — esta ajuda'
            ].join('\n')
        )
        .setFooter({ text: 'Aeternus · XP' });
}

function rows() {
    return [
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('xp:me')
                .setLabel('Meu XP')
                .setEmoji('⭐')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('xp:rank')
                .setLabel('Ranking')
                .setEmoji('🏆')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('xp:info')
                .setLabel('Como funciona')
                .setEmoji('📖')
                .setStyle(ButtonStyle.Secondary)
        )
    ];
}

function parseSub(args) {
    const a = String(args?.[0] || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
    if (['rank', 'ranking', 'top', 'leaderboard', 'lb'].includes(a)) return 'rank';
    if (['info', 'help', 'ajuda', 'como'].includes(a)) return 'info';
    return 'me';
}

module.exports = {
    name: 'xp',
    aliases: ['level', 'nivel', 'nível', 'lvl', 'rankxp', 'experiencia', 'experiência'],
    description: 'XP cumulativo, nível, ranking e pontos de atributo',
    data: new SlashCommandBuilder()
        .setName('nivel')
        .setDescription('Ver nível e XP (sistema cumulativo)')
        .addUserOption((o) =>
            o.setName('usuario').setDescription('Ver XP de outro usuário').setRequired(false)
        )
        .addStringOption((o) =>
            o
                .setName('acao')
                .setDescription('perfil | ranking | info')
                .setRequired(false)
                .addChoices(
                    { name: 'Meu progresso', value: 'me' },
                    { name: 'Ranking', value: 'rank' },
                    { name: 'Como funciona', value: 'info' }
                )
        ),

    async execute(message, args) {
        const sub = parseSub(args);
        if (sub === 'rank') {
            return message.reply({
                embeds: [leaderboardEmbed(message.client, xp.leaderboard(10))],
                components: rows()
            });
        }
        if (sub === 'info') {
            return message.reply({ embeds: [helpEmbed()], components: rows() });
        }

        const user = message.mentions.users.first() || message.author;
        const p = xp.progress(user.id);
        const rankInfo = xp.rankOf(user.id);
        return message.reply({
            embeds: [profileEmbed(user, p, rankInfo)],
            components: rows()
        });
    },

    async executeSlash(interaction) {
        const send = (payload) => respond(interaction, payload);
        const acao = interaction.options.getString('acao') || 'me';
        if (acao === 'rank') {
            return send({
                embeds: [leaderboardEmbed(interaction.client, xp.leaderboard(10))],
                components: rows()
            });
        }
        if (acao === 'info') {
            return send({ embeds: [helpEmbed()], components: rows() });
        }

        const user = interaction.options.getUser('usuario') || interaction.user;
        const p = xp.progress(user.id);
        const rankInfo = xp.rankOf(user.id);
        return send({
            embeds: [profileEmbed(user, p, rankInfo)],
            components: rows()
        });
    },

    async handleComponent(interaction) {
        const id = interaction.customId;
        if (!id.startsWith('xp:')) return;

        const update = async (payload) => {
            try {
                if (interaction.deferred || interaction.replied) {
                    return interaction.editReply(payload);
                }
                return interaction.update(payload);
            } catch (e) {
                if (e && (e.code === 10062 || e.code === 40060)) return;
            }
        };

        if (id === 'xp:rank') {
            return update({
                embeds: [leaderboardEmbed(interaction.client, xp.leaderboard(10))],
                components: rows()
            });
        }
        if (id === 'xp:info') {
            return update({
                embeds: [helpEmbed()],
                components: rows()
            });
        }
        if (id === 'xp:me') {
            const user = interaction.user;
            const p = xp.progress(user.id);
            const rankInfo = xp.rankOf(user.id);
            return update({
                embeds: [profileEmbed(user, p, rankInfo)],
                components: rows()
            });
        }
    }
};
