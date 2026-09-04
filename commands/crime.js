const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const eter = require('../utils/eter');
const store = require('../utils/store');

const ACTS = [
    { do: 'invadiu um cofre digital', ok: 'O alarme falhou.', fail: 'Câmeras te pegaram.' },
    { do: 'hackeou uma conta VIP', ok: 'Senha fraca. Fácil.', fail: 'Firewall te bloqueou.' },
    { do: 'aplicou um golpe online', ok: 'A vítima caiu.', fail: 'Era isca da polícia.' },
    { do: 'fugiu da blitz', ok: 'Você sumiu no beco.', fail: 'A viatura te cercou.' },
    { do: 'assaltou o cassino', ok: 'O caixa não reagiu.', fail: 'Segurança te pegou.' }
];
const CD = 20 * 60 * 1000;

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

    const act = ACTS[Math.floor(Math.random() * ACTS.length)];
    if (Math.random() < 0.55) {
        const gain = 1000 + Math.floor(Math.random() * 4500);
        eter.add(userId, gain, { reason: 'crime' });
        return reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(0x22c55e)
                    .setTitle('Crime')
                    .setDescription(
                        `Você **${act.do}**.\n${act.ok}\n\n✨ **+${fmt(gain)}**\nSaldo: ✨ **${fmt(eter.get(userId))}**`
                    )
            ]
        });
    }
    const loss = Math.min(eter.get(userId), 500 + Math.floor(Math.random() * 2000));
    if (loss > 0) eter.remove(userId, loss, { reason: 'crime fail' });
    return reply({
        embeds: [
            new EmbedBuilder()
                .setColor(0xef4444)
                .setTitle('Crime falhou')
                .setDescription(
                    `Você **${act.do}**.\n${act.fail}\n\n✨ **-${fmt(loss)}**\nSaldo: ✨ **${fmt(eter.get(userId))}**`
                )
        ]
    });
}

module.exports = {
    name: 'crime',
    description: 'Crime por éter',
    data: new SlashCommandBuilder().setName('crime').setDescription('Crime por éter'),
    async execute(message) {
        await run(message.author.id, (p) => message.reply(p));
    },
    async executeSlash(i) {
        await run(i.user.id, (p) =>
            typeof p === 'string' ? i.reply({ content: p, ephemeral: true }) : i.reply(p)
        );
    }
};
