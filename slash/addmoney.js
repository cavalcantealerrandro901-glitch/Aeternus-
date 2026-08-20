const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');
const dbFile = path.join(__dirname, '..', 'database.json');

function parseAmount(str) {
    if (!str) return null;
    str = str.trim().toLowerCase().replace(',', '.');
    let multiplier = 1;
    if (str.endsWith('k')) { multiplier = 1000; str = str.slice(0, -1); }
    else if (str.endsWith('m')) { multiplier = 1000000; str = str.slice(0, -1); }
    else if (str.endsWith('b')) { multiplier = 1000000000; str = str.slice(0, -1); }
    const num = parseFloat(str);
    if (isNaN(num)) return null;
    return Math.floor(num * multiplier);
}

function formatNumber(num) {
    return num.toLocaleString('en-US');
}

function addBalance(userId, amount) {
    try {
        let data = {};
        if (fs.existsSync(dbFile)) {
            data = JSON.parse(fs.readFileSync(dbFile, 'utf8'));
        }
        if (!data[`user_${userId}`]) data[`user_${userId}`] = { balance: 0 };
        
        data[`user_${userId}`].balance += amount;
        
        fs.writeFileSync(dbFile, JSON.stringify(data, null, 2));
        return data[`user_${userId}`].balance;
    } catch (e) { return null; }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('addmoney')
        .setDescription('Adiciona cristais a um usuário (Apenas Administradores)')
        .addUserOption(option => 
            option.setName('usuario').setDescription('O usuário para receber').setRequired(true))
        .addStringOption(option => 
            option.setName('quantidade').setDescription('Quantidade (ex: 500, 1.5k, 2m)').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: false }).catch(() => {});

        const targetUser = interaction.options.getUser('usuario');
        const rawAmount = interaction.options.getString('quantidade');
        const amount = parseAmount(rawAmount);

        if (amount === null || amount <= 0) {
            return interaction.editReply({ content: '❌ Quantidade inválida!' });
        }

        const newBalance = addBalance(targetUser.id, amount);
        if (newBalance === null) {
            return interaction.editReply({ content: '❌ Erro ao acessar o cofre.' });
        }

        await interaction.editReply({
            content: `❄️ Adicionado **${formatNumber(amount)} cristais** para **${targetUser.username}**. Saldo atual: **${formatNumber(newBalance)} cristais**.`
        });
    }
};
