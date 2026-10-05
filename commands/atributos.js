const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const player = require('../utils/player');
const combatStats = require('../utils/combatStats');

function fmt(n) {
    return Number(n || 0).toLocaleString('pt-BR');
}

function buildPanel(userId) {
    const p = player.get(userId);
    if (!p) return { content: 'Crie o perfil com `O.j criar`.' };

    const s = combatStats.getEffectiveAttrs(userId);
    const cls = s.cls;

    const emb = new EmbedBuilder()
        .setColor(cls?.color || 0x7c3aed)
        .setTitle('✦ AETERNUS • ATRIBUTOS')
        .setDescription([
            `${cls?.emoji || '🧭'} **${cls?.name || 'Sem classe'}**`,
            `Nível **${fmt(s.level)}** · Pontos disponíveis **${fmt(s.attrPoints)}**`,
            '',
            '**⚔️ Atributos de combate**',
            `💪 Força: **${fmt(s.attrs.forca)}**`,
            `🛡️ Defesa: **${fmt(s.attrs.defesa)}**`,
            `⚡ Agilidade: **${fmt(s.attrs.agilidade)}**`,
            `❤️ Vida: **${fmt(s.attrs.vida)}**`,
            `🔮 Inteligência: **${fmt(s.attrs.inteligencia)}**`,
            `🍀 Sorte: **${fmt(s.attrs.sorte)}**`,
            `🎯 Precisão: **${fmt(s.attrs.precisao)}**`,
            `🧱 Resistência: **${fmt(s.attrs.resistencia)}**`,
            '',
            '**📐 Origem dos valores**',
            `Base: ${Object.values(s.base).reduce((a, b) => a + Number(b || 0), 0).toLocaleString('pt-BR')} pontos`,
            `Classe: +${Object.values(s.classBonus).reduce((a, b) => a + Number(b || 0), 0).toLocaleString('pt-BR')}`,
            `Equipamento: +${Object.values(s.equipBonus).reduce((a, b) => a + Number(b || 0), 0).toLocaleString('pt-BR')}`
        ].join('\\n'))
        .setFooter({ text: 'Aeternus • Atributos finais de combate' });

    return { embeds: [emb] };
}

module.exports = {
    name: 'atributos',
    aliases: ['atributo', 'stats', 'status'],
    description: 'Mostra os atributos finais do jogador',
    data: new SlashCommandBuilder()
        .setName('atributos')
        .setDescription('Mostra seus atributos finais'),

    async execute(message) {
        return message.reply(buildPanel(message.author.id));
    },

    async executeSlash(interaction) {
        return interaction.reply(buildPanel(interaction.user.id));
    }
};
