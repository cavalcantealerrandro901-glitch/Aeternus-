const {
    EmbedBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');
const abilities = require('../utils/abilities');
const player = require('../utils/player');

module.exports = {
    name: 'habilidades',
    aliases: ['hab', 'skills', 'equiparhab'],
    description: 'Equipa até 4 habilidades ativas e 5 passivas',
    async execute(message) {
        if (!player.has(message.author.id)) {
            return message.reply('Crie seu perfil com `O.j criar` antes.');
        }
        return message.reply({ embeds: [buildEmbed(message.author.id)], components: buildRows(message.author.id) });
    },
    async handleComponent(interaction) {
        const uid = interaction.user.id;
        if (!player.has(uid)) {
            return interaction.reply({ content: 'Crie o perfil com `O.j criar`.', ephemeral: true });
        }
        const id = interaction.customId || '';
        if (interaction.isStringSelectMenu() && id.startsWith('habilidades:sel:')) {
            const [, , kind, slotStr] = id.split(':');
            const slot = Number(slotStr);
            const abilityId = interaction.values[0];
            if (abilityId === 'none') abilities.unequipSlot(uid, kind, slot);
            else {
                const r = abilities.equipAbility(uid, abilityId, slot);
                if (!r.ok) return interaction.reply({ content: r.error, ephemeral: true });
            }
            return interaction.update({ embeds: [buildEmbed(uid)], components: buildRows(uid) });
        }
        if (interaction.isButton() && id === 'habilidades:refresh') {
            return interaction.update({ embeds: [buildEmbed(uid)], components: buildRows(uid) });
        }
    }
};

function buildEmbed(userId) {
    const { active, passive } = abilities.getEquippedAbilities(userId);
    const actLines = active.map((a, i) =>
        a ? `**${i + 1}.** ${a.emoji} ${a.name} — 💧${a.mana} · CD ${a.cd}` : `**${i + 1}.** _(vazio)_`
    );
    const pasLines = passive.map((a, i) =>
        a ? `**${i + 1}.** ${a.emoji} ${a.name}` : `**${i + 1}.** _(vazio)_`
    );
    return new EmbedBuilder()
        .setColor(0xc9a227)
        .setTitle('⚔️ Habilidades equipadas')
        .setDescription('**Ativas (botões na arena):** 4 slots\n**Passivas:** use `O.passivas`')
        .addFields(
            { name: '🔥 Ativas', value: actLines.join('\n') || '—', inline: true },
            { name: '✨ Passivas', value: pasLines.join('\n') || '—', inline: true }
        )
        .setFooter({ text: 'Aeternus · Loadout de combate' });
}

function buildRows(userId) {
    const loadout = abilities.loadLoadout(userId);
    const actives = abilities.listByKind('active');
    return [0, 1, 2, 3].map((slot) =>
        new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId(`habilidades:sel:active:${slot}`)
                .setPlaceholder(`Ativa ${slot + 1}`)
                .addOptions(selectOpts(actives, loadout.active[slot]))
        )
    ).concat([
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('habilidades:refresh')
                .setLabel('Atualizar · Passivas: O.passivas')
                .setStyle(ButtonStyle.Secondary)
        )
    ]);
}

function selectOpts(list, current) {
    return [
        { label: 'Remover', value: 'none', emoji: '❌' },
        ...list.slice(0, 24).map((a) => ({
            label: a.name.slice(0, 100),
            value: a.id,
            description: (a.desc || '').slice(0, 50),
            default: current === a.id
        }))
    ];
}
