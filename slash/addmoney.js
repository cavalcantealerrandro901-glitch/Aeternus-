const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');
const dbFile = path.join(__dirname, '..', 'database.json');

function addBalance(userId, amount) {
    try {
        let data = {};
        if (fs.existsSync(dbFile)) {
            data = JSON.parse(fs.readFileSync(dbFile, 'utf8'));
        }
        if (!data[`user_${userId}`]) {
            data[`user_${userId}`] = { balance: 0 };
        }
        data[`user_${userId}`].balance += amount;
        fs.writeFileSync(dbFile, JSON.stringify(data, null, 2));
        return data[`user_${userId}`].balance;
    } catch (e) {
        console.error(e);
        return null;
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('addmoney')
        .setDescription('Adiciona moedas para um usuário (Apenas administradores)')
        .addUserOption(option => 
            option.setName('usuario')
                .setDescription('O usuário que receberá as moedas')
                .setRequired(true))
        .addIntegerOption(option => 
            option.setName('quantidade')
                .setDescription('A quantidade de moedas a adicionar')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const targetUser = interaction.options.getUser('usuario');
        const amount = interaction.options.getInteger('quantidade');

        const newBalance = addBalance(targetUser.id, amount);

        if (newBalance === null) {
            return interaction.editReply({ content: '❌ Erro ao atualizar o banco de dados.' });
        }

        await interaction.editReply({
            content: `✅ Adicionado com sucesso **${amount} moedas** para **${targetUser.username}**. Novo saldo: **${newBalance} moedas**.`
        });
    }
};
