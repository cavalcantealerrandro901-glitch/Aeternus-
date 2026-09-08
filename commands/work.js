const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const workUtil = require('../utils/work');
const eter = require('../utils/eter');

function fmt(n) {
    return Number(n || 0).toLocaleString('pt-BR');
}

function progressBar(jobs, next) {
    if (!next) return '█'.repeat(12) + ' **MAX**';
    const prev = workUtil.RANKS[next.id - 1]?.minJobs ?? 0;
    const span = Math.max(1, next.minJobs - prev);
    const done = Math.min(span, Math.max(0, jobs - prev));
    const pct = done / span;
    const filled = Math.round(pct * 12);
    return '█'.repeat(filled) + '░'.repeat(12 - filled) + ` **${Math.floor(pct * 100)}%**`;
}

function resultEmbed(user, r) {
    const lines = [
        `> ${r.phrase}`,
        '',
        `💰 **+✨ ${fmt(r.pay)}** éter`,
        `🏦 Saldo: ✨ **${fmt(r.balance)}**`,
        '',
        `${r.rank.emoji} **Cargo:** ${r.rank.name}`,
        `📦 Turnos feitos: **${fmt(r.jobs)}**`,
        `📈 Total ganho no trabalho: ✨ **${fmt(r.totalEarned)}**`
    ];

    if (r.promoted) {
        lines.push(
            '',
            `🎉 **Promoção!** ${r.rankBefore.emoji} ${r.rankBefore.name} → ${r.rank.emoji} **${r.rank.name}**`
        );
    }

    if (r.next) {
        lines.push(
            '',
            `⏳ Próximo: ${r.next.emoji} **${r.next.name}** · faltam **${r.jobsToNext}** turnos`,
            progressBar(r.jobs, r.next)
        );
    } else {
        lines.push('', '🌌 Você alcançou o cargo máximo.');
    }

    lines.push('', `_Próximo trabalho em ~${Math.round(r.cooldownMs / 60000)} min._`);

    return new EmbedBuilder()
        .setColor(r.promoted ? 0xfbbf24 : 0x22c55e)
        .setAuthor({
            name: `${user.username} · Trabalho`,
            iconURL: user.displayAvatarURL({ size: 64 })
        })
        .setTitle(`${r.rank.emoji}  Turno concluído`)
        .setDescription(lines.join('\n'))
        .setThumbnail(user.displayAvatarURL({ size: 128 }));
}

function cooldownEmbed(user, leftText, st) {
    return new EmbedBuilder()
        .setColor(0xf59e0b)
        .setAuthor({
            name: `${user.username} · Descanso`,
            iconURL: user.displayAvatarURL({ size: 64 })
        })
        .setTitle('⏳  Ainda em intervalo')
        .setDescription(
            [
                `Você precisa descansar antes do próximo turno.`,
                '',
                `⏰ Disponível em **${leftText}**`,
                '',
                `${st.rank.emoji} **Cargo atual:** ${st.rank.name}`,
                `📦 Turnos: **${fmt(st.jobs)}**`,
                st.next
                    ? `Próximo: ${st.next.emoji} **${st.next.name}** · faltam **${st.jobsToNext}** turnos`
                    : '🌌 Cargo máximo alcançado.'
            ].join('\n')
        )
        .setThumbnail(user.displayAvatarURL({ size: 128 }));
}

function statusEmbed(user, st) {
    const ranksList = workUtil.RANKS.map((rk) => {
        const mark = rk.id === st.rank.id ? ' ◀' : '';
        return `${rk.emoji} **${rk.name}** · ${fmt(rk.minJobs)}+ turnos · ~✨ ${fmt(rk.payMin)}–${fmt(rk.payMax)}${mark}`;
    }).join('\n');

    return new EmbedBuilder()
        .setColor(0x38bdf8)
        .setAuthor({
            name: `${user.username} · Carreira`,
            iconURL: user.displayAvatarURL({ size: 64 })
        })
        .setTitle('Perfil de trabalho')
        .setDescription(
            [
                `${st.rank.emoji} **Cargo:** ${st.rank.name}`,
                `📦 Turnos: **${fmt(st.jobs)}**`,
                `📈 Total ganho: ✨ **${fmt(st.totalEarned)}**`,
                `✨ Saldo: **${fmt(st.balance)}**`,
                `⏰ Cooldown: **${st.cooldownText}**`,
                '',
                st.next
                    ? `Próximo: ${st.next.emoji} **${st.next.name}** · ${progressBar(st.jobs, st.next)}`
                    : '🌌 Você está no topo da carreira.',
                '',
                '**Tabela de cargos**',
                ranksList
            ].join('\n')
        )
        .setThumbnail(user.displayAvatarURL({ size: 128 }));
}

async function doWork(user) {
    const r = workUtil.work(user.id);
    if (!r.ok) {
        const st = workUtil.status(user.id);
        return {
            embeds: [cooldownEmbed(user, r.leftText, st)]
        };
    }
    return {
        embeds: [resultEmbed(user, r)]
    };
}

module.exports = {
    name: 'work',
    aliases: ['trabalhar', 'job', 'emprego', 'trabalho', 'wrk'],
    description: 'Trabalha e ganha éter conforme o cargo',
    data: new SlashCommandBuilder()
        .setName('trabalho')
        .setDescription('Trabalhar por eter')
        .addStringOption((o) =>
            o
                .setName('acao')
                .setDescription('trabalhar | status | cargos')
                .setRequired(false)
                .addChoices(
                    { name: 'Trabalhar', value: 'go' },
                    { name: 'Status / carreira', value: 'status' },
                    { name: 'Ver cargos', value: 'ranks' }
                )
        ),

    async execute(message, args) {
        const sub = String(args?.[0] || '')
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '');

        if (['status', 'perfil', 'carreira', 'info', 'stats'].includes(sub)) {
            const st = workUtil.status(message.author.id);
            return message.reply({
                embeds: [statusEmbed(message.author, st)]
            });
        }

        if (['cargos', 'ranks', 'rank', 'niveis', 'nivel'].includes(sub)) {
            const st = workUtil.status(message.author.id);
            return message.reply({
                embeds: [statusEmbed(message.author, st)]
            });
        }

        const payload = await doWork(message.author);
        return message.reply(payload);
    },

    async executeSlash(interaction) {
        const acao = interaction.options.getString('acao') || 'go';
        if (acao === 'status' || acao === 'ranks') {
            const st = workUtil.status(interaction.user.id);
            return interaction.reply({
                embeds: [statusEmbed(interaction.user, st)]
            });
        }
        const payload = await doWork(interaction.user);
        return interaction.reply(payload);
    }
};
