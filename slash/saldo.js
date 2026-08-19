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

module.exports = {
    data: new SlashCommandBuilder()
        .setName('saldo')
        .setDescription('Mostra o seu saldo atual de moedas.'),
    
    async execute(interaction) {
        // Evita o erro 10062 (Unknown interaction)
        await interaction.deferReply();
        
        const balance = getBalance(interaction.user.id);
        
        await interaction.editReply({
            content: `💳 **${interaction.user.username}**, seu saldo atual é de **${balance} moedas**.`
        });
    }
};
