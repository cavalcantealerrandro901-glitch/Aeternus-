const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    SlashCommandBuilder
} = require('discord.js');
const player = require('../utils/player');
const xp = require('../utils/xp');
const items = require('../utils/items');
const craft = require('../utils/craft');

const COLOR = 0xf59e0b;

function fmtCost(cost) {
    return Object.entries(cost || {})
        .map(([k, v]) => {
            const d = items.getMaterialDef(k);
            return `${d?.emoji || '📦'} ${d?.name || k} ×${v}`;
        })
        .join('\n');
}

function listEmbed(user) {
    const profile = player.get(user.id);
    const emb = new EmbedBuilder()
        .setColor(COLOR)
        .setAuthor({ name: user.username, iconURL: user.displayAvatarURL({ size: 64 }) })
        .setTitle('⚒️ Bancada de Craft');

    if (!profile?.name) {
        emb.setDescription('Crie um personagem com `O.j criar` primeiro.');
        return emb;
    }

    const st = xp.get(user.id);
    const recipes = items.listRecipesFor(st.level, profile.classId);

    emb.setDescription(
        [
            `👤 **${profile.name}** · ${player.getClass(profile.classId).emoji} ${player.getClass(profile.classId).name}`,
            `⭐ Nível **${st.level}**`,
            '',
            recipes.length
                ? '_Receitas disponíveis para você:_'
                : '_Nenhuma receita liberada ainda. Suba de nível!_'
        ].join('\n')
    );

    for (const r of recipes.slice(0, 12)) {
        const def = items.getItemDef(r.result);
        const rarity = items.RARITY[def?.rarity]?.name || '?';
        emb.addFields({
            name: `${def?.emoji || '🎁'} ${def?.name || r.result} · ${rarity}`,
            value: [
                def?.desc || '_Sem descrição_',
                `**Custo**\n${fmtCost(r.cost)}`,
                r.needItemId
                    ? `Consome: ${items.getItemDef(r.needItemId)?.name || r.needItemId}`
                    : r.needItemRarity
                      ? `Consome: 1 item ${r.needItemRarity}`
                      : '',
                `ID: \`${r.result}\``
            ]
                .filter(Boolean)
                .join('\n')
                .slice(0, 1020),
            inline: false
        });
    }

    emb.setFooter({ text: 'O.craft <id> · Ex: O.craft caixa_selada' });
    return emb;
}

function confirmPayload(user, recipeId) {
    const check = craft.canCraft(user.id, recipeId);
    const def = items.getItemDef(recipeId) || items.getItemDef(items.getRecipe(recipeId)?.result);
    const emb = new EmbedBuilder()
        .setColor(COLOR)
        .setTitle(`⚒️ Craft · ${def?.emoji || ''} ${def?.name || recipeId}`);

    if (!check.ok) {
        emb.setDescription(check.error);
        return { embeds: [emb], components: [] };
    }

    emb.setDescription(
        [
            def?.desc || '',
            '',
            '**Materiais que serão consumidos:**',
            fmtCost(check.recipe.cost),
            '',
            check.recipe.failChance
                ? `⚠️ Chance de falha: **${Math.round(check.recipe.failChance * 100)}%**`
                : '✅ Craft garantido',
            '',
            'Confirme abaixo.'
        ]
            .filter(Boolean)
            .join('\n')
    );

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`craft:ok:${user.id}:${recipeId}`)
            .setLabel('Confirmar')
            .setStyle(ButtonStyle.Success)
            .setEmoji('✅'),
        new ButtonBuilder()
            .setCustomId(`craft:no:${user.id}`)
            .setLabel('Cancelar')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('❌')
    );

    return { embeds: [emb], components: [row] };
}

module.exports = {
    name: 'craft',
    aliases: ['criaritem', 'fundir', 'forjar'],
    description: 'Craft de itens e receitas',
    data: new SlashCommandBuilder()
        .setName('craft')
        .setDescription('Bancada de craft de itens')
        .addStringOption((o) =>
            o
                .setName('item')
                .setDescription('ID do item (vazio = lista)')
                .setRequired(false)
        ),

    async execute(message, args) {
        const id = String(args[0] || '').toLowerCase();
        if (!id || id === 'lista' || id === 'list') {
            return message.reply({ embeds: [listEmbed(message.author)] });
        }
        return message.reply(confirmPayload(message.author, id));
    },

    async executeSlash(i) {
        const id = String(i.options.getString('item') || '').toLowerCase();
        if (!id || id === 'lista') {
            return i.reply({ embeds: [listEmbed(i.user)] });
        }
        return i.reply(confirmPayload(i.user, id));
    },

    async handleComponent(interaction) {
        const parts = (interaction.customId || '').split(':');
        if (parts[0] !== 'craft') return;

        const action = parts[1];
        const ownerId = parts[2];

        if (interaction.user.id !== ownerId) {
            return interaction.reply({
                content: 'Só quem iniciou o craft pode confirmar.',
                flags: 64
            });
        }

        if (action === 'no') {
            return interaction.update({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0x6b7280)
                        .setTitle('Craft cancelado')
                        .setDescription('Nada foi consumido.')
                ],
                components: []
            });
        }

        if (action === 'ok') {
            const recipeId = parts[3];
            const res = craft.doCraft(interaction.user.id, recipeId);

            if (!res.ok) {
                return interaction.update({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(0xf87171)
                            .setTitle('Craft bloqueado')
                            .setDescription(res.error)
                    ],
                    components: []
                });
            }

            if (res.failed) {
                return interaction.update({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(0xfbbf24)
                            .setTitle('Craft falhou')
                            .setDescription(res.message)
                    ],
                    components: []
                });
            }

            const it = res.item;
            return interaction.update({
                embeds: [
                    new EmbedBuilder()
                        .setColor(items.RARITY[it.rarity]?.color || COLOR)
                        .setTitle('✨ Craft concluído!')
                        .setDescription(
                            `${it.emoji || '🎁'} **${it.name}**\nRaridade: **${items.RARITY[it.rarity]?.name || it.rarity}**\n\n${it.desc || ''}`
                        )
                        .setFooter({ text: 'Veja em O.inventario' })
                ],
                components: []
            });
        }
    }
};
