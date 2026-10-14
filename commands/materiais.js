const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const player = require('../utils/player');
const craft = require('../utils/craft');
const items = require('../utils/items');

/** Catálogo padrão de materiais (fallback se items.MATERIALS não existir). */
const DEFAULT_MATERIALS = {
    fragmento_eter: { id: 'fragmento_eter', name: 'Fragmento de Éter', emoji: '✨' },
    po_arcano: { id: 'po_arcano', name: 'Pó Arcano', emoji: '🪄' },
    essencia_sombria: { id: 'essencia_sombria', name: 'Essência Sombria', emoji: '🌑' },
    cristal_bruto: { id: 'cristal_bruto', name: 'Cristal Bruto', emoji: '💎' },
    fibra_antiga: { id: 'fibra_antiga', name: 'Fibra Antiga', emoji: '🧵' },
    osso_runico: { id: 'osso_runico', name: 'Osso Rúnico', emoji: '🦴' },
    lima_solar: { id: 'lima_solar', name: 'Lima Solar', emoji: '☀️' },
    gota_lunar: { id: 'gota_lunar', name: 'Gota Lunar', emoji: '🌙' }
};

function materialCatalog() {
    if (items && items.MATERIALS && typeof items.MATERIALS === 'object') {
        return items.MATERIALS;
    }
    if (typeof items?.getMaterialDef === 'function') {
        // monta a partir das chaves do inventário do usuário + defaults
        return DEFAULT_MATERIALS;
    }
    return DEFAULT_MATERIALS;
}

function materialDef(id) {
    const key = String(id || '').trim();
    if (typeof items?.getMaterialDef === 'function') {
        const def = items.getMaterialDef(key);
        if (def) return def;
    }
    const cat = materialCatalog();
    return cat[key] || { id: key, name: key, emoji: '📦' };
}

module.exports = {
    name: 'materiais',
    aliases: ['mats', 'materials', 'fragmentos'],
    description: 'Ver materiais de craft',
    data: new SlashCommandBuilder()
        .setName('materiais')
        .setDescription('Lista seus materiais de craft')
        .addUserOption((o) =>
            o.setName('usuario').setDescription('Ver de outro usuário').setRequired(false)
        ),

    async execute(message) {
        const user = message.mentions.users.first() || message.author;
        return message.reply({ embeds: [build(user)] });
    },

    async executeSlash(i) {
        const user = i.options.getUser('usuario') || i.user;
        return i.reply({ embeds: [build(user)] });
    }
};

function build(user) {
    const profile = player.get(user.id);
    const emb = new EmbedBuilder()
        .setColor(0x38bdf8)
        .setAuthor({ name: user.username, iconURL: user.displayAvatarURL({ size: 64 }) })
        .setTitle('🧰 AETERNUS • MATERIAIS DE CRAFT');

    if (!profile?.name) {
        emb.setDescription(`${user} ainda não tem perfil. Use \`O.j criar\`.`);
        return emb;
    }

    const mats = (typeof craft.materialsOf === 'function' ? craft.materialsOf(user.id) : null) || profile.materials || {};
    const catalog = materialCatalog() || {};

    // une catálogo + materiais que o jogador tenha (mesmo se não estiverem no catálogo)
    const ids = new Set([
        ...Object.keys(catalog),
        ...Object.keys(mats || {})
    ]);

    const lines = [...ids].map((id) => {
        const def = materialDef(id);
        const n = Math.max(0, Math.floor(Number(mats[id]) || 0));
        return `${def.emoji || '📦'} **${def.name || id}** — ×${n}`;
    });

    if (!lines.length) {
        lines.push('_Nenhum material registrado ainda._');
    }

    emb.setDescription(
        [
            `👤 **${profile.name}**`,
            '',
            ...lines,
            '',
            '_Ganhe materiais ao subir de nível. Use `O.craft lista` e `O.troca`._'
        ].join('\n')
    );

    emb.setFooter({ text: 'Aeternus • Materiais usados nas receitas de craft' }).setTimestamp();
    return emb;
}
