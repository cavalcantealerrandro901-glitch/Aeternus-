const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const abilities = require('../utils/abilities');
const player = require('../utils/player');

module.exports = {
    name: 'passivas',
    aliases: ['passive', 'passives'],
    description: 'Equipa as 5 habilidades passivas',
    async execute(message) {
        if (!player.has(message.author.id)) {
            return message.reply('Crie seu perfil com `O.j criar`.');
        }
        return message.reply(panel(message.author.id));
    },
    async handleComponent(interaction) {
        const uid = interaction.user.id;
        if (!interaction.isStringSelectMenu()) return;
        const id = interaction.customId || '';
        if (!id.startsWith('passivas:sel:')) return;
        const slot = Number(id.split(':')[2]);
        const abilityId = interaction.values[0];
        if (abilityId === 'none') abilities.unequipSlot(uid, 'passive', slot);
        else {
            const r = abilities.equipAbility(uid, abilityId, slot);
            if (!r.ok) return interaction.reply({ content: r.error, ephemeral: true });
        }
        return interaction.update(panel(uid));
    }
};

function panel(userId) {
    const loadout = abilities.loadLoadout(userId);
    const passives = abilities.listByKind('passive');
    const { passive } = abilities.getEquippedAbilities(userId);
    const lines = passive.map((a, i) =>
        a ? `**${i + 1}.** ${a.emoji} **${a.name}** — ${a.desc}` : `**${i + 1}.** _(vazio)_`
    );
    const embed = new EmbedBuilder()
        .setColor(0x7c3aed)
        .setTitle('✨ Passivas (5 slots)')
        .setDescription(lines.join('\n'))
        .setFooter({ text: 'Aparecem ao lado do avatar na arena' });

    const rows = [0, 1, 2, 3, 4].map((slot) =>
        new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId(`passivas:sel:${slot}`)
                .setPlaceholder(`Passiva ${slot + 1}`)
                .addOptions([
                    { label: 'Remover', value: 'none', emoji: '❌' },
                    ...passives.map((a) => ({
                        label: a.name,
                        value: a.id,
                        description: (a.desc || '').slice(0, 50),
                        default: loadout.passive[slot] === a.id
                    }))
                ])
        )
    );
    return { embeds: [embed], components: rows };
}
