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
function controls(userId) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`blackjack:hit:${userId}`)
            .setLabel('Carta')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('🃏'),
        new ButtonBuilder()
            .setCustomId(`blackjack:stand:${userId}`)
            .setLabel('Parar')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('🛑')
    );
}
function againRow(userId, amount) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`blackjack:again:${userId}:${amount}`)
            .setLabel('Tentar novamente')
            .setEmoji('🔁')
            .setStyle(ButtonStyle.Primary)
    );
}

function mood(result) {
    if (result === 'win') return '🎉 **Que vitória!** As cartas sorriram para você!';
    if (result === 'push') return '🤝 **Empate.** A casa devolveu sua aposta.';
    return '😢 **Que tristeza…** O dealer levou esta. Tente de novo!';
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

        if (total(player) === 21) {
            const pay = Math.floor(bet.amount * 2.5);
            cristais.add(message.author.id, pay);
            games.delete(message.author.id);
            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(C.win)
                        .setTitle('🃏  Blackjack natural!')
                        .setDescription(
                            [
                                mood('win'),
                                '',
                                `👤 ${handStr(player)}`,
                                `✨ +💠 **${fmt(pay)}**`,
                                `Saldo: 💠 **${fmt(cristais.get(message.author.id))}**`
                            ].join('\n')
                        )
                        .setFooter({ text: betFooter() })
                ],
                components: [againRow(message.author.id, bet.amount)]
            });
        }

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
            components: [controls(message.author.id)]
        });
    },

    async handleComponent(interaction) {
        const parts = interaction.customId.split(':');
        const action = parts[1];
        const id = parts[2];

        if (interaction.user.id !== id)
            return interaction.reply({ content: 'Não é seu jogo.', ephemeral: true });

        if (action === 'again') {
            const amount = parseInt(parts[3], 10);
            const bet = resolveBet(String(amount), cristais.get(id), { label: '💠' });
            if (!bet.ok) return interaction.reply({ content: `❌ ${bet.error}`, ephemeral: true });
            if (games.has(id)) games.delete(id);

            cristais.remove(id, bet.amount);
            const player = [draw(), draw()];
            const dealer = [draw(), draw()];
            games.set(id, { amount: bet.amount, player, dealer });

            if (total(player) === 21) {
                const pay = Math.floor(bet.amount * 2.5);
                cristais.add(id, pay);
                games.delete(id);
                return interaction.update({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(C.win)
                            .setTitle('🃏  Blackjack natural!')
                            .setDescription(
                                [
                                    mood('win'),
                                    '',
                                    `👤 ${handStr(player)}`,
                                    `✨ +💠 **${fmt(pay)}**`,
                                    `Saldo: 💠 **${fmt(cristais.get(id))}**`
                                ].join('\n')
                            )
                            .setFooter({ text: betFooter() })
                    ],
                    components: [againRow(id, bet.amount)]
                });
            }

            return interaction.update({
                embeds: [
                    new EmbedBuilder()
                        .setColor(C.info)
                        .setTitle('🃏  Blackjack')
                        .setDescription(
                            `Aposta: 💠 **${fmt(bet.amount)}**\n\n👤 Você → ${handStr(player)}\n🏠 Dealer → **${dealer[0]}** · ?`
                        )
                        .setFooter({ text: betFooter() })
                ],
                components: [controls(id)]
            });
        }

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
                                [
                                    mood('lose'),
                                    '',
                                    `Você: ${handStr(g.player)}`,
                                    `−💠 **${fmt(g.amount)}**`,
                                    `Saldo: 💠 **${fmt(cristais.get(id))}**`
                                ].join('\n')
                            )
                            .setFooter({ text: betFooter() })
                    ],
                    components: [againRow(id, g.amount)]
                });
            }
            return interaction.update({
                embeds: [
                    new EmbedBuilder()
                        .setColor(C.info)
                        .setTitle('🃏  Blackjack')
                        .setDescription(
                            `Aposta: 💠 **${fmt(g.amount)}**\n\n👤 Você → ${handStr(g.player)}\n🏠 Dealer → **${g.dealer[0]}** · ?`
                        )
                        .setFooter({ text: betFooter() })
                ],
                components: [controls(id)]
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
            const amount = g.amount;
            games.delete(id);

            return interaction.update({
                embeds: [
                    new EmbedBuilder()
                        .setColor(result === 'win' ? C.win : result === 'push' ? C.draw : C.lose)
                        .setTitle(
                            result === 'win'
                                ? '🃏  Blackjack · Vitória'
                                : result === 'push'
                                  ? '🃏  Empate'
                                  : '🃏  Derrota'
                        )
                        .setDescription(
                            [
                                mood(result),
                                '',
                                `👤 Você → ${handStr(g.player)}`,
                                `🏠 Dealer → ${handStr(g.dealer)}`,
                                '',
                                result === 'win'
                                    ? `✨ +💠 **${fmt(amount * 2)}**`
                                    : result === 'push'
                                      ? 'Aposta devolvida'
                                      : `💫 −💠 **${fmt(amount)}**`,
                                `💼 Saldo: 💠 **${fmt(cristais.get(id))}**`
                            ].join('\n')
                        )
                        .setFooter({ text: betFooter() })
                ],
                components: [againRow(id, amount)]
            });
        }
    }
};
