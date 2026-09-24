const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuBuilder
} = require('discord.js');
const classes = require('../utils/classes');
const player = require('../utils/player');

function classEmbed(cls) {
    const emb = new EmbedBuilder()
        .setColor(cls.color || 0xc9a227)
        .setTitle(`${cls.emoji || '✨'} ${cls.name}`)
        .setDescription(cls.desc || '—')
        .addFields(
            { name: 'Raridade', value: cls.rarityName || cls.rarity || 'Comum', inline: true },
            { name: 'Tipo', value: cls.type || '—', inline: true },
            { name: 'ID', value: '`' + cls.id + '`', inline: true }
        );
    const ua = (cls.uniqueAbilities || []).filter((x) => x && x !== '—');
    const aa = (cls.activeAbilities || cls.powers || []).filter((x) => x && x !== '—');
    const up = (cls.uniquePassives || []).filter((x) => x && x !== '—');
    const pa = (cls.passives || []).filter((x) => x && x !== '—');
    if (ua.length) emb.addFields({ name: '⭐ Habilidades únicas', value: ua.map((x, i) => `${i + 1}. ${x}`).join('\n') });
    if (aa.length) emb.addFields({ name: '⚔️ Ativas', value: aa.map((x, i) => `${i + 1}. ${x}`).join('\n') });
    if (up.length) emb.addFields({ name: '💎 Passivas únicas', value: up.map((x, i) => `${i + 1}. ${x}`).join('\n') });
    if (pa.length) emb.addFields({ name: '✨ Passivas', value: pa.map((x, i) => `${i + 1}. ${x}`).join('\n') });
    if (cls.disadvantages?.length) emb.addFields({ name: '⚠️ Desvantagens', value: cls.disadvantages.join(' · ') });
    if (cls.exclusiveOwner) emb.addFields({ name: '🔒 Exclusiva', value: `<@${cls.exclusiveOwner}>` });
    return emb;
}

function pickButtons(classId) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`classe:pick:${classId}`).setLabel('Escolher esta classe').setStyle(ButtonStyle.Primary).setEmoji('⚔️'),
        new ButtonBuilder().setCustomId('classe:lista').setLabel('Ver todas').setStyle(ButtonStyle.Secondary)
    );
}

async function showChooseMenu(interaction, isUpdate = false) {
    const list = classes.listClasses(interaction.user.id).slice(0, 25);
    const menu = new StringSelectMenuBuilder()
        .setCustomId('classe:sel:pick')
        .setPlaceholder('Escolha sua classe')
        .addOptions(
            list.map((c) => ({
                label: c.name.slice(0, 100),
                value: c.id,
                description: `${c.rarityName || c.rarity || 'Comum'} · ${(c.desc || '').slice(0, 40)}`.slice(0, 100),
                emoji: c.emoji && String(c.emoji).length <= 4 ? c.emoji : undefined
            }))
        );
    const payload = {
        content: 'Escolha sua classe (quem tinha classe antiga também pode trocar):',
        components: [new ActionRowBuilder().addComponents(menu)],
        ephemeral: true
    };
    if (isUpdate && interaction.isMessageComponent()) return interaction.update(payload);
    if (interaction.replied || interaction.deferred) return interaction.followUp(payload);
    return interaction.reply(payload);
}

const data = new SlashCommandBuilder()
    .setName('classe')
    .setDescription('Gerenciar e escolher classes Aeternus')
    .addSubcommand((s) => s.setName('lista').setDescription('Lista classes disponíveis para você'))
    .addSubcommand((s) =>
        s
            .setName('ver')
            .setDescription('Ver detalhes de uma classe')
            .addStringOption((o) => o.setName('id').setDescription('id ou nome').setRequired(true))
    )
    .addSubcommand((s) => s.setName('escolher').setDescription('Escolher ou trocar classe'));

module.exports = {
    name: 'classe',
    aliases: ['classes', 'classeadmin', 'criarclasse'],
    description: 'Classes: listar e escolher',
    data,

    async executeSlash(interaction) {
        const sub = interaction.options.getSubcommand();
        if (sub === 'lista') {
            const list = classes.listClasses(interaction.user.id);
            const lines = list.map(
                (c) =>
                    `${c.emoji || '✨'} **${c.name}** · ${c.rarityName || 'Comum'} · \`${c.id}\`${c.exclusiveOwner ? ' · 🔒' : ''}`
            );
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0xc9a227)
                        .setTitle('📜 Classes Aeternus')
                        .setDescription(lines.join('\n').slice(0, 4000) || '_Nenhuma_')
                ],
                ephemeral: true
            });
        }
        if (sub === 'ver') {
            const q = interaction.options.getString('id', true).toLowerCase();
            const list = classes.listClasses(interaction.user.id);
            const cls =
                classes.getClass(q) ||
                list.find((c) => c.id === q || c.name.toLowerCase().includes(q));
            if (!cls || (cls.exclusiveOwner && !classes.canUseClass(interaction.user.id, cls.id))) {
                return interaction.reply({ content: 'Classe não encontrada ou exclusiva.', ephemeral: true });
            }
            return interaction.reply({
                embeds: [classEmbed(cls)],
                components: [pickButtons(cls.id)],
                ephemeral: true
            });
        }
        if (sub === 'escolher') return showChooseMenu(interaction);
    },

    async execute(message) {
        return message.reply('Use o slash **`/classe escolher`** ou **`/classe lista`**.');
    },

    async handleComponent(interaction) {
        const id = interaction.customId || '';
        if (id === 'classe:lista') return showChooseMenu(interaction, true);
        if (id.startsWith('classe:pick:')) {
            const classId = id.slice('classe:pick:'.length);
            if (!player.has(interaction.user.id)) {
                return interaction.reply({ content: 'Crie o perfil com `O.j criar` primeiro.', ephemeral: true });
            }
            if (!classes.canUseClass(interaction.user.id, classId)) {
                return interaction.reply({
                    content: 'Esta classe é exclusiva de outro jogador.',
                    ephemeral: true
                });
            }
            const resolved = classes.resolveClassId(classId);
            player.update(interaction.user.id, { classId: resolved });
            const c = classes.getClass(resolved);
            return interaction.reply({
                content: `✅ Classe: **${c.emoji} ${c.name}** (${c.rarityName || c.rarity || 'Comum'})`,
                embeds: [classEmbed(c)],
                ephemeral: true
            });
        }
        if (id.startsWith('classe:sel:')) {
            const classId = interaction.values[0];
            if (!player.has(interaction.user.id)) {
                return interaction.reply({ content: 'Crie o perfil com `O.j criar`.', ephemeral: true });
            }
            if (!classes.canUseClass(interaction.user.id, classId)) {
                return interaction.reply({
                    content: 'Esta classe é exclusiva de outro jogador.',
                    ephemeral: true
                });
            }
            const resolved = classes.resolveClassId(classId);
            player.update(interaction.user.id, { classId: resolved });
            const c = classes.getClass(resolved);
            return interaction.update({
                content: `✅ Classe: **${c.emoji} ${c.name}**`,
                embeds: [classEmbed(c)],
                components: []
            });
        }
    }
};
