const { EmbedBuilder } = require('discord.js');
const flocos = require('../utils/flocos');
const store = require('../utils/store');
const { fmt, C } = require('../utils/gameStyle');

const ACTS = [
    { do: 'invadiu um cofre digital', ok: 'O alarme falhou. Você saiu rico.', fail: 'Câmeras te pegaram em 4K.' },
    { do: 'hackeou uma conta VIP', ok: 'A senha era 123456. Fácil demais.', fail: 'O firewall te spitou de volta.' },
    { do: 'aplicou um golpe online', ok: 'A vítima caiu. Flocos na conta.', fail: 'Era isca da polícia.' },
    { do: 'fugiu da blitz', ok: 'Você sumiu no beco. Missão cumprida.', fail: 'A viatura te cercou.' },
    { do: 'assaltou um NPC do cassino', ok: 'O caixa nem reagiou a tempo.', fail: 'Segurança te imobilizou.' }
];

const CD = 20 * 60 * 1000;

module.exports = {
    name: 'crime',
    description: 'Crime arriscado por flocos',
    async execute(message) {
        const cds = store.load('crimecd.json', {});
        if (cds[message.author.id] && Date.now() - cds[message.author.id] < CD) {
            const m = Math.ceil((CD - (Date.now() - cds[message.author.id])) / 60000);
            return message.reply(`⏳ Espere **${m}** min para o próximo crime.`);
        }
        cds[message.author.id] = Date.now();
        store.save('crimecd.json', cds);

        const act = ACTS[Math.floor(Math.random() * ACTS.length)];

        if (Math.random() < 0.55) {
            const gain = 1000 + Math.floor(Math.random() * 4500);
            flocos.add(message.author.id, gain, { reason: 'crime' });
            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(C.win)
                        .setAuthor({
                            name: `${message.author.username} · Crime`,
                            iconURL: message.author.displayAvatarURL({ size: 64 })
                        })
                        .setTitle('🕶️  Crime bem-sucedido')
                        .setDescription(
                            [
                                `Você **${act.do}**.`,
                                act.ok,
                                '',
                                `✨ **+❄️ ${fmt(gain)}**`,
                                `💼 Saldo: ❄️ **${fmt(flocos.get(message.author.id))}**`
                            ].join('\n')
                        )
                        .setFooter({ text: 'Cooldown 20 min · O.crime' })
                        .setTimestamp()
                ]
            });
        }

        const loss = Math.min(
            flocos.get(message.author.id),
            500 + Math.floor(Math.random() * 2200)
        );
        flocos.remove(message.author.id, loss, { reason: 'crime fail' });
        await message.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(C.lose)
                    .setAuthor({
                        name: `${message.author.username} · Crime`,
                        iconURL: message.author.displayAvatarURL({ size: 64 })
                    })
                    .setTitle('🚔  Você foi pego')
                    .setDescription(
                        [
                            `Você tentou **${act.do}**.`,
                            act.fail,
                            '',
                            `💫 Multa −❄️ **${fmt(loss)}**`,
                            `💼 Saldo: ❄️ **${fmt(flocos.get(message.author.id))}**`
                        ].join('\n')
                    )
                    .setFooter({ text: 'Cooldown 20 min · O.crime' })
                    .setTimestamp()
            ]
        });
    }
};
