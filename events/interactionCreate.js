const { Collection } = require('discord.js');

/** Ponte slash → execute de prefixo (args em opção string) */
async function bridgeSlashToPrefix(interaction, cmd, client) {
    const raw = interaction.options?.getString?.('args') || '';
    const args = raw.trim() ? raw.trim().split(/\s+/) : [];

    // menções em args: <@id>
    const mentionUsers = new Collection();
    for (const a of args) {
        const m = a.match(/^<@!?(\d+)>$/);
        if (m) {
            const u = await client.users.fetch(m[1]).catch(() => null);
            if (u) mentionUsers.set(u.id, u);
        }
    }

    let replied = false;
    const fakeMessage = {
        author: interaction.user,
        member: interaction.member,
        guild: interaction.guild,
        channel: interaction.channel,
        client,
        content: raw,
        mentions: {
            users: mentionUsers,
            members: interaction.guild?.members?.cache || new Collection(),
            has: () => false
        },
        async reply(payload) {
            if (!replied && !interaction.replied && !interaction.deferred) {
                replied = true;
                return interaction.reply(payload);
            }
            if (interaction.deferred && !interaction.replied) {
                replied = true;
                return interaction.editReply(payload);
            }
            return interaction.followUp(payload);
        }
    };

    await cmd.execute(fakeMessage, args, client);

    if (!replied && !interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: '✅', ephemeral: true }).catch(() => {});
    }
}

module.exports = {
    name: 'interactionCreate',
    async execute(interaction, client) {
        try {
            if (interaction.isChatInputCommand()) {
                const name = interaction.commandName;
                const cmd = client.slash.get(name) || client.commands.get(name);

                if (!cmd) {
                    return interaction
                        .reply({
                            content:
                                '❌ Este slash não existe mais. Aguarde a sincronização.',
                            ephemeral: true
                        })
                        .catch(() => {});
                }

                if (typeof cmd.executeSlash === 'function') {
                    await cmd.executeSlash(interaction, client);
                    return;
                }

                if (typeof cmd.execute === 'function') {
                    await bridgeSlashToPrefix(interaction, cmd, client);
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
                if (interaction.replied || interaction.deferred)
                    await interaction.followUp(payload);
                else await interaction.reply(payload);
            } catch (_) {}
        }
    }
};
