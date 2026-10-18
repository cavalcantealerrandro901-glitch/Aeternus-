const { PermissionFlagsBits } = require('discord.js');
const store = require('../utils/store');

const STATE_KEY = 'nickColors.json';

function getState() {
    const value = store.load(STATE_KEY, {});
    return value && typeof value === 'object' ? value : {};
}

async function resolveReaction(reaction) {
    if (reaction.partial) {
        try { await reaction.fetch(); } catch (_) { return null; }
    }
    if (reaction.message?.partial) {
        try { await reaction.message.fetch(); } catch (_) { return null; }
    }
    return reaction;
}

async function handleAdd(reaction, user) {
    if (!user || user.bot) return;
    const resolved = await resolveReaction(reaction);
    if (!resolved?.message?.guild) return;

    const guild = resolved.message.guild;
    const state = getState();
    const guildState = state[guild.id];
    if (!guildState) return;

    const panel = (guildState.panels || []).find((item) => item.messageId === resolved.message.id);
    if (!panel) return;
    const choice = (panel.colors || []).find((item) => item.emoji === resolved.emoji.name);
    if (!choice) return;

    const member = await guild.members.fetch(user.id).catch(() => null);
    if (!member || member.user.bot) return;
    const me = guild.members.me || await guild.members.fetchMe().catch(() => null);
    if (!me?.permissions?.has(PermissionFlagsBits.ManageRoles)) return;

    const current = guildState.selections?.[user.id];
    if (current?.roleId === choice.roleId) return;

    try {
        if (!member.manageable) {
            await resolved.users.remove(user.id).catch(() => {});
            return;
        }

        if (current?.roleId && member.roles.cache.has(current.roleId)) {
            await member.roles.remove(current.roleId, 'Aeternus • troca da cor do nick');
        }

        await member.roles.add(choice.roleId, 'Aeternus • escolha da cor do nick');

        guildState.selections = guildState.selections || {};
        guildState.selections[user.id] = {
            roleId: choice.roleId,
            messageId: resolved.message.id,
            channelId: resolved.message.channelId,
            emoji: resolved.emoji.name
        };
        state[guild.id] = guildState;
        store.save(STATE_KEY, state);

        // Retira a reação anterior depois de salvar a nova seleção. Assim,
        // o evento de remoção antigo não apaga a cor recém-escolhida.
        if (current?.messageId && current?.emoji) {
            const oldChannel = await guild.channels.fetch(current.channelId).catch(() => null);
            const oldMessage = oldChannel?.isTextBased()
                ? await oldChannel.messages.fetch(current.messageId).catch(() => null)
                : null;
            const oldReaction = oldMessage?.reactions?.cache?.find((item) => item.emoji.name === current.emoji);
            if (oldReaction) await oldReaction.users.remove(user.id).catch(() => {});
        }
    } catch (error) {
        console.warn('[colorirNick] Falha ao aplicar cor:', error.message);
        await resolved.users.remove(user.id).catch(() => {});
    }
}

async function handleRemove(reaction, user) {
    if (!user || user.bot) return;
    const resolved = await resolveReaction(reaction);
    if (!resolved?.message?.guild) return;
    const guild = resolved.message.guild;
    const state = getState();
    const guildState = state[guild.id];
    if (!guildState) return;

    const panel = (guildState.panels || []).find((item) => item.messageId === resolved.message.id);
    if (!panel) return;
    const choice = (panel.colors || []).find((item) => item.emoji === resolved.emoji.name);
    if (!choice) return;

    const current = guildState.selections?.[user.id];
    // Uma reação antiga pode ser removida automaticamente durante a troca.
    // Só remover o cargo se esta ainda for a seleção ativa do membro.
    if (!current || current.messageId !== resolved.message.id || current.emoji !== resolved.emoji.name) return;

    const member = await guild.members.fetch(user.id).catch(() => null);
    if (member?.roles?.cache?.has(current.roleId)) {
        await member.roles.remove(current.roleId, 'Aeternus • remoção da reação de cor').catch(() => {});
    }
    delete guildState.selections[user.id];
    state[guild.id] = guildState;
    store.save(STATE_KEY, state);
}

function setup(client) {
    const previous = global.__aeternusColorNickHandlers;
    if (previous?.client) {
        previous.client.removeListener('messageReactionAdd', previous.add);
        previous.client.removeListener('messageReactionRemove', previous.remove);
    }

    const add = (reaction, user) => handleAdd(reaction, user).catch((error) => {
        console.warn('[colorirNick] reaction add:', error.message);
    });
    const remove = (reaction, user) => handleRemove(reaction, user).catch((error) => {
        console.warn('[colorirNick] reaction remove:', error.message);
    });

    client.on('messageReactionAdd', add);
    client.on('messageReactionRemove', remove);
    global.__aeternusColorNickHandlers = { client, add, remove };
}

function destroy(client) {
    const handlers = global.__aeternusColorNickHandlers;
    if (!handlers || handlers.client !== client) return;
    client.removeListener('messageReactionAdd', handlers.add);
    client.removeListener('messageReactionRemove', handlers.remove);
    global.__aeternusColorNickHandlers = null;
}

module.exports = { setup, destroy };
