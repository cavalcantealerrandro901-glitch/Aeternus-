const cmdLock = require('../utils/cmdLock');
const autoRepair = require('../utils/autoRepair');
const { Collection, PermissionFlagsBits } = require('discord.js');

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
            members: interaction.guild?.members?.cache || new Collection()
        },
        reply: async (payload) => {
            if (typeof payload === 'string') payload = { content: payload };
            if (!interaction.replied && !interaction.deferred) {
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
        await interaction.reply({ content: '✅', flags: 64 }).catch(() => {});
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
                if (
                    interaction.guild &&
                    cmdLock.isLocked(interaction.guild.id, interaction.channelId)
                ) {
                    if (
                        !interaction.member?.permissions?.has?.(
                            PermissionFlagsBits.ManageChannels
                        )
                    ) {
                        return interaction
                            .reply({
                                content: '🔒 Comandos estão bloqueados neste canal.',
                                flags: 64
                            })
                            .catch(() => {});
                    }
                }

                const name = interaction.commandName;
                const cmd = client.slash.get(name) || client.commands.get(name);

                if (!cmd) {
                    return interaction
                        .reply({
                            content:
                                '❌ Este slash não existe mais. Aguarde a sincronização.',
                            flags: 64
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
                    .reply({ content: 'Indisponível.', flags: 64 })
                    .catch(() => {});
            }

            if (interaction.isButton() || interaction.isStringSelectMenu()) {
                const id = interaction.customId || '';
                const parts = id.split(':');
                let cmd = client.commands.get(parts[0]);

                if (!cmd && (parts[0] === 'bj' || parts[0] === 'blackjack')) {
                    cmd = client.commands.get('blackjack') || client.commands.get('bj');
                }

                if (cmd?.handleComponent) {
                    await cmd.handleComponent(interaction, client);
                }
            }
        } catch (e) {
            await autoRepair.handleCommandError({
                cmdName: interaction.commandName || interaction.customId || 'interaction',
                error: e,
                context: `slash · ${interaction.guild?.name || '?'}`,
                interaction
            });
        }
    }
};
