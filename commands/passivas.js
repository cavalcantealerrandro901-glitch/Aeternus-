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

function safeListPassive(userId) {
    if (typeof abilities.listForPlayer === 'function') {
        return abilities.listForPlayer(userId, 'passive') || [];
    }
    if (typeof abilities.listByKind === 'function') {
        return abilities.listByKind('passive', userId) || [];
    }
    return [];
}

function safeLoadout(userId) {
    if (typeof abilities.sanitizeLoadout === 'function') {
        return abilities.sanitizeLoadout(userId);
    }
    if (typeof abilities.loadLoadout === 'function') {
        return abilities.loadLoadout(userId);
    }
    return { active: [null, null, null, null], passive: [null, null, null, null, null] };
}

function safeEquipped(userId) {
    if (typeof abilities.getEquippedAbilities === 'function') {
        return abilities.getEquippedAbilities(userId);
    }
    const loadout = safeLoadout(userId);
    return {
        active: (loadout.active || []).map((id) => (id && abilities.getAbility ? abilities.getAbility(id) : null)),
        passive: (loadout.passive || []).map((id) => (id && abilities.getAbility ? abilities.getAbility(id) : null)),
        loadout
    };
}

function allowed(userId, abilityId) {
    if (typeof abilities.abilityAllowedForUser === 'function') {
        return abilities.abilityAllowedForUser(userId, abilityId);
    }
    if (typeof abilities.canUseAbility === 'function') {
        return abilities.canUseAbility(userId, abilities.getAbility(abilityId));
    }
    return true;
}

function classLoreLines(userId) {
    const p = player.get(userId);
    const cls = p ? classes.getClass(p.classId) : null;
    if (!cls) return [];
    const out = [];
    const up = cls.uniquePassives || [];
    const pa = cls.passives || [];
    if (up.length) {
        out.push('**🔮 Passivas únicas**');
        up.slice(0, 5).forEach((x, i) => out.push(`${i + 1}. ${x}`));
    }
    if (pa.length) {
        out.push('**🧠 Passivas da classe**');
        pa.slice(0, 6).forEach((x, i) => out.push(`${i + 1}. ${x}`));
    }
    return out;
}

function panel(userId) {
    const loadout = safeLoadout(userId);
    const list = safeListPassive(userId);
    const { passive } = safeEquipped(userId);
    const slots = Array.isArray(passive) ? passive : [null, null, null, null, null];

    const lines = [0, 1, 2, 3, 4].map((i) => {
        const a = slots[i];
        return a
            ? `**${i + 1}.** ${a.emoji || '✨'} **${a.name}**${a.unique ? ' ⭐' : ''} — ${(a.desc || '').slice(0, 90)}`
            : `**${i + 1}.** _(vazio)_`;
    });

    const lore = classLoreLines(userId);
    const emb = new EmbedBuilder()
        .setColor(0x7c3aed)
        .setTitle('✨ Passivas (5 slots)')
        .setDescription(
            [
                `Classe: ${classLabel(userId)}`,
                'Equipe só passivas **da sua classe**.',
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
                ? `${list.length} passivas disponíveis · O.habilidades para ativas`
                : 'Nenhuma passiva no motor de combate para esta classe'
        });

    if (!list.length) {
        return {
            embeds: [emb],
            components: [
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('passivas:refresh')
                        .setLabel('Atualizar')
                        .setStyle(ButtonStyle.Secondary)
                )
            ]
        };
    }

    const rows = [0, 1, 2, 3, 4].map((slot) =>
        new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId(`passivas:sel:${slot}`)
                .setPlaceholder(`Passiva ${slot + 1}`)
                .addOptions([
                    { label: 'Remover', value: 'none', description: 'Esvaziar este slot' },
                    ...list.slice(0, 24).map((a) => ({
                        label: `${a.unique ? '⭐ ' : ''}${a.name}`.slice(0, 100),
                        value: a.id,
                        description: (a.desc || '').slice(0, 50),
                        default: (loadout.passive || [])[slot] === a.id
                    }))
                ])
        )
    );
    return { embeds: [emb], components: rows.slice(0, 5) };
}

module.exports = {
    name: 'passivas',
    aliases: ['passive', 'passives', 'passiva'],
    description: 'Equipa passivas da sua classe',

    async execute(message) {
        if (!player.has(message.author.id)) {
            return message.reply('Crie o perfil com `O.j criar`.');
        }
        return message.reply(panel(message.author.id));
    },

    async handleComponent(interaction) {
        const id = interaction.customId || '';
        if (!id.startsWith('passivas:')) return false;
        const uid = interaction.user.id;
        if (!player.has(uid)) {
            return interaction.reply({ content: 'Crie o perfil primeiro.', ephemeral: true });
        }
        if (id === 'passivas:refresh') return interaction.update(panel(uid));
        if (id.startsWith('passivas:sel:')) {
            const slot = parseInt(id.split(':')[2], 10);
            const value = interaction.values?.[0];
            const loadout = safeLoadout(uid);
            if (!Array.isArray(loadout.passive)) loadout.passive = [null, null, null, null, null];
            if (value === 'none') {
                loadout.passive[slot] = null;
            } else {
                if (!allowed(uid, value)) {
                    return interaction.reply({
                        content: 'Essa passiva não é da sua classe.',
                        ephemeral: true
                    });
                }
                loadout.passive = loadout.passive.map((x, i) => (i !== slot && x === value ? null : x));
                loadout.passive[slot] = value;
            }
            if (typeof abilities.saveLoadout === 'function') abilities.saveLoadout(uid, loadout);
            return interaction.update(panel(uid));
        }
        return false;
    }
};
