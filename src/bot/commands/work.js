const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../../database/db');
const { economyConfig, formatAlmas, randomInt, cooldownLeft, formatTime } = require('../utils/economy');

const JOBS = [
    'caçador de almas',
    'mercador das sombras',
    'guarda do abismo',
    'alquimista',
    'colecionador de relíquias',
    'negociador do submundo'
];

module.exports = {
    data: new SlashCommandBuilder().setName('work').setDescription('Trabalhe para ganhar Almas'),
    aliases: ['trabalhar', 'job'],

    async run(userId, guildId) {
        const eco = economyConfig(guildId);
        if (!eco.enabled) return { error: 'Economia desativada neste servidor.' };

        const user = await db.getUser(userId, guildId);
        const cd = eco.workCooldownMs || 3600000;
        const left = cooldownLeft(user.lastWork, cd);
        if (left) return { error: `Você está cansado. Volte em **${formatTime(left)}**.` };

        const amount = randomInt(eco.workMin || 50, eco.workMax || 250);
        const job = JOBS[randomInt(0, JOBS.length - 1)];
        user.almas += amount;
        user.lastWork = Date.now();
        await user.save();

        return { amount, total: user.almas, job };
    },

    async execute(interaction) {
        const r = await this.run(interaction.user.id, interaction.guild.id);
        if (r.error) return interaction.reply({ content: `⚠️ ${r.error}`, ephemeral: true });

        const embed = new EmbedBuilder()
            .setColor(0x3b82f6)
            .setTitle('💼 Trabalho concluído')
            .setDescription(`Como **${r.job}**, você ganhou ${formatAlmas(r.amount, interaction.guild.id)}\nSaldo: ${formatAlmas(r.total, interaction.guild.id)}`)
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    },

    async executePrefix(message) {
        const r = await this.run(message.author.id, message.guild.id);
        if (r.error) return message.reply(`⚠️ ${r.error}`);

        const embed = new EmbedBuilder()
            .setColor(0x3b82f6)
            .setTitle('💼 Trabalho concluído')
            .setDescription(`Como **${r.job}**, você ganhou ${formatAlmas(r.amount, message.guild.id)}\nSaldo: ${formatAlmas(r.total, message.guild.id)}`)
            .setTimestamp();

        await message.reply({ embeds: [embed] });
    }
};
