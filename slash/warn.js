const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');
const dbFile = path.join(__dirname, '..', 'database.json');

function addWarning(userId, moderatorTag, reason) {
    try {
        let data = {};
        if (fs.existsSync(dbFile)) {
            data = JSON.parse(fs.readFileSync(dbFile, 'utf8'));
        }
        if (!data[`user_${userId}`]) {
            data[`user_${userId}`] = { balance: 0, warnings: [] };
        }
        if (!data[`user_${userId}`].warnings) {
            data[`user_${userId}`].warnings = [];
        }
        
        const warningObj = {
            moderator: moderatorTag,
            reason: reason,
            date: new Date().toISOString()
        };
        
        data[`user_${userId}`].warnings.push(warningObj);
        fs.writeFileSync(dbFile, JSON.stringify(data, null, 2));
        return data[`user_${userId}`].warnings.length;
    } catch (e) {
        console.error(e);
        return null;
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('warn')
        .setDescription('Aplica um aviso a um usuário (Apenas moderadores)')
        .addUserOption(option => 
            option.setName('usuario')
                .setDescription('O usuário que receberá o aviso')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('motivo')
                .setDescription('O motivo do aviso')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const targetUser = interaction.options.getUser('usuario');
        const reason = interaction.options.getString('motivo') || 'Nenhum motivo especificado';

        if (targetUser.bot) {
            return interaction.editReply({ content: '❌ Você não pode avisar um bot!' });
        }

        const warnCount = addWarning(targetUser.id, interaction.user.tag, reason);

        if (warnCount === null) {
            return interaction.editReply({ content: '❌ Erro ao salvar o aviso no banco de dados.' });
        }

        // Tenta enviar mensagem na DM do usuário avisado
        try {
            await targetUser.send(`⚠️ Você recebeu um aviso no servidor **${interaction.guild.name}**.\n**Motivo:** ${reason}\n**Total de avisos:** ${warnCount}`);
        } catch (err) {
            // Ignora se o usuário estiver com a DM fechada
        }

        await interaction.editReply({
            content: `✅ O usuário **${targetUser.tag}** foi avisado com sucesso!\n📌 **Motivo:** ${reason}\n📊 **Total de avisos:** ${warnCount}`
        });
    }
};
