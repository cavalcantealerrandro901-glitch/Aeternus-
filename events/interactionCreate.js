const { Events, MessageFlags } = require('discord.js');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction, client) {
        if (!interaction.isChatInputCommand()) return;

        const command = client.slashCommands.get(interaction.commandName);
        if (!command) return;

        try {
            await command.execute(interaction);
        } catch (error) {
            console.error('❌ Erro no comando:', error);
            try {
                const errorMessage = { 
                    content: 'Ocorreu um erro ao executar este comando!', 
                    flags: [MessageFlags.Ephemeral] 
                };

                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp(errorMessage);
                } else {
                    await interaction.reply(errorMessage);
                }
            } catch (err) {
                // Ignora silenciosamente se a interação já expirou completamente
            }
        }
    },
};
