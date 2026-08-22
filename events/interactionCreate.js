const { Events, MessageFlags } = require('discord.js');
const { decodePayload } = require('../utils/gameAgain');
const music = require('../utils/musicPlayer');
const sg = require('../utils/supremeGate');
const { handleReturnButton } = require('../utils/interact');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction, client) {
        const cid = interaction.customId || '';

        // Interações GIF — devolver
        if (interaction.isButton() && cid.startsWith('interact_ret_')) {
            try {
                await handleReturnButton(interaction);
            } catch (err) {
                console.error('[interact]', err);
            }
            return;
        }

        // Música — controles e convites
        if (
            interaction.isButton() &&
            (cid.startsWith('mctl_') || cid.startsWith('minvite_'))
        ) {
            try {
                await music.handleControl(interaction);
            } catch (err) {
                console.error('[music control]', err);
                try {
                    if (!interaction.replied && !interaction.deferred) {
                        await interaction.reply({
                            content: 'Erro no controle de música.',
                            flags: [MessageFlags.Ephemeral]
                        });
                    }
                } catch (_) {}
            }
            return;
        }

        // SUPREME GATE
        if (
            (interaction.isButton() || interaction.isStringSelectMenu()) &&
            (cid.startsWith('sgx_') || cid.startsWith('sgv2_') || cid.startsWith('sg_'))
        ) {
            try {
                const handled = await sg.handleInteraction(interaction);
                if (handled) return;
            } catch (err) {
                console.error('[SUPREME GATE]', err);
                try {
                    const payload = { content: 'Erro no SUPREME GATE.', flags: [MessageFlags.Ephemeral] };
                    if (interaction.replied || interaction.deferred) await interaction.followUp(payload);
                    else await interaction.reply(payload);
                } catch (_) {}
            }
            return;
        }

        // Botão Novamente (jogos)
        if (interaction.isButton() && cid.startsWith('again:')) {
            const parts = cid.split(':');
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
                if (!interaction.deferred && !interaction.replied) {
                    await interaction.deferUpdate().catch(() => {});
                }
                try {
                    await interaction.message.edit({ components: [] }).catch(() => {});
                } catch (_) {}

                const fakeMessage = {
                    id: `${interaction.id}_again`,
                    author: interaction.user,
                    member: interaction.member,
                    channel: interaction.channel,
                    guild: interaction.guild,
                    client: interaction.client,
                    content: '',
                    mentions: {
                        users: {
                            first: () => null,
                            size: 0,
                            values: () => []
                        }
                    },
                    reply: (p) => interaction.channel.send(p)
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
                    content: error.message || 'Ocorreu um erro ao executar este comando!',
                    flags: [MessageFlags.Ephemeral]
                };
                if (interaction.replied || interaction.deferred) await interaction.followUp(errorMessage);
                else await interaction.reply(errorMessage);
            } catch (_) {}
        }
    }
};
