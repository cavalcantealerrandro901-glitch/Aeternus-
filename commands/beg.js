const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const eter = require('../utils/eter');

const CD = 3 * 60 * 1000;
const last = new Map();

function fmt(n) {
    return Number(n || 0).toLocaleString('pt-BR');
}

async function run(userId, reply) {
    const now = Date.now();
    const prev = last.get(userId) || 0;
    if (now - prev < CD) {
        const left = Math.ceil((CD - (now - prev)) / 1000);
        return reply(`⏳ Espere **${left}s**.`);
    }
    last.set(userId, now);
    const amount = Math.floor(Math.random() * 80) + 20;
    eter.add(userId, amount);
    return reply({
        embeds: [
            new EmbedBuilder()
                .setColor(0x34d399)
                .setTitle('Beg')
                .setDescription(
                    `Você ganhou ✨ **${fmt(amount)}**\nSaldo: ✨ **${fmt(eter.get(userId))}**`
                )
        ]
    });
}

module.exports = {
    name: 'beg',
    aliases: ['mendigar'],
    description: 'Pedir éter',
    data: new SlashCommandBuilder().setName('beg').setDescription('Pedir éter'),
    async execute(message) {
        await run(message.author.id, (p) => message.reply(p));
    },
    async executeSlash(i) {
        await run(i.user.id, (p) =>
            typeof p === 'string' ? i.reply({ content: p, ephemeral: true }) : i.reply(p)
        );
    }
};
