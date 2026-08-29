module.exports = {
    name: 'interactionCreate',
    async execute(interaction, client) {
        try {
            if (interaction.isChatInputCommand()) {
                const cmd =
                    client.slash.get(interaction.commandName) ||
                    client.commands.get(interaction.commandName);
                if (!cmd?.executeSlash && !cmd?.execute) {
                    return interaction.reply({ content: 'Indisponível.', ephemeral: true }).catch(() => {});
                }
                if (cmd.executeSlash) await cmd.executeSlash(interaction, client);
                else await cmd.execute(interaction, [], client);
                return;
            }
            if (interaction.isButton() || interaction.isStringSelectMenu()) {
                const id = interaction.customId || '';
                const parts = id.split(':');
                let cmd = client.commands.get(parts[0]);
                if (parts[0] === 'act' && parts[1] === 'devolver' && parts[2]) {
                    cmd = client.commands.get(parts[2]);
                }
                if (cmd?.handleComponent) await cmd.handleComponent(interaction, client);
            }
        } catch (e) {
            console.error('[interaction]', e);
            const payload = { content: '❌ Erro.', ephemeral: true };
            if (interaction.replied || interaction.deferred) interaction.followUp(payload).catch(() => {});
            else interaction.reply(payload).catch(() => {});
        }
    }
};
