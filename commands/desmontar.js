const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const craft = require('../utils/craft');
const items = require('../utils/items');

module.exports = {
    name: 'desmontar',
    aliases: ['salvage', 'quebrar', 'desmanchar'],
    description: 'Desmonta item do inventário em materiais',
    data: new SlashCommandBuilder()
        .setName('desmontar')
        .setDescription('Desmonta um item do inventário')
        .addIntegerOption((o) =>
            o
                .setName('numero')
                .setDescription('Número do item no inventário (O.inventario)')
                .setRequired(true)
                .setMinValue(1)
        ),

    async execute(message, args) {
        const n = parseInt(args[0], 10);
        if (!n) {
            return message.reply('Uso: `O.desmontar <número>` — veja os números em `O.inventario`.');
        }
        return message.reply({ embeds: [run(message.author.id, n)] });
    },

    async executeSlash(i) {
        const n = i.options.getInteger('numero');
        return i.reply({ embeds: [run(i.user.id, n)] });
    }
};

function run(userId, n) {
    const res = craft.doSalvage(userId, n);
    const emb = new EmbedBuilder().setColor(res.ok ? 0x34d399 : 0xf87171);

    if (!res.ok) {
        emb.setTitle('Desmonte falhou').setDescription(res.error);
        return emb;
    }

    const lines = Object.entries(res.materials).map(([k, v]) => {
        const d = items.getMaterialDef(k);
        return `${d?.emoji || '📦'} **${d?.name || k}** ×${v}`;
    });

    emb
        .setTitle('🔨 Item desmontado')
        .setDescription(
            [
                `${res.item.emoji || '🎁'} **${res.item.name}** foi desmontado.`,
                '',
                '**Materiais obtidos:**',
                ...lines
            ].join('\n')
        )
        .setFooter({ text: 'O.materiais · O.craft' });

    return emb;
}
