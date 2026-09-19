const cmdLock = require('../utils/cmdLock');
const autoRepair = require('../utils/autoRepair');
const musicManager = require('../utils/music');

function isUnknownInteraction(e) {
    return e?.code === 10062 || e?.code === 40060;
}

module.exports = {
    name: 'interactionCreate',
    async execute(interaction, client) {
        try {
            if (interaction.isModalSubmit()) {
                const id = interaction.customId || '';
                const parts = id.split(':');
                const cmd = client.commands.get(parts[0]);
                if (cmd?.handleModal) {
                    await cmd.handleModal(interaction, client);
                }
                return;
            }

            if (interaction.isChatInputCommand()) {
                const name = interaction.commandName;
                const cmd = client.slash.get(name) || client.commands.get(name);
                if (!cmd) return;

                if (interaction.guild && cmdLock.isLocked) {
                    const locked = cmdLock.isLocked(interaction.guild.id, interaction.channelId);
                    if (locked) {
                        try {
                            await interaction.reply({
                                content:
                                    `${interaction.user} meus comandos estão bloqueados nesse chat. Vá para o canal de comandos e os utilize lá. 😊`,
                                ephemeral: true
                            });
                        } catch (_) {}
                        return;
                    }
                }

                try {
                    if (typeof cmd.executeSlash === 'function') {
                        await cmd.executeSlash(interaction, client);
                    } else if (typeof cmd.execute === 'function') {
                        await cmd.execute(interaction, [], client);
                    }
                } catch (e) {
                    if (isUnknownInteraction(e)) return;
                    await autoRepair.handleCommandError({
                        cmdName: name,
                        error: e,
                        context: `slash · ${interaction.guild?.name || '?'}`,
                        interaction
                    });
                    try {
                        const msg = { content: '❌ Erro ao executar o comando.', ephemeral: true };
                        if (interaction.replied || interaction.deferred) {
                            await interaction.followUp(msg).catch(() => {});
                        } else {
                            await interaction.reply(msg).catch(() => {});
                        }
                    } catch (_) {}
                }
                return;
            }

            if (interaction.isButton() || interaction.isStringSelectMenu()) {
                const id = interaction.customId || '';
                const parts = id.split(':');
                const root = parts[0] || '';

                if (root === 'music') {
                    return musicManager.handleMusicButton(interaction, client);
                }

                let cmd = client.commands.get(root);

                if (!cmd && root === 'act' && parts[1] === 'devolver' && parts[2]) {
                    cmd = client.commands.get(parts[2]);
                }

                if (!cmd && (root === 'bj' || root === 'blackjack')) {
                    cmd = client.commands.get('blackjack') || client.commands.get('bj');
                }

                if (!cmd && root === 'inv') {
                    cmd = client.commands.get('inventario');
                }

                if (!cmd?.handleComponent) return;

                if (
                    interaction.message?.author?.id &&
                    client.user?.id &&
                    interaction.message.author.id !== client.user.id
                ) {
                    return;
                }

                await cmd.handleComponent(interaction, client);
            }
        } catch (e) {
            if (isUnknownInteraction(e)) {
                console.warn(
                    '[interaction] 10062 ignorado ·',
                    interaction.customId || interaction.commandName || '?'
                );
                return;
            }
            await autoRepair.handleCommandError({
                cmdName: interaction.commandName || interaction.customId || 'interaction',
                error: e,
                context: `slash · ${interaction.guild?.name || '?'}`,
                interaction
            });
        }
    }
};
