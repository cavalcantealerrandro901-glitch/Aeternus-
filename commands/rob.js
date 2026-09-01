const { EmbedBuilder } = require('discord.js');
const flocos = require('../utils/flocos');
const store = require('../utils/store');
const { fmt, C } = require('../utils/gameStyle');

const CD = 30 * 60 * 1000;

module.exports = {
    name: 'rob',
    aliases: ['roubar', 'steal'],
    description: 'Tenta roubar flocos de outro membro',
    async execute(message) {
        const target = message.mentions.users.first();
        if (!target || target.bot || target.id === message.author.id)
            return message.reply('Mencione um usuário válido para roubar.');

        const cds = store.load('robcd.json', {});
        if (cds[message.author.id] && Date.now() - cds[message.author.id] < CD) {
            const m = Math.ceil((CD - (Date.now() - cds[message.author.id])) / 60000);
            return message.reply(`⏳ Aguarde **${m}** min para tentar de novo.`);
        }

        const bal = flocos.get(target.id);
        if (bal < 500) return message.reply('Esse alvo tem poucos flocos (mín. 500).');

        cds[message.author.id] = Date.now();
        store.save('robcd.json', cds);

        if (Math.random() < 0.4) {
            const stolen = Math.floor(bal * (0.05 + Math.random() * 0.12));
            flocos.remove(target.id, stolen, { reason: 'robbed' });
            flocos.add(message.author.id, stolen, { reason: 'rob' });
            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(C.win)
                        .setAuthor({
                            name: `${message.author.username} · Roubo`,
                            iconURL: message.author.displayAvatarURL({ size: 64 })
                        })
                        .setTitle('🦹  Roubo bem-sucedido')
                        .setDescription(
                            [
                                `Você esvaziou parte da carteira de **${target.username}**.`,
                                '',
                                `✨ Roubou ❄️ **${fmt(stolen)}**`,
                                `💼 Seu saldo: ❄️ **${fmt(flocos.get(message.author.id))}**`
                            ].join('\n')
                        )
                        .setThumbnail(target.displayAvatarURL({ size: 64 }))
                        .setFooter({ text: 'Cooldown 30 min · O.rob @user' })
                        .setTimestamp()
                ]
            });
        }

        const fine = Math.min(
            flocos.get(message.author.id),
            300 + Math.floor(Math.random() * 900)
        );
        flocos.remove(message.author.id, fine, { reason: 'rob fail' });
        await message.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(C.lose)
                    .setAuthor({
                        name: `${message.author.username} · Roubo`,
                        iconURL: message.author.displayAvatarURL({ size: 64 })
                    })
                    .setTitle('🚨  Pegaram você')
                    .setDescription(
                        [
                            `**${target.username}** te viu no ato.`,
                            '',
                            `💫 Multa −❄️ **${fmt(fine)}**`,
                            `💼 Seu saldo: ❄️ **${fmt(flocos.get(message.author.id))}**`
                        ].join('\n')
                    )
                    .setThumbnail(target.displayAvatarURL({ size: 64 }))
                    .setFooter({ text: 'Cooldown 30 min · O.rob @user' })
                    .setTimestamp()
            ]
        });
    }
};
