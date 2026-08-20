const { Events, MessageFlags } = require('discord.js');
const { decodePayload, messageFromInteraction } = require('../utils/gameAgain');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction, client) {
        // Botão Novamente nos jogos de aposta
        if (interaction.isButton() && interaction.customId.startsWith('again:')) {
            const parts = interaction.customId.split(':');
            // again:game:userId:payload
            if (parts.length < 4) {
                return interaction.reply({
                    content: 'Dados da rodada inválidos.',
                    flags: [MessageFlags.Ephemeral]
                }).catch(() => {});
            }
            const game = parts[1];
            const ownerId = parts[2];
            const payloadB64 = parts.slice(3).join(':');

            if (interaction.user.id !== ownerId) {
                return interaction.reply({
                    content: 'Só quem jogou pode usar **Novamente**.',
                    flags: [MessageFlags.Ephemeral]
                }).catch(() => {});
            }

            const payload = decodePayload(payloadB64);
            const args = payload?.a || [];
            const command = client.commands.get(game);
            if (!command) {
                return interaction.reply({
                    content: 'Jogo não encontrado.',
                    flags: [MessageFlags.Ephemeral]
                }).catch(() => {});
            }

            try {
                await interaction.deferUpdate().catch(() => {});
                const fakeMessage = messageFromInteraction(interaction);
                // followUp precisa de interação reconhecida
                fakeMessage.reply = async (p) => {
                    if (interaction.deferred || interaction.replied) {
                        return interaction.followUp(p);
                    }
                    return interaction.reply(p);
                };
                await command.execute(fakeMessage, args, client);
            } catch (err) {
                console.error('again button:', err);
                try {
                    await interaction.followUp({
                        content: 'Não foi possível repetir o jogo.',
                        flags: [MessageFlags.Ephemeral]
                    });
                } catch (_) {}
            }
            return;
        }

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
            } catch (_) {}
        }
    }
};
