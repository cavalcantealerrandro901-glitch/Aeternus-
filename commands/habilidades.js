const {
    EmbedBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');
const player = require('../utils/player');
const classes = require('../utils/classes');
const abilities = require('../utils/abilities');

function classLabel(userId) {
    const p = player.get(userId);
    const cls = p ? classes.getClass(p.classId) : null;
    if (!cls) return 'Sem classe — use `/classe escolher`';
    return `${cls.emoji || ''} **${cls.name}**`;
}

function classLoreLines(userId) {
    const p = player.get(userId);
    const cls = p ? classes.getClass(p.classId) : null;
    if (!cls) return [];
    const out = [];
    const act = cls.activeAbilities || cls.powers || [];
    const uniq = cls.uniqueAbilities || [];
    if (uniq.length) {
        out.push('**👁️ Únicas da classe**');
        uniq.slice(0, 4).forEach((x, i) => out.push(`${i + 1}. ${x}`));
    }
    if (act.length) {
        out.push('**⚔️ Ativas da classe**');
        act.slice(0, 6).forEach((x, i) => out.push(`${i + 1}. ${x}`));
    }
    return out;
}

function panel(userId) {
    abilities.sanitizeLoadout(userId);
    const loadout = abilities.loadLoadout(userId);
    const list = abilities.listForPlayer(userId, 'active');
    const { active } = abilities.getEquippedAbilities(userId);

    const lines = active.map((a, i) =>
        a
            ? `**${i + 1}.** ${a.emoji || '⚔️'} **${a.name}**${a.unique ? ' ⭐' : ''} — ${(a.desc || '').slice(0, 90)}`
            : `**${i + 1}.** _(vazio)_`
    );

    const lore = classLoreLines(userId);
    const emb = new EmbedBuilder()
        .setColor(0xc9a227)
        .setTitle('⚔️ Habilidades ativas (4 slots)')
        .setDescription(
            [
                `Classe: ${classLabel(userId)}`,
                'Equipe só habilidades **da sua classe**. Elas aparecem na arena.',
                '',
                '**Loadout atual**',
                lines.join('\n'),
                lore.length ? '\n' + lore.join('\n') : ''
            ]
                .filter(Boolean)
                .join('\n')
                .slice(0, 4000)
        )
        .setFooter({
            text: list.length
                ? `${list.length} ativas disponíveis · O.passivas para passivas`
                : 'Nenhuma ativa cadastrada para esta classe no motor de combate'
        });

    if (!list.length) {
        return {
            embeds: [emb],
            components: [
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('habilidades:refresh')
                        .setLabel('Atualizar')
                        .setStyle(ButtonStyle.Secondary)
                )
            ]
        };
    }

    const rows = [0, 1, 2, 3].map((slot) =>
        new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId(`habilidades:sel:${slot}`)
                .setPlaceholder(`Ativa ${slot + 1}`)
                .addOptions([
                    { label: 'Remover', value: 'none', description: 'Esvaziar este slot' },
                    ...list.slice(0, 24).map((a) => ({
                        label: `${a.unique ? '⭐ ' : ''}${a.name}`.slice(0, 100),
                        value: a.id,
                        description: (a.desc || `Mana ${a.mana || 0}`).slice(0, 50),
                        default: loadout.active[slot] === a.id
                    }))
                ])
        )
    );
    rows.push(
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('habilidades:refresh')
                .setLabel('Atualizar')
                .setStyle(ButtonStyle.Secondary)
        )
    );
    return { embeds: [emb], components: rows };
}

module.exports = {
    name: 'habilidades',
    aliases: ['skills', 'skill', 'hab', 'habilidade', 'loadout'],
    description: 'Equipa habilidades ativas da sua classe',

    async execute(message) {
        if (!player.has(message.author.id)) {
            return message.reply('Crie o perfil com `O.j criar`.');
        }
        return message.reply(panel(message.author.id));
    },

    async handleComponent(interaction) {
        const id = interaction.customId || '';
        if (!id.startsWith('habilidades:')) return false;
        const uid = interaction.user.id;
        if (!player.has(uid)) {
            return interaction.reply({ content: 'Crie o perfil primeiro.', ephemeral: true });
        }

        if (id === 'habilidades:refresh') {
            return interaction.update(panel(uid));
        }

        if (id.startsWith('habilidades:sel:')) {
            const slot = parseInt(id.split(':')[2], 10);
            const value = interaction.values?.[0];
            const loadout = abilities.loadLoadout(uid);
            if (value === 'none') {
                loadout.active[slot] = null;
            } else {
                if (!abilities.abilityAllowedForUser(uid, value)) {
                    return interaction.reply({
                        content: 'Essa habilidade não é da sua classe.',
                        ephemeral: true
                    });
                }
                // evita duplicar a mesma skill em dois slots
                loadout.active = loadout.active.map((x, i) => (i !== slot && x === value ? null : x));
                loadout.active[slot] = value;
            }
            abilities.saveLoadout(uid, loadout);
            return interaction.update(panel(uid));
        }
        return false;
    }
};
