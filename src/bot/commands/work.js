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
const { workStartPhrase, workDonePhrase } = require('../utils/phrases');

async function doWork(userId, guildId) {
    const eco = economyConfig(guildId);
    if (!eco.enabled) return { error: 'Economia desativada neste servidor.' };

    const user = await db.getUser(userId, guildId);
    const cd = eco.workCooldownMs || 3600000;
    const left = cooldownLeft(user.lastWork, cd);
    if (left) {
        return { error: `Você ainda está exausto. Volte em **${formatTime(left)}**.` };
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

    return {
        amount,
        total: user.almas,
        rank: newRank,
        gainedXp,
        workXp: user.workXp,
        next,
        leveledUp,
        startPhrase: workStartPhrase(rank.name),
        donePhrase: workDonePhrase(newRank.name, amount)
    };
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('work')
        .setDescription('Trabalhe no abismo, ganhe Almas e XP de cargo'),
    aliases: ['trabalhar', 'job', 'labuta'],

    doWork,
    RANKS,

    async execute(interaction) {
        const preview = await db.getUser(interaction.user.id, interaction.guild.id);
        const rank = getRankByXp(preview.workXp || 0);

        const embed = new EmbedBuilder()
            .setColor(0x3b82f6)
            .setTitle(`${rank.emoji} Trabalho — ${rank.name}`)
            .setDescription(
                `${workStartPhrase(rank.name)}\n\n` +
                `Faixa deste cargo: **${rank.min.toLocaleString('pt-BR')} — ${rank.max.toLocaleString('pt-BR')}** Almas\n` +
                `XP atual: **${preview.workXp || 0}**`
            )
            .setFooter({ text: 'Clique para iniciar a labuta' });

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
                .setEmoji('📋')
        );

        await interaction.reply({ embeds: [embed], components: [row] });
    },

    async executePrefix(message) {
        const preview = await db.getUser(message.author.id, message.guild.id);
        const rank = getRankByXp(preview.workXp || 0);

        const embed = new EmbedBuilder()
            .setColor(0x3b82f6)
            .setTitle(`${rank.emoji} Trabalho — ${rank.name}`)
            .setDescription(
                `${workStartPhrase(rank.name)}\n\n` +
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
                .setEmoji('📋')
        );

        await message.reply({ embeds: [embed], components: [row] });
    }
};
