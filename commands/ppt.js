const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');
const flocos = require('../utils/flocos');
const { resolveBet } = require('../utils/parseAmount');
const { fmt, C, againRow } = require('../utils/gameStyle');

const OPTS = ['pedra', 'papel', 'tesoura'];
const EMOJI = { pedra: '✊', papel: '🖐️', tesoura: '✌️' };
const BEATS = { pedra: 'tesoura', papel: 'pedra', tesoura: 'papel' };

function play(choice, amount, userId) {
    flocos.remove(userId, amount, { reason: 'ppt' });
    const bot = OPTS[Math.floor(Math.random() * 3)];
    let state = 'lose';
    let payout = 0;
    if (choice === bot) {
        state = 'draw';
        payout = amount;
        flocos.add(userId, amount, { reason: 'ppt draw' });
    } else if (BEATS[choice] === bot) {
        state = 'win';
        payout = amount * 2;
        flocos.add(userId, payout, { reason: 'ppt win' });
    }
    return { bot, state, payout };
}

function vibe(state) {
    if (state === 'win') return '🎉 **Você leu a jogada!** Vitória limpa.';
    if (state === 'draw') return '🤝 **Empate.** As mentes se encontraram.';
    return '😏 **O bot leu você.** Tente outra vez.';
}

function payload(r, choice, amount, user, userId) {
    const win = r.state === 'win' ? true : r.state === 'draw' ? 'draw' : false;
    const color = win === true ? C.win : win === 'draw' ? C.draw : C.lose;
    const title =
        r.state === 'win'
            ? '✊  PPT · Vitória'
            : r.state === 'draw'
              ? '✊  PPT · Empate'
              : '✊  PPT · Derrota';

    let money;
    if (r.state === 'win') money = `✨ **Ganhou** +❄️ **${fmt(r.payout)}** (×2)`;
    else if (r.state === 'draw') money = `🤝 Aposta devolvida ❄️ **${fmt(amount)}**`;
    else money = `💫 **Perdeu** −❄️ **${fmt(amount)}**`;

    return {
        embeds: [
            new EmbedBuilder()
                .setColor(color)
                .setAuthor({
                    name: `${user.username} · Jokenpô`,
                    iconURL: user.displayAvatarURL({ size: 64 })
                })
                .setTitle(title)
                .setDescription(
                    [
                        '```',
                        '  ╔════════════════════════╗',
                        '  ║   PEDRA · PAPEL · TESOURA ║',
                        '  ╚════════════════════════╝',
                        '```',
                        `Você ${EMOJI[choice]} **${choice}**  vs  Bot ${EMOJI[r.bot]} **${r.bot}**`,
                        '',
                        vibe(r.state),
                        '',
                        money,
                        `💼 Saldo: ❄️ **${fmt(flocos.get(userId))}**`
                    ].join('\n')
                )
                .setFooter({ text: 'O.ppt pedra|papel|tesoura <valor> · Aeternus' })
                .setTimestamp()
        ],
        components: [
            againRow(`ppt:again:${choice}:${amount}:${userId}`, 'Mesma jogada'),
            new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`ppt:pick:pedra:${amount}:${userId}`)
                    .setLabel('Pedra')
                    .setEmoji('✊')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId(`ppt:pick:papel:${amount}:${userId}`)
                    .setLabel('Papel')
                    .setEmoji('🖐️')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId(`ppt:pick:tesoura:${amount}:${userId}`)
                    .setLabel('Tesoura')
                    .setEmoji('✌️')
                    .setStyle(ButtonStyle.Danger)
            )
        ]
    };
}

module.exports = {
    name: 'ppt',
    aliases: ['jokenpo', 'rps'],
    description: 'Pedra papel tesoura (flocos)',
    async execute(message, args) {
        const choice = (args[0] || '').toLowerCase();
        if (!OPTS.includes(choice))
            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0xa78bfa)
                        .setTitle('✊  Pedra, Papel ou Tesoura')
                        .setDescription(
                            [
                                'Uso: `O.ppt <pedra|papel|tesoura> <valor|all|half>`',
                                '',
                                '`O.ppt pedra 1k`',
                                '`O.ppt papel half`',
                                '`O.ppt tesoura all`',
                                '',
                                'Vitória paga **×2** · Empate devolve a aposta.'
                            ].join('\n')
                        )
                ]
            });
        const bet = resolveBet(args[1], flocos.get(message.author.id), { label: '❄️' });
        if (!bet.ok) return message.reply(`❌ ${bet.error}`);
        const r = play(choice, bet.amount, message.author.id);
        await message.reply(payload(r, choice, bet.amount, message.author, message.author.id));
    },
    async handleComponent(interaction) {
        const parts = interaction.customId.split(':');
        if (parts[0] !== 'ppt') return;
        const mode = parts[1]; // again | pick
        const choice = parts[2];
        const amountStr = parts[3];
        const owner = parts[4];
        if (interaction.user.id !== owner)
            return interaction.reply({ content: 'Não é sua partida.', ephemeral: true });
        if (!OPTS.includes(choice))
            return interaction.reply({ content: 'Jogada inválida.', ephemeral: true });
        const bet = resolveBet(amountStr, flocos.get(owner), { label: '❄️' });
        if (!bet.ok) return interaction.reply({ content: `❌ ${bet.error}`, ephemeral: true });
        const r = play(choice, bet.amount, owner);
        await interaction.update(payload(r, choice, bet.amount, interaction.user, owner));
    }
};
