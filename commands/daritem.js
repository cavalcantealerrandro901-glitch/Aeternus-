const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');
const player = require('../utils/player');
const items = require('../utils/items');
const xp = require('../utils/xp');
const autoRepair = require('../utils/autoRepair');

/** @type {Map<string, object>} */
const pending = new Map();

function isOwner(user, client) {
    const owners = typeof autoRepair.ownerIds === 'function' ? autoRepair.ownerIds() : [];
    if (owners.includes(user.id)) return true;
    if (user.id === client.application?.owner?.id) return true;
    try {
        const members = client.application?.owner?.members;
        if (members?.has?.(user.id)) return true;
    } catch (_) {}
    return false;
}

function resolveGrant(rawKey, qty) {
    const key = String(rawKey || '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '_');
    const amount = Math.max(1, Math.min(100, Math.floor(Number(qty) || 1)));

    if (
        ['pontos', 'ponto', 'atributos', 'attr', 'attrpoints', 'pontos_atributo', 'pontos_atributos'].includes(
            key
        )
    ) {
        return {
            type: 'attr_points',
            amount,
            label: `✨ ${amount} ponto(s) de atributo`,
            emoji: '✨'
        };
    }

    const def = items.getItemDef(key);
    if (def) {
        return {
            type: 'item',
            itemId: def.id,
            amount,
            label: `${def.emoji || '🎁'} ${def.name} ×${amount}`,
            emoji: def.emoji || '🎁',
            def
        };
    }

    const name = String(rawKey || '').trim().slice(0, 64) || 'Item misterioso';
    return {
        type: 'custom',
        amount,
        label: `🎁 ${name} ×${amount}`,
        emoji: '🎁',
        name
    };
}

function applyGrant(targetId, grant) {
    if (!player.has(targetId)) {
        return { ok: false, error: 'O usuário ainda não tem perfil de jogador (`O.j criar`).' };
    }

    if (grant.type === 'attr_points') {
        xp.addAttrPoints(targetId, grant.amount);
        return { ok: true, detail: `+${grant.amount} ponto(s) de atributo` };
    }

    if (grant.type === 'item') {
        for (let i = 0; i < grant.amount; i++) {
            const inst = items.instantiateItem
                ? items.instantiateItem(grant.itemId)
                : null;
            const payload = inst || {
                id: grant.def.id,
                name: grant.def.name,
                emoji: grant.def.emoji,
                category: grant.def.category,
                rarity: grant.def.rarity,
                effects: grant.def.effects || {},
                classChange: grant.def.classChange || null,
                bookAttr: grant.def.bookAttr || null
            };
            player.addItem(targetId, payload);
        }
        return { ok: true, detail: `${grant.def.emoji || '🎁'} ${grant.def.name} ×${grant.amount}` };
    }

    for (let i = 0; i < grant.amount; i++) {
        player.addItem(targetId, {
            id: 'custom_' + Date.now().toString(36) + '_' + i,
            name: grant.name,
            emoji: '🎁',
            category: 'especial',
            rarity: 'raro',
            effects: {}
        });
    }
    return { ok: true, detail: `🎁 ${grant.name} ×${grant.amount}` };
}

module.exports = {
    name: 'daritem',
    aliases: ['giveitem', 'dar-item', 'give'],
    description: 'Dono: dar item / livros / pontos de atributo (prefixo)',

    async execute(message, args) {
        if (!isOwner(message.author, message.client)) {
            return message.reply('❌ Só o dono do bot pode usar este comando.');
        }

        const target =
            message.mentions.users.first() ||
            (args[0] && /^\d{15,25}$/.test(args[0])
                ? await message.client.users.fetch(args[0]).catch(() => null)
                : null);

        if (!target || target.bot) {
            return message.reply(
                [
                    'Uso: `O.daritem @usuário <item|pontos|livro_...> [quantidade]`',
                    '',
                    'Exemplos:',
                    '• `O.daritem @user livro_agilidade 2`',
                    '• `O.daritem @user livro_classe_mago`',
                    '• `O.daritem @user pontos 5`',
                    '• `O.daritem @user cajado_arcano`',
                    '• `O.daritem @user Espada Lendária Custom`'
                ].join('\n')
            );
        }

        const rest = args.filter((a) => !/^<@!?\d+>$/.test(a) && a !== target.id);
        if (!rest.length) {
            return message.reply('Informe o item, livro ou `pontos`.');
        }

        let qty = 1;
        let itemParts = rest;
        const last = rest[rest.length - 1];
        if (rest.length >= 2 && /^\d+$/.test(last)) {
            qty = Math.max(1, Math.min(100, parseInt(last, 10)));
            itemParts = rest.slice(0, -1);
        }
        const rawKey = itemParts.join(' ');
        const grant = resolveGrant(rawKey, qty);

        const token =
            Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
        pending.set(token, {
            ownerId: message.author.id,
            targetId: target.id,
            grant,
            at: Date.now()
        });
        setTimeout(() => pending.delete(token), 5 * 60_000);

        const emb = new EmbedBuilder()
            .setColor(0xfbbf24)
            .setTitle('🎁 Confirmar entrega de item')
            .setDescription(
                [
                    `**Destinatário:** ${target} (\`${target.id}\`)`,
                    `**Item:** ${grant.label}`,
                    '',
                    'Clique em **Confirmar** para aplicar no inventário / atributos.',
                    '_Expira em 5 minutos._'
                ].join('\n')
            )
            .setFooter({ text: 'Aeternus · Admin' })
            .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`daritem:confirm:${token}`)
                .setLabel('Confirmar')
                .setStyle(ButtonStyle.Success)
                .setEmoji('✅'),
            new ButtonBuilder()
                .setCustomId(`daritem:cancel:${token}`)
                .setLabel('Cancelar')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('❌')
        );

        return message.reply({ embeds: [emb], components: [row] });
    },

    async handleComponent(interaction) {
        const id = interaction.customId || '';
        if (!id.startsWith('daritem:')) return;

        const parts = id.split(':');
        const action = parts[1];
        const token = parts[2];
        const entry = pending.get(token);

        if (!entry) {
            return interaction
                .update({
                    content: '⏰ Esta solicitação expirou.',
                    embeds: [],
                    components: []
                })
                .catch(() =>
                    interaction.reply({ content: '⏰ Expirou.', ephemeral: true })
                );
        }

        if (interaction.user.id !== entry.ownerId) {
            return interaction.reply({
                content: 'Só quem iniciou pode confirmar.',
                ephemeral: true
            });
        }

        if (action === 'cancel') {
            pending.delete(token);
            return interaction.update({
                content: '❌ Entrega cancelada.',
                embeds: [],
                components: []
            });
        }

        if (action === 'confirm') {
            pending.delete(token);
            const result = applyGrant(entry.targetId, entry.grant);
            if (!result.ok) {
                return interaction.update({
                    content: `❌ ${result.error}`,
                    embeds: [],
                    components: []
                });
            }

            const emb = new EmbedBuilder()
                .setColor(0x22c55e)
                .setTitle('✅ Item entregue')
                .setDescription(
                    [
                        `**Para:** <@${entry.targetId}>`,
                        `**Recebeu:** ${result.detail}`,
                        '',
                        'Integrado ao inventário / atributos do jogador.'
                    ].join('\n')
                )
                .setTimestamp();

            return interaction.update({ embeds: [emb], components: [] });
        }
    }
};
