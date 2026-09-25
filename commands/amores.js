const {
    EmbedBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');

const GROUPS = {
    carinho: ['🤗', '🥰', '😘', '💋', '💞', '💕', '💗', '💓', '💝', '💘', '💖', '😍'],
    diversao: ['😂', '🤣', '😆', '😹', '🥳', '🎉', '✨', '🔥', '😎', '🤩', '😜', '🤪'],
    reacoes: ['👍', '👎', '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '💯', '👏'],
    aeternus: ['⚔️', '🏰', '💎', '💀', '🕵️', '🎲', '🐉', '🔮', '🛡️', '🏹', '✨', '🌙']
};

module.exports = {
    name: 'amores',
    aliases: ['emojis', 'reacoes', 'reacts'],
    description: 'Abre um painel de emojis para copiar/usar',
    async execute(message) {
        const emb = new EmbedBuilder()
            .setColor(0xec4899)
            .setTitle('💕 Painel de emojis')
            .setDescription(
                'Escolha uma categoria no menu. Os emojis aparecem aqui para você copiar e usar nas mensagens.'
            )
            .setFooter({ text: 'Só você vê as atualizações se usar a interação' });

        const menu = new StringSelectMenuBuilder()
            .setCustomId('amores:cat')
            .setPlaceholder('Escolha uma categoria')
            .addOptions([
                { label: 'Carinho', value: 'carinho', emoji: '🥰' },
                { label: 'Diversão', value: 'diversao', emoji: '😂' },
                { label: 'Reações', value: 'reacoes', emoji: '❤️' },
                { label: 'Aeternus', value: 'aeternus', emoji: '⚔️' }
            ]);

        return message.reply({
            embeds: [emb],
            components: [new ActionRowBuilder().addComponents(menu)]
        });
    },

    async handleComponent(interaction) {
        if (interaction.customId === 'amores:cat' && interaction.isStringSelectMenu()) {
            const cat = interaction.values[0];
            const list = GROUPS[cat] || [];
            const emb = new EmbedBuilder()
                .setColor(0xec4899)
                .setTitle('💕 ' + cat)
                .setDescription(list.join('  ') + '\n\n_Clique e segure / copie o que quiser._');
            return interaction.update({ embeds: [emb] });
        }
    }
};
