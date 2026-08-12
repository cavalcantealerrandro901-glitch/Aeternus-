const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');
const db = require('../../database/db');
const {
    economyConfig,
    formatAlmas,
    randomInt,
    cooldownLeft,
    formatTime
} = require('../utils/economy');
const { getRankByXp, getNextRank, xpForWork, RANKS } = require('../utils/ranks');
const { aiWorkStart, aiWorkDone, workStartPhrase, workDonePhrase } = require('../utils/phrases');

async function doWork(userId, guildId) {
    const eco = economyConfig(guildId);
    if (!eco.enabled) return { error: 'Economia desativada neste servidor.' };

    const user = await db.getUser(userId, guildId);
    const cd = eco.workCooldownMs || 3600000;
    const left = cooldownLeft(user.lastWork, cd);
    if (left) {
        return { error: `Aguarde **${formatTime(left)}** para trabalhar de novo.` };
    }

    const rank = getRankByXp(user.workXp || 0);
    const amount = randomInt(rank.min, rank.max);
    const gainedXp = xpForWork(rank.id);
    const oldRankId = rank.id;

    user.almas = (user.almas || 0) + amount;
    user.workXp = (user.workXp || 0) + gainedXp;
    user.lastWork = Date.now();
    await user.save();

    const newRank = getRankByXp(user.workXp);
    const next = getNextRank(user.workXp);
    const leveledUp = newRank.id > oldRankId;

    const donePhrase =
        (await aiWorkDone(newRank.name, amount)) || workDonePhrase(newRank.name, amount);

    return {
        amount,
        total: user.almas,
        rank: newRank,
        gainedXp,
        workXp: user.workXp,
        next,
        leveledUp,
        donePhrase
    };
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('work')
        .setDescription('Trabalhe para ganhar Almas e XP de cargo'),
    aliases: ['trabalhar', 'job'],

    doWork,
    RANKS,

    async execute(interaction) {
        const preview = await db.getUser(interaction.user.id, interaction.guild.id);
        const rank = getRankByXp(preview.workXp || 0);
        const start =
            (await aiWorkStart(rank.name)) || workStartPhrase(rank.name);

        const embed = new EmbedBuilder()
            .setColor(0x3b82f6)
            .setTitle(`${rank.emoji} Trabalho — ${rank.name}`)
            .setDescription(
                `${start}\n\n` +
                `Faixa: **${rank.min.toLocaleString('pt-BR')} — ${rank.max.toLocaleString('pt-BR')}** Almas\n` +
                `XP: **${preview.workXp || 0}**`
            )
            .setFooter({ text: 'Clique para trabalhar' });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`aeternus_work:${interaction.guild.id}`)
                .setLabel('Trabalhar')
                .setStyle(ButtonStyle.Success)
                .setEmoji('⚒️'),
            new ButtonBuilder()
                .setCustomId('aeternus_work_ranks')
                .setLabel('Ver cargos')
                .setStyle(ButtonStyle.Secondary)
        );

        await interaction.reply({ embeds: [embed], components: [row] });
    },

    async executePrefix(message) {
        const preview = await db.getUser(message.author.id, message.guild.id);
        const rank = getRankByXp(preview.workXp || 0);
        const start =
            (await aiWorkStart(rank.name)) || workStartPhrase(rank.name);

        const embed = new EmbedBuilder()
            .setColor(0x3b82f6)
            .setTitle(`${rank.emoji} Trabalho — ${rank.name}`)
            .setDescription(
                `${start}\n\n` +
                `Faixa: **${rank.min.toLocaleString('pt-BR')} — ${rank.max.toLocaleString('pt-BR')}** Almas\n` +
                `XP: **${preview.workXp || 0}**`
            );

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`aeternus_work:${message.guild.id}`)
                .setLabel('Trabalhar')
                .setStyle(ButtonStyle.Success)
                .setEmoji('⚒️'),
            new ButtonBuilder()
                .setCustomId('aeternus_work_ranks')
                .setLabel('Ver cargos')
                .setStyle(ButtonStyle.Secondary)
        );

        await message.reply({ embeds: [embed], components: [row] });
    }
};
