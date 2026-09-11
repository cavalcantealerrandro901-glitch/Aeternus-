const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const player = require('../utils/player');
const craft = require('../utils/craft');
const items = require('../utils/items');

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
        .setTitle('🧰 Materiais de Craft');

    if (!profile?.name) {
        emb.setDescription(`${user} ainda não tem perfil. Use \`O.j criar\`.`);
        return emb;
    }

    const mats = craft.materialsOf(user.id);
    const lines = Object.values(items.MATERIALS).map((def) => {
        const n = mats[def.id] || 0;
        return `${def.emoji} **${def.name}** — ×${n}`;
    });

    emb.setDescription(
        [
            `👤 **${profile.name}**`,
            '',
            ...lines,
            '',
            '_Ganhe materiais ao subir de nível. Use `O.craft lista` e `O.troca`._'
        ].join('\n')
    );

    return emb;
}
