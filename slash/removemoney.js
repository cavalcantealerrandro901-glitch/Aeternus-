const { SlashCommandBuilder } = require('discord.js');
const db = require('../utils/database');
const { parseAmount } = require('../utils/parser');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('removemoney')
        .setDescription('Remove almas de um usuário')
        .addUserOption(opt => opt.setName('usuario').setDescription('O usuário').setRequired(true))
        .addStringOption(opt => opt.setName('quantidade').setDescription('Quantidade (ex: 500k, 1.5m)').setRequired(true)),
    async execute(interaction) {
        const allowed = db.getPerms();
        const isOwner = interaction.user.id === interaction.guild?.ownerId;

        if (!isOwner && !allowed.includes(interaction.user.id) && !interaction.member.permissions.has('Administrator')) {
            return interaction.reply({ content: '❌ Você não tem permissão para usar este comando.', ephemeral: true });
        }

        const target = interaction.options.getUser('usuario');
        const amountInput = interaction.options.getString('quantidade');
        const amount = parseAmount(amountInput);

        if (isNaN(amount) || amount <= 0) {
            return interaction.reply({ content: '❌ Quantidade inválida! Exemplos aceitos: `1k`, `2.5m`, `23393k`.', ephemeral: true });
        }

        const currentBal = db.getBal(target.id);
        const removeAmount = amount > currentBal ? currentBal : amount;
        const newTotal = db.addBal(target.id, -removeAmount);

        await interaction.reply(`💀 Removido **${amountInput.toUpperCase()}** almas de **${target.tag}**.\n💰 Saldo restante: **${newTotal.toLocaleString()}** almas.`);
    }
};
