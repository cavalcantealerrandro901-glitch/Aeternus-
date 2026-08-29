const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const cristais = require('../utils/cristais');
const { parseAmount } = require('../utils/parseAmount');
const games = new Map();
const draw = () => 1 + Math.floor(Math.random() * 11);
const total = (h) => h.reduce((a, b) => a + b, 0);

module.exports = {
    name: 'blackjack',
    aliases: ['bj', '21'],
    async execute(message, args) {
        const amount = parseAmount(args[0]);
        if (!amount) return message.reply('Uso: `O.blackjack <valor>`');
        if (cristais.get(message.author.id) < amount) return message.reply('💠 Insuficiente.');
        if (games.has(message.author.id)) return message.reply('Termine a mão atual.');
        cristais.remove(message.author.id, amount);
        const player = [draw(), draw()];
        const dealer = [draw(), draw()];
        games.set(message.author.id, { amount, player, dealer });
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`bj:hit:${message.author.id}`).setLabel('Carta').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId(`bj:stand:${message.author.id}`).setLabel('Parar').setStyle(ButtonStyle.Secondary)
        );
        await message.reply({
            embeds: [new EmbedBuilder().setColor(0x22c55e).setTitle('🃏 Blackjack').setDescription(`Você: **${player.join(', ')}** (${total(player)})\nDealer: **${dealer[0]}** + ?`)],
            components: [row]
        });
    },
    async handleComponent(interaction) {
        const [, action, id] = interaction.customId.split(':');
        if (interaction.user.id !== id) return interaction.reply({ content: 'Não é seu jogo.', ephemeral: true });
        const g = games.get(id);
        if (!g) return interaction.reply({ content: 'Expirado.', ephemeral: true });
        if (action === 'hit') {
            g.player.push(draw());
            if (total(g.player) > 21) {
                games.delete(id);
                return interaction.update({ embeds: [new EmbedBuilder().setColor(0xef4444).setTitle('💥 Estourou').setDescription(`Você: ${total(g.player)}`)], components: [] });
            }
            return interaction.update({ embeds: [new EmbedBuilder().setColor(0x22c55e).setTitle('🃏 Blackjack').setDescription(`Você: **${g.player.join(', ')}** (${total(g.player)})\nDealer: **${g.dealer[0]}** + ?`)] });
        }
        if (action === 'stand') {
            while (total(g.dealer) < 17) g.dealer.push(draw());
            const pt = total(g.player), dt = total(g.dealer);
            let result = 'lose';
            if (dt > 21 || pt > dt) result = 'win';
            else if (pt === dt) result = 'push';
            if (result === 'win') cristais.add(id, g.amount * 2);
            else if (result === 'push') cristais.add(id, g.amount);
            games.delete(id);
            return interaction.update({
                embeds: [new EmbedBuilder().setColor(result === 'win' ? 0x34d399 : result === 'push' ? 0xfbbf24 : 0xef4444).setTitle('🃏 Resultado').setDescription(`Você **${pt}** · Dealer **${dt}**\n${result === 'win' ? 'Vitória ×2' : result === 'push' ? 'Empate' : 'Derrota'}`)],
                components: []
            });
        }
    }
};
