const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const eter = require('../utils/eter');
const { resolveBet } = require('../utils/parseAmount');
const tx = require('../utils/transactions');

function fmt(n) {
    return Number(n || 0).toLocaleString('pt-BR');
}

module.exports = {
    name: 'pay',
    aliases: ['pagar', 'transferir', 'pix'],
    description: 'Transfere éter para um ou mais usuários',
    async execute(message, args) {
        const targets = [...message.mentions.users.values()].filter(
            (u) => !u.bot && u.id !== message.author.id
        );

        const amountArg = args.filter((a) => !a.startsWith('<@')).pop();

        if (!targets.length || !amountArg) {
            return message.reply(
                '💸 Uso: `O.pay @user1 @user2 … <valor|all|half|k|m>`\nEx.: `O.pay @a @b 5k` · `O.pay @a half`'
            );
        }

        const totalNeededGuess = resolveBet(amountArg, eter.get(message.author.id), {
            label: '✨'
        });
        if (!totalNeededGuess.ok) return message.reply(`❌ ${totalNeededGuess.error}`);

        const perPerson = totalNeededGuess.amount;
        const total = perPerson * targets.length;

        if (eter.get(message.author.id) < total) {
            return message.reply(
                `❌ ✨ Insuficiente. Precisa de **${fmt(total)}** (${fmt(perPerson)} × ${targets.length}). Você tem **${fmt(eter.get(message.author.id))}**.`
            );
        }

        for (const user of targets) {
            eter.remove(message.author.id, perPerson, false);
            eter.add(user.id, perPerson, false);
            tx.logTransfer(message.author.id, user.id, perPerson);

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`pay:info:${message.author.id}:${user.id}:${perPerson}`)
                    .setLabel(`Transferiu ${fmt(perPerson)} éter`)
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('💸')
                    .setDisabled(true)
            );

            await message.channel.send({
                content: `💸 ${message.author} acabou de transferir **${fmt(perPerson)}** ✨ éter para ${user}.`,
                components: [row]
            });
        }
    },

    async handleComponent(interaction) {
        if (!interaction.deferred && !interaction.replied) {
            await interaction.deferUpdate().catch(() => {});
        }
    }
};
