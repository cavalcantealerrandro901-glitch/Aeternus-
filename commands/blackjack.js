const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const cristais = require('../utils/cristais');
const { resolveBet } = require('../utils/parseAmount');
const { fmt, betFooter, C } = require('../utils/gameStyle');

const games = new Map();

function draw() {
    return 1 + Math.floor(Math.random() * 11);
}
function total(hand) {
    return hand.reduce((a, b) => a + b, 0);
}
function handStr(hand) {
    return hand.join(' · ') + `  (**${total(hand)}**)`;
}

module.exports = {
    name: 'blackjack',
    aliases: ['bj', '21'],
    description: 'Blackjack',
    async execute(message, args) {
        const bet = resolveBet(args[0], cristais.get(message.author.id), { label: '💠' });
        if (!bet.ok) return message.reply(`❌ ${bet.error}\nUso: \`O.blackjack <valor|all|half>\``);
        if (games.has(message.author.id)) return message.reply('Termine a mão atual primeiro.');

        cristais.remove(message.author.id, bet.amount);
        const player = [draw(), draw()];
        const dealer = [draw(), draw()];
        games.set(message.author.id, { amount: bet.amount, player, dealer });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`bj:hit:${message.author.id}`).setLabel('Carta').setStyle(ButtonStyle.Primary).setEmoji('🃏'),
            new ButtonBuilder().setCustomId(`bj:stand:${message.author.id}`).setLabel('Parar').setStyle(ButtonStyle.Secondary).setEmoji('🛑')
        );

        await message.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(C.info)
                    .setAuthor({ name: message.author.username, iconURL: message.author.displayAvatarURL() })
                    .setTitle('🃏  Blackjack')
                    .setDescription(
                        [
                            `Aposta: 💠 **${fmt(bet.amount)}**`,
                            '',
                            `👤 Você → ${handStr(player)}`,
                            `🏠 Dealer → **${dealer[0]}** · ?`
                        ].join('\n')
                    )
                    .setFooter({ text: betFooter() })
            ],
            components: [row]
        });
    },

    async handleComponent(interaction) {
        const [, action, id] = interaction.customId.split(':');
        if (interaction.user.id !== id)
            return interaction.reply({ content: 'Não é seu jogo.', ephemeral: true });
        const g = games.get(id);
        if (!g) return interaction.reply({ content: 'Jogo expirado.', ephemeral: true });

        if (action === 'hit') {
            g.player.push(draw());
            if (total(g.player) > 21) {
                games.delete(id);
                return interaction.update({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(C.lose)
                            .setTitle('💥  Estourou')
                            .setDescription(
                                `Você: ${handStr(g.player)}\n−💠 **${fmt(g.amount)}**\nSaldo: 💠 **${fmt(cristais.get(id))}**`
                            )
                            .setFooter({ text: betFooter() })
                    ],
                    components: []
                });
            }
            return interaction.update({
                embeds: [
                    new EmbedBuilder()
                        .setColor(C.info)
                        .setTitle('🃏  Blackjack')
                        .setDescription(`👤 Você → ${handStr(g.player)}\n🏠 Dealer → **${g.dealer[0]}** · ?`)
                        .setFooter({ text: betFooter() })
                ]
            });
        }

        if (action === 'stand') {
            while (total(g.dealer) < 17) g.dealer.push(draw());
            const pt = total(g.player);
            const dt = total(g.dealer);
            let result = 'lose';
            if (dt > 21 || pt > dt) result = 'win';
            else if (pt === dt) result = 'push';

            if (result === 'win') cristais.add(id, g.amount * 2);
            else if (result === 'push') cristais.add(id, g.amount);
            games.delete(id);

            return interaction.update({
                embeds: [
                    new EmbedBuilder()
                        .setColor(result === 'win' ? C.win : result === 'push' ? C.draw : C.lose)
                        .setTitle(
                            result === 'win' ? '🃏  Blackjack · Vitória' : result === 'push' ? '🃏  Empate' : '🃏  Derrota'
                        )
                        .setDescription(
                            [
                                `👤 Você → ${handStr(g.player)}`,
                                `🏠 Dealer → ${handStr(g.dealer)}`,
                                '',
                                result === 'win'
                                    ? `✨ +💠 **${fmt(g.amount * 2)}**`
                                    : result === 'push'
                                      ? 'Aposta devolvida'
                                      : `💫 −💠 **${fmt(g.amount)}**`,
                                `💼 Saldo: 💠 **${fmt(cristais.get(id))}**`
                            ].join('\n')
                        )
                        .setFooter({ text: betFooter() })
                ],
                components: []
            });
        }
    }
};
