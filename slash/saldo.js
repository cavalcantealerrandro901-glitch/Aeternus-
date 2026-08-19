const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const dbFile = path.join(__dirname, '..', 'database.json');

function getBalance(userId) {
    try {
        if (!fs.existsSync(dbFile)) return 0;
        const data = JSON.parse(fs.readFileSync(dbFile, 'utf8'));
        return data[`user_${userId}`]?.balance || 0;
    } catch (e) {
        return 0;
    }
}

function formatNumber(num) {
    return num.toLocaleString('en-US');
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('saldo')
        .setDescription('Mostra o saldo de moedas de um usuário.')
        .addUserOption(option => 
            option.setName('usuario')
                .setDescription('O usuário que você quer ver o saldo (opcional)')
                .setRequired(false)),
    
    async execute(interaction) {
        await interaction.deferReply();
        
        const targetUser = interaction.options.getUser('usuario') || interaction.user;
        const balance = getBalance(targetUser.id);
        const formattedBalance = formatNumber(balance);
        
        const isSelf = targetUser.id === interaction.user.id;
        const messageText = isSelf 
            ? `💳 **${targetUser.username}**, seu saldo atual é de **${formattedBalance} moedas**.`
            : `💳 O saldo atual de **${targetUser.username}** é de **${formattedBalance} moedas**.`;

        await interaction.editReply({ content: messageText });
    }
};
