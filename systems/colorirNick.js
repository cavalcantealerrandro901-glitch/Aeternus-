const { PermissionFlagsBits, EmbedBuilder } = require('discord.js');
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
    if (!me?.permissions?.has(PermissionFlagsBits.ManageRoles)) {
        console.warn('[colorirNick] Não posso atribuir cores: falta a permissão Gerenciar cargos.');
        return;
    }

    const current = guildState.selections?.[user.id];
    if (current?.roleId === choice.roleId && member.roles.cache.has(choice.roleId)) return;

    try {
        // Busca o cargo atualizado no Discord, pois ele pode ter sido recriado no boot.
        const role = guild.roles.cache.get(choice.roleId) || await guild.roles.fetch(choice.roleId).catch(() => null);
        if (!role) throw new Error('cargo não encontrado; recrie o painel com /colorir-nick');
        if (role.managed || role.position >= me.roles.highest.position) {
            throw new Error('cargo fora da hierarquia gerenciável; mova o cargo do Aeternus acima dos cargos de cor');
        }

        // Primeiro atribui a nova cor. Só remove a antiga depois que a atribuição funciona.
        await member.roles.add(role, 'Aeternus • escolha da cor do nick');

        guildState.selections = guildState.selections || {};
        guildState.selections[user.id] = {
            roleId: role.id,
            messageId: resolved.message.id,
            channelId: resolved.message.channelId,
            emoji: resolved.emoji.name
        };
        state[guild.id] = guildState;
        store.save(STATE_KEY, state);

        if (current?.roleId && current.roleId !== role.id && member.roles.cache.has(current.roleId)) {
            await member.roles.remove(current.roleId, 'Aeternus • troca da cor do nick').catch((error) => {
                console.warn('[colorirNick] A nova cor foi atribuída, mas não consegui remover a anterior:', error.message);
            });
        }

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
        console.warn('[colorirNick] Falha ao aplicar cor:', error.code || '', error.message);
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

async function rebuildRolesOnStartup(client) {
    const state = getState();
    let rebuiltGuilds = 0;

    for (const [guildId, guildState] of Object.entries(state)) {
        const panels = Array.isArray(guildState?.panels) ? guildState.panels : [];
        if (!panels.length) continue;

        const guild = client.guilds.cache.get(guildId) || await client.guilds.fetch(guildId).catch(() => null);
        if (!guild) continue;

        const me = guild.members.me || await guild.members.fetchMe().catch(() => null);
        if (!me?.permissions?.has(PermissionFlagsBits.ManageRoles)) {
            console.warn(`[colorirNick] Sem Gerenciar cargos no servidor ${guildId}; mantendo cargos existentes.`);
            continue;
        }

        // Reúne apenas cargos cujos IDs estão registrados nos painéis deste sistema.
        const oldRoleIds = new Set();
        const colorsByOldId = new Map();
        for (const panel of panels) {
            for (const color of panel.colors || []) {
                if (!color?.roleId || !Number.isInteger(Number(color.value))) continue;
                oldRoleIds.add(color.roleId);
                colorsByOldId.set(color.roleId, color);
            }
        }
        if (!oldRoleIds.size) continue;

        const replacements = new Map();
        let failed = false;
        for (const [oldId, color] of colorsByOldId) {
            try {
                const role = await guild.roles.create({
                    name: 'Nick • ' + String(color.name || 'Cor').slice(0, 85),
                    colors: { primaryColor: Number(color.value) },
                    hoist: false,
                    mentionable: false,
                    reason: 'Aeternus • recriação automática dos cargos Colorir Nick ao iniciar'
                });
                const position = Math.max(1, me.roles.highest.position - 1);
                await role.setPosition(position);
                replacements.set(oldId, role);
            } catch (error) {
                failed = true;
                console.error(`[colorirNick] Não foi possível recriar cargo no servidor ${guildId}:`, error.message);
                break;
            }
        }

        // Se alguma criação falhar, não apaga os cargos antigos; remove apenas os novos
        // criados nesta tentativa para evitar deixar o painel sem cargos válidos.
        if (failed) {
            for (const role of replacements.values()) {
                await role.delete('Aeternus • cancelando recriação incompleta dos cargos Colorir Nick').catch(() => {});
            }
            continue;
        }

        for (const panel of panels) {
            panel.colors = (panel.colors || []).map((color) => {
                const replacement = replacements.get(color.roleId);
                return replacement ? { ...color, roleId: replacement.id } : color;
            });

            const channel = await guild.channels.fetch(panel.channelId).catch(() => null);
            const message = channel?.isTextBased()
                ? await channel.messages.fetch(panel.messageId).catch(() => null)
                : null;
            if (!message) continue;

            const embed = new EmbedBuilder()
                .setColor(0xA78BFA)
                .setAuthor({ name: 'AETERNUS • CENTRAL DE CORES' })
                .setTitle('🎨 COLORIR NICK')
                .setDescription('Reaja com o símbolo correspondente para escolher a cor do seu nick.\\n\\n**Você pode ter apenas uma cor por vez.** Se escolher outra, a cor anterior será removida.')
                .addFields((panel.colors || []).map((color) => ({
                    name: color.emoji + '  ' + (color.name || 'Cor'),
                    value: '**' + (color.hex || '#A78BFA') + '** · <@&' + color.roleId + '>',
                    inline: true
                })))
                .setFooter({ text: 'Aeternus • Reaja para aplicar · uma cor por membro' })
                .setTimestamp();
            await message.edit({ embeds: [embed] }).catch((error) => {
                console.warn('[colorirNick] Não foi possível atualizar o painel:', error.message);
            });
        }

        // As seleções antigas apontam para cargos que serão excluídos.
        guildState.selections = {};
        state[guildId] = guildState;
        store.save(STATE_KEY, state);

        for (const oldId of oldRoleIds) {
            const oldRole = guild.roles.cache.get(oldId) || await guild.roles.fetch(oldId).catch(() => null);
            if (oldRole && oldRole.id !== replacements.get(oldId)?.id) {
                await oldRole.delete('Aeternus • substituição dos cargos Colorir Nick ao iniciar').catch((error) => {
                    console.warn('[colorirNick] Não foi possível excluir cargo antigo:', error.message);
                });
            }
        }

        rebuiltGuilds++;
        console.log(`[colorirNick] Cargos de cor recriados no servidor ${guildId} (${replacements.size}).`);
    }

    if (rebuiltGuilds) console.log(`[colorirNick] Inicialização concluída em ${rebuiltGuilds} servidor(es).`);
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

module.exports = { setup, destroy, rebuildRolesOnStartup };
