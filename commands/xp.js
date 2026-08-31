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

function profileEmbed(user, p, rankInfo) {
    const title = titleForLevel(p.level);
    const lines = [
        `${title.emoji} **Título:** ${title.name}`,
        '',
        `🎚️ **Nível** \\\`${p.level}\\\``,
        `✨ **XP total** · ${fmt(p.totalXp)}`,
        '',
        `**Progresso no nível**`,
        `\`${bar(p.pct)}\` **${p.pct}%**`,
        `🔹 ${fmt(p.current)} / ${fmt(p.need)} XP`,
        `⏳ Faltam **${fmt(p.toNext)}** XP para o nível ${p.level + 1}`,
        '',
        `🎁 **Multiplicador do Daily:** ×**${p.mult.toFixed(2)}**`,
        `_Cada nível aumenta o daily (máx. ×3.00)._`,
        '',
        rankInfo
            ? `🏅 **Ranking global:** #**${rankInfo.rank}** de ${rankInfo.total}`
            : ''
    ].filter(Boolean);

    return new EmbedBuilder()
        .setColor(0xa78bfa)
        .setAuthor({
            name: `${user.username} · Experiência`,
            iconURL: user.displayAvatarURL({ size: 64 })
        })
        .setTitle(`${title.emoji}  Nível ${p.level}`)
        .setDescription(lines.join('\n'))
        .setThumbnail(user.displayAvatarURL({ size: 256 }))
        .setFooter({ text: 'O.xp · O.level · O.nivel · /xp  ·  converse no chat para ganhar XP' })
        .setTimestamp();
}

function leaderboardEmbed(client, list) {
    const medals = ['🥇', '🥈', '🥉'];
    const lines = list.length
        ? list.map((row, i) => {
              const medal = medals[i] || `**${i + 1}.**`;
              const title = titleForLevel(row.level);
              return `${medal} <@${row.userId}> — ${title.emoji} Nv. **${row.level}** · ${fmt(row.xp)} XP`;
          })
        : ['_Ainda ninguém no ranking. Converse no chat!_'];

    return new EmbedBuilder()
        .setColor(0xfbbf24)
        .setTitle('🏆  Ranking de XP')
        .setDescription(lines.join('\n'))
        .setFooter({ text: 'Top 10 · XP global do bot' })
        .setTimestamp();
}

function helpEmbed() {
    return new EmbedBuilder()
        .setColor(0x6366f1)
        .setTitle('⭐  Sistema de XP')
        .setDescription(
            [
                'Ganhe XP **conversando** nos chats do servidor.',
                'Há anti-spam: mensagens muito seguidas dão menos XP.',
                '',
                '**Por mensagem:** cerca de **30–77** XP',
                '**Ao subir de nível:** ❄️ **300–5.000** flocos',
                '**Daily:** multiplicador sobe com o nível (até ×3)',
                '',
                '**Comandos**',
                '`O.xp` — seu progresso',
                '`O.xp @user` — ver outro membro',
                '`O.xp rank` — ranking',
                '`O.xp info` — como funciona',
                '',
                'Aliases: `level` · `nivel` · `lvl` · `rankxp`'
            ].join('\n')
        )
        .setFooter({ text: 'Aeternus · progressão' })
        .setTimestamp();
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
    description: 'Mostra XP, nível, ranking e multiplicador do daily',
    data: new SlashCommandBuilder()
        .setName('xp')
        .setDescription('Mostra experiência e nível')
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
        const acao = interaction.options.getString('acao') || 'me';
        if (acao === 'rank') {
            return interaction.reply({
                embeds: [leaderboardEmbed(interaction.client, xp.leaderboard(10))],
                components: rows()
            });
        }
        if (acao === 'info') {
            return interaction.reply({ embeds: [helpEmbed()], components: rows() });
        }

        const user = interaction.options.getUser('usuario') || interaction.user;
        const p = xp.progress(user.id);
        const rankInfo = xp.rankOf(user.id);
        return interaction.reply({
            embeds: [profileEmbed(user, p, rankInfo)],
            components: rows()
        });
    },

    async handleComponent(interaction) {
        const id = interaction.customId;
        if (!id.startsWith('xp:')) return;

        if (id === 'xp:rank') {
            return interaction.update({
                embeds: [leaderboardEmbed(interaction.client, xp.leaderboard(10))],
                components: rows()
            });
        }
        if (id === 'xp:info') {
            return interaction.update({
                embeds: [helpEmbed()],
                components: rows()
            });
        }
        if (id === 'xp:me') {
            const user = interaction.user;
            const p = xp.progress(user.id);
            const rankInfo = xp.rankOf(user.id);
            return interaction.update({
                embeds: [profileEmbed(user, p, rankInfo)],
                components: rows()
            });
        }
    }
};
