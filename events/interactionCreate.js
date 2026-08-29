module.exports = {
    name: 'interactionCreate',
    async execute(interaction, client) {
        try {
            if (interaction.isChatInputCommand()) {
                const name = interaction.commandName;
                const cmd =
                    client.slash.get(name) ||
                    client.commands.get(name);

                if (!cmd) {
                    return interaction
                        .reply({
                            content:
                                '❌ Este slash não existe mais no bot. Aguarde a sincronização ou rode `node scripts/deploy-slash.js`.',
                            ephemeral: true
                        })
                        .catch(() => {});
                }

                if (typeof cmd.executeSlash === 'function') {
                    await cmd.executeSlash(interaction, client);
                    return;
                }

                // fallback: alguns comandos só têm execute (prefixo)
                if (typeof cmd.execute === 'function') {
                    await interaction.reply({
                        content:
                            'Este comando é de **prefixo**. Use no chat, não como slash.',
                        ephemeral: true
                    }).catch(() => {});
                    return;
                }

                return interaction
                    .reply({ content: 'Indisponível.', ephemeral: true })
                    .catch(() => {});
            }

            if (interaction.isButton() || interaction.isStringSelectMenu()) {
                const id = interaction.customId || '';
                const parts = id.split(':');
                let cmd = client.commands.get(parts[0]);

                if (!cmd && parts[0] === 'bj') cmd = client.commands.get('blackjack');
                if (parts[0] === 'act' && parts[1] === 'devolver' && parts[2]) {
                    cmd = client.commands.get(parts[2]);
                }

                if (cmd?.handleComponent) {
                    await cmd.handleComponent(interaction, client);
                    return;
                }
            }
        } catch (e) {
            console.error('[interaction]', e);
            const payload = { content: '❌ Erro na interação.', ephemeral: true };
            try {
                if (interaction.replied || interaction.deferred) await interaction.followUp(payload);
                else await interaction.reply(payload);
            } catch (_) {}
        }
    }
};
