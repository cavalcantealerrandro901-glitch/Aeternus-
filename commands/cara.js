const { EmbedBuilder, SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const eter = require('../utils/eter');
const { resolveBet } = require('../utils/parseAmount');
const { nextGameNumber } = require('../utils/gameNumbers');

const MIN_BET = 1_000;
const MAX_BET = 35_000_000;

function fmt(n) {
    return Number(n || 0).toLocaleString('pt-BR');
}

async function run(userId, side, amountRaw, reply) {
    const s = String(side || '').toLowerCase();
    if (!['cara', 'coroa'].includes(s)) {
        return reply(
            'Uso: `O.cara cara|coroa <valor>` · aposta **1.000** a **35.000.000** ✨'
        );
    }
    const bal = eter.get(userId);
    const bet = resolveBet(amountRaw, bal, { min: MIN_BET, max: MAX_BET, label: '✨' });
    if (!bet.ok) return reply(`❌ ${bet.error}`);
    eter.remove(userId, bet.amount, { reason: 'cara' });
    const partida = await nextGameNumber('cara');
    const result = Math.random() < 0.5 ? 'cara' : 'coroa';
    const win = result === s;
    if (win) eter.add(userId, bet.amount * 2, { reason: 'cara win' });
    return reply({
        embeds: [
            new EmbedBuilder()
                .setColor(win ? 0x22c55e : 0xef4444)
                .setTitle(win ? '🏆 AETERNUS • VITÓRIA' : '💔 AETERNUS • DERROTA')
                .setDescription(
                    `🪙 Resultado: **${result.toUpperCase()}**\n🎯 Escolha: **${s.toUpperCase()}**\n${
                        win
                            ? '✨ **+' + fmt(bet.amount) + '**'
                            : '✨ **-' + fmt(bet.amount) + '**'
                    }\nSaldo: ✨ **${fmt(eter.get(userId))}**\n\n${win ? '🏆 A sorte sorriu para você nesta rodada!' : '💔 Desta vez não deu certo; fica para a próxima.'}`
                )
                .setFooter({ text: `Aeternus • Cara ou Coroa · Partida #${String(partida).padStart(6, '0')}` })
        ],
        components: [
            new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`cara:girar:${userId}:${s}:${bet.amount}`)
                    .setLabel('Girar moeda')
                    .setEmoji('🪙')
                    .setStyle(ButtonStyle.Primary)
            )
        ]
    });
}

module.exports = {
    name: 'cara e coroa',
    aliases: ['coinflip', 'cf', 'caracoroa'],
    description: 'Cara ou coroa (aposta 1k–35m)',
    data: new SlashCommandBuilder()
        .setName('cara-coroa')
        .setDescription('Cara ou coroa')
        .addStringOption((o) =>
            o
                .setName('lado')
                .setDescription('cara ou coroa')
                .setRequired(true)
                .addChoices({ name: 'Cara', value: 'cara' }, { name: 'Coroa', value: 'coroa' })
        )
        .addStringOption((o) =>
            o.setName('valor').setDescription('Valor (1k a 35m)').setRequired(true)
        ),


    async handleComponent(interaction) {
        const parts = String(interaction.customId || '').split(':');
        if (parts[0] !== 'cara' || parts[1] !== 'girar') return;
        const [, , ownerId, side, amountRaw] = parts;
        if (interaction.user.id !== ownerId) {
            return interaction.reply({
                content: '❌ Esse botão pertence a outra pessoa. Use seu próprio comando!',
                flags: MessageFlags.Ephemeral
            });
        }
        await interaction.deferUpdate();
        await run(ownerId, side, amountRaw, async (payload) => {
            if (typeof payload === 'string') {
                return interaction.followUp({ content: payload, flags: MessageFlags.Ephemeral });
            }
            const sent = await interaction.channel.send({
                ...payload,
                content: '<@' + ownerId + '> 🪙 **Nova rodada de cara ou coroa!**',
                reply: {
                    messageReference: interaction.message.id,
                    failIfNotExists: false
                }
            });
            const disabledRows = interaction.message.components.map((row) =>
                new ActionRowBuilder().addComponents(
                    row.components.map((component) =>
                        ButtonBuilder.from(component).setDisabled(true)
                    )
                )
            );
            await interaction.message.edit({ components: disabledRows });
            return sent;
        });
    },

    async execute(message, args) {
        await run(message.author.id, args[0], args[1], (p) => message.reply(p));
    },
    async executeSlash(i) {
        await run(
            i.user.id,
            i.options.getString('lado', true),
            i.options.getString('valor', true),
            (p) =>
                typeof p === 'string'
                    ? i.reply({ content: p, flags: MessageFlags.Ephemeral })
                    : i.reply(p)
        );
    }
};
