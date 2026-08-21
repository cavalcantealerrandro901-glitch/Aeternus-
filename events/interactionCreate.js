const { Events, MessageFlags } = require('discord.js');
const { decodePayload } = require('../utils/gameAgain');
const music = require('../utils/musicPlayer');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction, client) {
        // Controles de música (passar / voltar / pausa / repetir)
        if (interaction.isButton() && interaction.customId.startsWith('mctl_')) {
            try {
                const handled = await music.handleControl(interaction);
                if (handled) return;
            } catch (err) {
                console.error('[music control]', err);
                try {
                    if (interaction.replied || interaction.deferred) {
                        await interaction.followUp({
                            content: 'Erro no controle de música.',
                            flags: [MessageFlags.Ephemeral]
                        });
                    } else {
                        await interaction.reply({
                            content: 'Erro no controle de música.',
                            flags: [MessageFlags.Ephemeral]
                        });
                    }
                } catch (_) {}
            }
            return;
        }

        // Botão Novamente (jogos)
        if (interaction.isButton() && interaction.customId.startsWith('again:')) {
            const parts = interaction.customId.split(':');
            if (parts.length < 4) {
                return interaction
                    .reply({ content: 'Dados inválidos.', flags: [MessageFlags.Ephemeral] })
                    .catch(() => {});
            }

            const game = parts[1];
            const ownerId = parts[2];
            const payloadB64 = parts.slice(3).join(':');

            if (interaction.user.id !== ownerId) {
                return interaction
                    .reply({
                        content: 'Só quem jogou pode usar **Novamente**.',
                        flags: [MessageFlags.Ephemeral]
                    })
                    .catch(() => {});
            }

            const payload = decodePayload(payloadB64);
            const args = payload?.a || [];
            const command = client.commands.get(game);
            if (!command) {
                return interaction
                    .reply({ content: 'Jogo não encontrado.', flags: [MessageFlags.Ephemeral] })
                    .catch(() => {});
            }

            try {
                await interaction.update({ components: interaction.message.components }).catch(async () => {
                    await interaction.deferUpdate().catch(() => {});
                });

                const fakeMessage = {
                    id: `${interaction.id}_again`,
                    author: interaction.user,
                    member: interaction.member,
                    channel: interaction.channel,
                    guild: interaction.guild,
                    client: interaction.client,
                    content: '',
                    mentions: { users: { first: () => null, size: 0, values: () => [] } },
                    reply: (payload) => interaction.channel.send(payload)
                };

                await command.execute(fakeMessage, args, client);
            } catch (err) {
                console.error('again button:', err);
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
