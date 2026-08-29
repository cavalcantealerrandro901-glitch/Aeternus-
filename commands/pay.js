const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const flocos = require('../utils/flocos');
const { resolveBet } = require('../utils/parseAmount');
const tx = require('../utils/transactions');

function fmt(n) {
    return Number(n || 0).toLocaleString('pt-BR');
}

module.exports = {
    name: 'pay',
    aliases: ['pagar', 'transferir', 'pix'],
    description: 'Transfere flocos para um ou mais usuários',
    async execute(message, args) {
        const targets = [...message.mentions.users.values()].filter(
            (u) => !u.bot && u.id !== message.author.id
        );

        // valor = último arg que não é menção
        const amountArg = args.filter((a) => !a.startsWith('<@')).pop();

        if (!targets.length || !amountArg) {
            return message.reply(
                '💸 Uso: `O.pay @user1 @user2 … <valor|all|half|k|m>`\nEx.: `O.pay @a @b 5k` · `O.pay @a half`'
            );
        }

        const totalNeededGuess = resolveBet(amountArg, flocos.get(message.author.id), {
            label: '❄️'
        });
        if (!totalNeededGuess.ok) return message.reply(`❌ ${totalNeededGuess.error}`);

        // se all/half com vários: divide o valor resolvido por pessoa? 
        // regra: o valor é POR pessoa
        const perPerson = totalNeededGuess.amount;
        const total = perPerson * targets.length;

        if (flocos.get(message.author.id) < total) {
            return message.reply(
                `❌ ❄️ Insuficiente. Precisa de **${fmt(total)}** (${fmt(perPerson)} × ${targets.length}). Você tem **${fmt(flocos.get(message.author.id))}**.`
            );
        }

        for (const user of targets) {
            // meta false no remove/add para logar transfer de forma limpa
            flocos.remove(message.author.id, perPerson, false);
            flocos.add(user.id, perPerson, false);
            tx.logTransfer(message.author.id, user.id, perPerson);

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`pay:info:${message.author.id}:${user.id}:${perPerson}`)
                    .setLabel(`Transferiu ${fmt(perPerson)} flocos`)
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('💸')
                    .setDisabled(true)
            );

            await message.channel.send({
                content: `💸 ${message.author} acabou de transferir **${fmt(perPerson)}** ❄️ flocos para ${user}.`,
                components: [row]
            });
        }
    },

    async handleComponent(interaction) {
        // botão só informativo (desabilitado)
        if (!interaction.deferred && !interaction.replied) {
            await interaction.deferUpdate().catch(() => {});
        }
    }
};
