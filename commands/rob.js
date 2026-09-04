const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const eter = require('../utils/eter');
const store = require('../utils/store');

const CD = 15 * 60 * 1000;

function fmt(n) {
    return Number(n || 0).toLocaleString('pt-BR');
}

async function run(thiefId, target, reply) {
    if (!target) return reply('❌ Mencione alguém.');
    if (target.bot) return reply('❌ Não pode roubar bots.');
    if (target.id === thiefId) return reply('❌ Não pode roubar a si mesmo.');

    const cds = store.load('robcd.json', {});
    if (cds[thiefId] && Date.now() - cds[thiefId] < CD) {
        const m = Math.ceil((CD - (Date.now() - cds[thiefId])) / 60000);
        return reply(`⏳ Espere **${m}** min.`);
    }

    const targetBal = eter.get(target.id);
    if (targetBal < 100) return reply('❌ Alvo sem éter suficiente.');

    cds[thiefId] = Date.now();
    store.save('robcd.json', cds);

    if (Math.random() < 0.45) {
        const steal = Math.floor(targetBal * (0.05 + Math.random() * 0.15));
        const amount = Math.max(50, Math.min(steal, targetBal));
        eter.remove(target.id, amount, { reason: 'rob' });
        eter.add(thiefId, amount, { reason: 'rob' });
        return reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(0x22c55e)
                    .setTitle('Roubo')
                    .setDescription(
                        `Você roubou ✨ **${fmt(amount)}** de **${target.username}**\nSeu saldo: ✨ **${fmt(eter.get(thiefId))}**`
                    )
            ]
        });
    }
    const fine = Math.min(eter.get(thiefId), 200 + Math.floor(Math.random() * 800));
    if (fine > 0) eter.remove(thiefId, fine, { reason: 'rob fail' });
    return reply({
        embeds: [
            new EmbedBuilder()
                .setColor(0xef4444)
                .setTitle('Roubo falhou')
                .setDescription(
                    `**${target.username}** te pegou.\n✨ **-${fmt(fine)}**\nSaldo: ✨ **${fmt(eter.get(thiefId))}**`
                )
        ]
    });
}

module.exports = {
    name: 'rob',
    aliases: ['roubar', 'steal'],
    description: 'Roubar éter de alguém',
    data: new SlashCommandBuilder()
        .setName('roubar')
        .setDescription('Roubar éter')
        .addUserOption((o) => o.setName('usuario').setDescription('Alvo').setRequired(true)),
    async execute(message) {
        await run(message.author.id, message.mentions.users.first(), (p) => message.reply(p));
    },
    async executeSlash(i) {
        await run(i.user.id, i.options.getUser('usuario'), (p) =>
            typeof p === 'string' ? i.reply({ content: p, ephemeral: true }) : i.reply(p)
        );
    }
};
