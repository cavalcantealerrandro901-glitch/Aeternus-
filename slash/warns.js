const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const dbFile = path.join(__dirname, '..', 'database.json');

function getWarnings(userId) {
    try {
        if (!fs.existsSync(dbFile)) return [];
        const data = JSON.parse(fs.readFileSync(dbFile, 'utf8'));
        return data[`user_${userId}`]?.warnings || [];
    } catch (e) {
        return [];
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('warns')
        .setDescription('Mostra os avisos de um usuário.')
        .addUserOption(option => 
            option.setName('usuario')
                .setDescription('O usuário cujos avisos você quer ver (opcional)')
                .setRequired(false)),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const targetUser = interaction.options.getUser('usuario') || interaction.user;
        const warnings = getWarnings(targetUser.id);

        if (warnings.length === 0) {
            return interaction.editReply({ 
                content: `✨ O usuário **${targetUser.tag}** não possui nenhum aviso registrado.` 
            });
        }

        let description = warnings.map((w, index) => {
            const dateStr = w.date ? new Date(w.date).toLocaleDateString('pt-BR') : 'Data desconhecida';
            return `**#${index + 1}** | **Mod:** ${w.moderator} | **Data:** ${dateStr}\n📌 *${w.reason}*`;
        }).join('\n\n');

        await interaction.editReply({
            content: `📋 **Lista de avisos de ${targetUser.tag}** (Total: ${warnings.length}):\n\n${description}`
        });
    }
};
