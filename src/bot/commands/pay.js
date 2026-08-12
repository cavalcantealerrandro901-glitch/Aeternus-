const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../../database/db');
const { formatAlmas, economyConfig } = require('../utils/economy');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('pay')
        .setDescription('Transfira Almas para outro usuário')
        .addUserOption(o => o.setName('usuario').setDescription('Quem receberá').setRequired(true))
        .addIntegerOption(o => o.setName('quantidade').setDescription('Quantidade de Almas').setRequired(true).setMinValue(1)),
    aliases: ['pagar', 'transferir', 'pix'],

    async run(fromId, toId, guildId, amount) {
        const eco = economyConfig(guildId);
        if (!eco.enabled) return { error: 'Economia desativada.' };
        if (fromId === toId) return { error: 'Você não pode pagar a si mesmo.' };
        if (amount < 1) return { error: 'Quantidade inválida.' };

        const from = await db.getUser(fromId, guildId);
        if (from.almas < amount) return { error: 'Saldo insuficiente.' };

        from.almas -= amount;
        await from.save();
        await db.addAlmas(toId, guildId, amount);

        return { amount };
    },

    async execute(interaction) {
        const target = interaction.options.getUser('usuario');
        const amount = interaction.options.getInteger('quantidade');
        if (target.bot) return interaction.reply({ content: 'Não é possível pagar bots.', ephemeral: true });

        const r = await this.run(interaction.user.id, target.id, interaction.guild.id, amount);
        if (r.error) return interaction.reply({ content: `⚠️ ${r.error}`, ephemeral: true });

        const embed = new EmbedBuilder()
            .setColor(0x22c55e)
            .setDescription(`💸 ${interaction.user} enviou ${formatAlmas(r.amount, interaction.guild.id)} para ${target}`)
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    },

    async executePrefix(message, args) {
        const target = message.mentions.users.first();
        const amount = parseInt(args.find(a => /^\d+$/.test(a)), 10);
        if (!target || !amount) return message.reply('Uso: `pay @usuário quantidade`');
        if (target.bot) return message.reply('Não é possível pagar bots.');

        const r = await this.run(message.author.id, target.id, message.guild.id, amount);
        if (r.error) return message.reply(`⚠️ ${r.error}`);

        const embed = new EmbedBuilder()
            .setColor(0x22c55e)
            .setDescription(`💸 ${message.author} enviou ${formatAlmas(r.amount, message.guild.id)} para ${target}`)
            .setTimestamp();

        await message.reply({ embeds: [embed] });
    }
};
