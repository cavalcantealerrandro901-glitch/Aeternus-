const classAdvancement = require('../utils/classAdvancement');
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
        author: interaction.user, member: interaction.member, guild: interaction.guild,
        channel: interaction.channel, client, content: raw,
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
                return interaction.reply({ ...payload, fetchReply: true });
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
                const group = interaction.commandName;
                let name = group;
                let cmd = null;

                if (interaction.options?.getSubcommand) {
                    const sub = interaction.options.getSubcommand(false);
                    if (sub) {
                        name = group + ' ' + sub;
                        cmd = client.slashRoutes?.get(name) || null;
                    }
                }

                // Comandos raiz renomeados (sem hífen) preservam suas opções internas.
                if (!cmd) cmd = client.slashRoutes?.get('__root:' + group) || null;
                if (!cmd) cmd = client.slash.get(group) || client.commands.get(group);

                if (!cmd) {
                    return interaction.reply({
                        content: '❌ Não encontrei esse comando. Aguarde a sincronização dos slash.',
                        ephemeral: true
                    }).catch(() => {});
                }

                if (typeof cmd.executeSlash === 'function') {
                    try {
                        await cmd.executeSlash(interaction, client);
                        try {
                            const notice = classAdvancement.notifyCommand(interaction.user.id);
                            if (notice && interaction.channel) await interaction.channel.send(notice);
                        } catch (_) {}
                    } catch (err) {
                        if (err && (err.code === 10062 || err.code === 40060)) return;
                        console.error('[slash /' + name + ']', err);
                        const reply = { content: '❌ Ocorreu um erro ao executar este comando.' };
                        if (interaction.deferred || interaction.replied) await interaction.followUp({ ...reply, ephemeral: true }).catch(() => {});
                        else await interaction.reply({ ...reply, ephemeral: true }).catch(() => {});
                    }
                    return;
                }

                if (!interaction.deferred && !interaction.replied) await interaction.deferReply().catch(() => {});
                if (typeof cmd.execute === 'function') {
                    try {
                        await bridgeSlashToPrefix(interaction, cmd, client);
                        try {
                            const notice = classAdvancement.notifyCommand(interaction.user.id);
                            if (notice && interaction.channel) await interaction.channel.send(notice);
                        } catch (_) {}
                    } catch (err) {
                        if (err && (err.code === 10062 || err.code === 40060)) return;
                        console.error('[slash-bridge /' + name + ']', err);
                        await interaction.followUp({ content: '❌ Ocorreu um erro ao executar este comando.', ephemeral: true }).catch(() => {});
                    }
                    return;
                }
                return interaction.reply({ content: 'Indisponível.', ephemeral: true }).catch(() => {});
            }

            if (interaction.isButton() || interaction.isStringSelectMenu()) {
                const id = interaction.customId || '';
                const parts = id.split(':');
                let cmd = client.commands.get(parts[0]);
                if (!cmd && (parts[0] === 'bj' || parts[0] === 'blackjack')) cmd = client.commands.get('blackjack') || client.commands.get('bj');
                if (!cmd && (parts[0] === 'pvp' || parts[0] === 'arena')) cmd = client.commands.get('arena');
                if (!cmd && parts[0] === 'j') cmd = client.commands.get('j');
                if (!cmd && parts[0] === 'rank') cmd = client.commands.get('rank');
                if (!cmd && parts[0] === 'quiz') cmd = client.commands.get('quiz');
                if (!cmd && id.startsWith('loja:')) cmd = client.commands.get('loja');
                if (!cmd && parts[0] === 'habilidades') cmd = client.commands.get('habilidades');
                if (!cmd && parts[0] === 'passivas') cmd = client.commands.get('passivas');
                if (!cmd && parts[0] === 'classe') cmd = client.commands.get('classe');
                if (parts[0] === 'act' && parts[1] === 'devolver' && parts[2]) cmd = client.commands.get(parts[2]);
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
            console.error('[interaction ' + (interaction.customId || interaction.commandName || '?') + ']', e);
            if (!interaction.replied && !interaction.deferred) await interaction.reply({ content: '❌ Ocorreu um erro ao processar esta interação.', ephemeral: true }).catch(() => {});
        }
    }
};
