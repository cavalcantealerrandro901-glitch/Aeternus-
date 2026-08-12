const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../../database/db');
const { economyConfig, formatAlmas, randomInt, cooldownLeft, formatTime } = require('../utils/economy');

module.exports = {
    data: new SlashCommandBuilder().setName('daily').setDescription('Colete suas Almas diárias'),
    aliases: ['diario'],

    async run(userId, guildId) {
        const eco = economyConfig(guildId);
        if (!eco.enabled) return { error: 'Economia desativada neste servidor.' };

        const user = await db.getUser(userId, guildId);
        const left = cooldownLeft(user.lastDaily, 24 * 60 * 60 * 1000);
        if (left) return { error: `Você já coletou hoje. Volte em **${formatTime(left)}**.` };

        const amount = randomInt(eco.dailyMin || 150, eco.dailyMax || 400);
        user.almas += amount;
        user.lastDaily = Date.now();
        await user.save();

        return { amount, total: user.almas };
    },

    async execute(interaction) {
        const r = await this.run(interaction.user.id, interaction.guild.id);
        if (r.error) return interaction.reply({ content: `⚠️ ${r.error}`, ephemeral: true });

        const embed = new EmbedBuilder()
            .setColor(0x22c55e)
            .setTitle('🎁 Daily coletado!')
            .setDescription(`Você recebeu ${formatAlmas(r.amount, interaction.guild.id)}\nSaldo: ${formatAlmas(r.total, interaction.guild.id)}`)
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    },

    async executePrefix(message) {
        const r = await this.run(message.author.id, message.guild.id);
        if (r.error) return message.reply(`⚠️ ${r.error}`);

        const embed = new EmbedBuilder()
            .setColor(0x22c55e)
            .setTitle('🎁 Daily coletado!')
            .setDescription(`Você recebeu ${formatAlmas(r.amount, message.guild.id)}\nSaldo: ${formatAlmas(r.total, message.guild.id)}`)
            .setTimestamp();

        await message.reply({ embeds: [embed] });
    }
};
