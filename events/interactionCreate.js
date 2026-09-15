const cmdLock = require('../utils/cmdLock');
const autoRepair = require('../utils/autoRepair');
const musicManager = require('../utils/musicManager');
const { Collection, PermissionFlagsBits } = require('discord.js');

function isUnknownInteraction(err) {
    const code = err?.code ?? err?.rawError?.code;
    return code === 10062 || /unknown interaction/i.test(String(err?.message || ''));
}

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
                        const hint = cmdLock.redirectHint(interaction.guild.id);
                        return interaction
                            .reply({
                                content:
                                    `🔒 ${interaction.user}, os **meus comandos** estão bloqueados neste chat.\n` +
                                    hint,
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
            // 10062 = interação já expirou / já respondida — não spammar DM
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
