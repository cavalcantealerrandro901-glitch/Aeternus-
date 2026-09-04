const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const eter = require('../utils/eter');
const store = require('../utils/store');

const CD = 10 * 60 * 1000;

function fmt(n) {
    return Number(n || 0).toLocaleString('pt-BR');
}

async function run(userId, reply) {
    const cds = store.load('crimecd.json', {});
    if (cds[userId] && Date.now() - cds[userId] < CD) {
        const m = Math.ceil((CD - (Date.now() - cds[userId])) / 60000);
        return reply(`⏳ Espere **${m}** min.`);
    }
    cds[userId] = Date.now();
    store.save('crimecd.json', cds);
    const win = Math.random() < 0.55;
    if (win) {
        const amount = 100 + Math.floor(Math.random() * 900);
        eter.add(userId, amount, { reason: 'crime' });
        return reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(0x22c55e)
                    .setTitle('Crime')
                    .setDescription(`Sucesso! ✨ **+${fmt(amount)}**\nSaldo: ✨ **${fmt(eter.get(userId))}**`)
            ]
        });
    }
    const fine = Math.min(eter.get(userId), 50 + Math.floor(Math.random() * 450));
    if (fine > 0) eter.remove(userId, fine, { reason: 'crime fail' });
    return reply({
        embeds: [
            new EmbedBuilder()
                .setColor(0xef4444)
                .setTitle('Crime falhou')
                .setDescription(`Você foi pego. ✨ **-${fmt(fine)}**\nSaldo: ✨ **${fmt(eter.get(userId))}**`)
        ]
    });
}

module.exports = {
    name: 'crime',
    aliases: ['cometer-crime'],
    description: 'Cometer crime',
    data: new SlashCommandBuilder().setName('cometer-crime').setDescription('Cometer crime'),
    async execute(message) {
        await run(message.author.id, (p) => message.reply(p));
    },
    async executeSlash(i) {
        await run(i.user.id, (p) =>
            typeof p === 'string' ? i.reply({ content: p, ephemeral: true }) : i.reply(p)
        );
    }
};
