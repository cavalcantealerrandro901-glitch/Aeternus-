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
    todayKey,
    yesterdayKey,
    calcDailyReward
} = require('../utils/economy');
const { dailyReadyPhrase, dailyClaimedPhrase } = require('../utils/phrases');

async function canClaim(userId, guildId) {
    const user = await db.getUser(userId, guildId);
    const today = todayKey();
    if (user.lastDailyDate === today) {
        return { ok: false, user, reason: 'Você já coletou o daily de hoje. Volte após a **meia-noite**.' };
    }
    return { ok: true, user, today };
}

async function claimDaily(userId, guildId) {
    const eco = economyConfig(guildId);
    if (!eco.enabled) return { error: 'Economia desativada neste servidor.' };

    const check = await canClaim(userId, guildId);
    if (!check.ok) return { error: check.reason };

    const user = check.user;
    const today = check.today;
    const yesterday = yesterdayKey();

    // Sequência: se coletou ontem, continua; senão reinicia
    let streak = user.dailyStreak || 0;
    if (user.lastDailyDate === yesterday) streak += 1;
    else streak = 1;

    const reward = calcDailyReward(streak);
    user.almas = (user.almas || 0) + reward.total;
    user.lastDaily = Date.now();
    user.lastDailyDate = today;
    user.dailyStreak = streak;
    user.dailyNotifiedDate = today; // já avisado/coletado hoje
    await user.save();

    return {
        amount: reward.total,
        base: reward.base,
        bonus: reward.bonus,
        streak,
        total: user.almas,
        phrase: dailyClaimedPhrase(streak, reward.total)
    };
}

function buildReadyEmbed(guildId) {
    const phrase = dailyReadyPhrase();
    return new EmbedBuilder()
        .setColor(0x7c3aed)
        .setTitle('🌌 Tributo do Abismo')
        .setDescription(
            `${phrase}\n\n` +
            `Recompensa base: **5.000 — 60.000** Almas\n` +
            `Sequência: a cada **2 dias**, bônus de **+500 a +2.000**\n\n` +
            `Clique no botão para selar o pacto e coletar.`
        )
        .setFooter({ text: 'Disponível todo dia a partir da meia-noite (BRT)' })
        .setTimestamp();
}

function claimButton(guildId) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`aeternus_daily_claim:${guildId}`)
            .setLabel('Coletar Daily')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('💀')
    );
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('daily')
        .setDescription('Colete seu tributo diário de Almas (meia-noite)'),
    aliases: ['diario', 'tributo'],

    claimDaily,
    canClaim,
    buildReadyEmbed,
    claimButton,

    async execute(interaction) {
        const guildId = interaction.guild.id;
        const check = await canClaim(interaction.user.id, guildId);

        if (!check.ok) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0xef4444)
                        .setTitle('⏳ Daily já coletado')
                        .setDescription(check.reason)
                        .setFooter({ text: `Sequência atual: ${check.user.dailyStreak || 0} dias` })
                ],
                ephemeral: true
            });
        }

        await interaction.reply({
            embeds: [buildReadyEmbed(guildId)],
            components: [claimButton(guildId)]
        });
    },

    async executePrefix(message) {
        const guildId = message.guild.id;
        const check = await canClaim(message.author.id, guildId);

        if (!check.ok) {
            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0xef4444)
                        .setTitle('⏳ Daily já coletado')
                        .setDescription(check.reason)
                        .setFooter({ text: `Sequência atual: ${check.user.dailyStreak || 0} dias` })
                ]
            });
        }

        await message.reply({
            embeds: [buildReadyEmbed(guildId)],
            components: [claimButton(guildId)]
        });
    }
};
