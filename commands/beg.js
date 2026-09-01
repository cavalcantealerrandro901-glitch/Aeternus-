const { EmbedBuilder } = require('discord.js');
const eter = require('../utils/eter');
const store = require('../utils/store');
const { fmt, C } = require('../utils/gameStyle');

const CD = 3 * 60 * 1000;

const SUCCESS = [
    'Um desconhecido te deu algumas moedas e seguiu em frente.',
    'Alguém da rua te estendeu a mão com um sorriso.',
    'Um jogador generoso te jogou éter de longe.',
    'Você encontrou uma carteira… e devolveu. O dono te recompensou.',
    'Um NPC do cassino te pagou um café em eter.'
];

const FAIL = [
    'Ningém parou. O vento levou sua sorte.',
    'As pessoas passaram sem olhar.',
    'Você pediu… e ouviu só silêncio.',
    'Um guarda te mandou circular. Sem sorte desta vez.'
];

module.exports = {
    name: 'beg',
    aliases: ['pedir', 'esmolar'],
    description: 'Pede éter na rua',
    async execute(message) {
        const cd = store.load('begcd.json', {});
        if (cd[message.author.id] && Date.now() - cd[message.author.id] < CD) {
            const s = Math.ceil((CD - (Date.now() - cd[message.author.id])) / 1000);
            return message.reply(`⏳ Aguarde **${s}s** para pedir de novo.`);
        }
        cd[message.author.id] = Date.now();
        store.save('begcd.json', cd);

        if (Math.random() < 0.28) {
            const phrase = FAIL[Math.floor(Math.random() * FAIL.length)];
            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0x64748b)
                        .setAuthor({
                            name: `${message.author.username} · Pedindo`,
                            iconURL: message.author.displayAvatarURL({ size: 64 })
                        })
                        .setTitle('🥺  Ningém ajudou')
                        .setDescription(`${phrase}\n\n💼 Saldo: ✨ **${fmt(eter.get(message.author.id))}**`)
                        .setFooter({ text: 'Cooldown 3 min · O.beg' })
                ]
            });
        }

        const pay = 80 + Math.floor(Math.random() * 420);
        eter.add(message.author.id, pay, { reason: 'beg' });
        const phrase = SUCCESS[Math.floor(Math.random() * SUCCESS.length)];

        await message.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(C.win)
                    .setAuthor({
                        name: `${message.author.username} · Pedindo`,
                        iconURL: message.author.displayAvatarURL({ size: 64 })
                    })
                    .setTitle('🙏  Alguém te ajudou!')
                    .setDescription(
                        [
                            phrase,
                            '',
                            `✨ **+${fmt(pay)}**`,
                            `💼 Saldo: ✨ **${fmt(eter.get(message.author.id))}**`
                        ].join('\n')
                    )
                    .setFooter({ text: 'Cooldown 3 min · O.beg' })
                    .setTimestamp()
            ]
        });
    }
};
