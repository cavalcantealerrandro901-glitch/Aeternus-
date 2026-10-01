const autoRepair = require('../utils/autoRepair');
const { Collection } = require('discord.js');

async function bridgeSlashToPrefix(interaction, cmd, client) {
    const raw = interaction.options?.getString?.('args') || '';
    const args = raw.trim() ? raw.trim().split(/\s+/) : [];

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
            has: () => false,
            first: () => mentionUsers.first() || null
        },
        async reply(payload) {
            if (interaction.deferred && !interaction.replied) {
                replied = true;
                return interaction.editReply(payload);
            }
            if (!replied && !interaction.replied && !interaction.deferred) {
                replied = true;
                return interaction.reply(payload);
            }
            return interaction.followUp(payload);
        }
    };

    await cmd.execute(fakeMessage, args, client);

    if (!replied && interaction.deferred && !interaction.replied) {
        await interaction.editReply({ content: '✅' }).catch(() => {});
    } else if (!replied && !interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: '✅' }).catch(() => {});
    }
}

module.exports = {
    name: 'interactionCreate',
    async execute(interaction, client) {
        try {
            if (interaction.isModalSubmit()) {
                const parts = (interaction.customId || '').split(':');
                const cmd = client.commands.get(parts[0]);
                if (cmd?.handleModal) {
                    await cmd.handleModal(interaction, client);
                    return;
                }
            }

            if (interaction.isChatInputCommand()) {
                const name = interaction.commandName;
                const cmd = client.slash.get(name) || client.commands.get(name);

                if (!cmd) {
                    return interaction
                        .reply({
                            content: '❌ Este slash não existe mais. Aguarde a sincronização.',
                            ephemeral: true
                        })
                        .catch(() => {});
                }

                // executeSlash gerencia o próprio defer/reply (ex.: /parceria)
                if (typeof cmd.executeSlash === 'function') {
                    try {
                        await cmd.executeSlash(interaction, client);
                    } catch (err) {
                        if (err && (err.code === 10062 || err.code === 40060)) return;
                        await autoRepair.handleCommandError({
                            cmdName: name,
                            error: err,
                            context: `slash /${name} · ${interaction.guild?.name || 'DM'} · user ${interaction.user?.id}`,
                            interaction
                        });
                    }
                    return;
                }

                if (!interaction.deferred && !interaction.replied) {
                    await interaction.deferReply().catch(() => {});
                }

                if (typeof cmd.execute === 'function') {
                    try {
                        await bridgeSlashToPrefix(interaction, cmd, client);
                    } catch (err) {
                        if (err && (err.code === 10062 || err.code === 40060)) return;
                        await autoRepair.handleCommandError({
                            cmdName: name,
                            error: err,
                            context: `slash-bridge /${name} · ${interaction.guild?.name || 'DM'}`,
                            interaction
                        });
                    }
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

                if (!cmd && (parts[0] === 'bj' || parts[0] === 'blackjack')) {
                    cmd = client.commands.get('blackjack') || client.commands.get('bj');
                }
                if (!cmd && (parts[0] === 'pvp' || parts[0] === 'arena')) cmd = client.commands.get('arena');
                if (!cmd && parts[0] === 'j') cmd = client.commands.get('j');
                if (!cmd && parts[0] === 'rank') cmd = client.commands.get('rank');
                if (!cmd && parts[0] === 'quiz') cmd = client.commands.get('quiz');
                if (!cmd && id.startsWith('loja:')) cmd = client.commands.get('loja');
                if (!cmd && parts[0] === 'habilidades') cmd = client.commands.get('habilidades');
                if (!cmd && parts[0] === 'passivas') cmd = client.commands.get('passivas');
                if (!cmd && parts[0] === 'classe') cmd = client.commands.get('classe');
                if (parts[0] === 'act' && parts[1] === 'devolver' && parts[2]) {
                    cmd = client.commands.get(parts[2]);
                }

                if (cmd?.handleComponent) {
                    try {
                        await cmd.handleComponent(interaction, client);
                    } catch (err) {
                        if (err && (err.code === 10062 || err.code === 40060)) return;
                        throw err;
                    }
                    return;
                }
            }
        } catch (e) {
            if (e && (e.code === 10062 || e.code === 40060)) return;
            const id = interaction.customId || interaction.commandName || '?';
            const cmdHint = String(id).split(':')[0];
            await autoRepair.handleCommandError({
                cmdName: cmdHint,
                error: e,
                context: `interaction · ${interaction.guild?.name || 'DM'} · ${interaction.type}`,
                interaction
            });
        }
    }
};
