const { EmbedBuilder, SlashCommandBuilder, MessageFlags } = require('discord.js');
const eter = require('../utils/eter');
const bank = require('../utils/bank');
const { resolveBet } = require('../utils/parseAmount');
const { getPrefix } = require('../utils/settings');

function fmt(n) {
    return Number(n || 0).toLocaleString('pt-BR');
}

function deniedMsg(user, bankBal, guild) {
    const prefix = guild?.id ? getPrefix(guild.id) : 'O.';
    return (
        `Infelizmente seu saque foi negado. Atualmente você tem ✨ **${fmt(bankBal)}** éter no seu banco. Use \`/ver-banco\` ou \`${prefix}banco\`.`
    );
}

async function run(user, amountRaw, guild, reply) {
    const userId = user.id;
    const bankBal = bank.get(userId);
    const prefix = guild?.id ? getPrefix(guild.id) : 'O.';

    if (bankBal <= 0) {
        return reply({
            content: deniedMsg(user, bankBal, guild),
            allowedMentions: { users: [userId] }
        });
    }

    const bet = resolveBet(amountRaw, bankBal, { label: '✨' });
    if (!bet.ok) {
        // valor inválido / maior que o banco
        if (/insuficiente|maior|saldo|all|half|valor/i.test(String(bet.error || ''))) {
            return reply({
                content: deniedMsg(user, bankBal, guild),
                allowedMentions: { users: [userId] }
            });
        }
        return reply({ content: `❌ ${bet.error}`, flags: MessageFlags.Ephemeral });
    }

    if (bet.amount > bankBal) {
        return reply({
            content: deniedMsg(user, bankBal, guild),
            allowedMentions: { users: [userId] }
        });
    }

    const result = bank.withdraw(userId, bet.amount, eter);
    if (!result.ok) {
        return reply({
            content: deniedMsg(user, bank.get(userId), guild),
            allowedMentions: { users: [userId] }
        });
    }

    const emb = new EmbedBuilder()
        .setColor(0x86efac)
        .setTitle('💸 SAQUE REALIZADO!!')
        .setDescription(
            [
                '----------------------------------------',
                '',
                `Você sacou ✨ **${fmt(result.amount)}** éter`,
                '',
                `🏦 E agora você possui no banco ✨ **${fmt(result.bank)}** éter`,
                '',
                '---------------------------------------',
                '',
                `💡 Dica: use \`/depositar-eter\` ou \`${prefix}depositar <valor>\`.`
            ].join('\n')
        );

    return reply({
        content: `${user}`,
        embeds: [emb],
        allowedMentions: { users: [userId] }
    });
}

module.exports = {
    name: 'sacar',
    aliases: ['with', 'withdraw'],
    description: 'Sacar éter do cofre',
    data: new SlashCommandBuilder()
        .setName('sacar-eter')
        .setDescription('Sacar éter do banco')
        .addStringOption((o) =>
            o
                .setName('valor')
                .setDescription('Valor, all ou half')
                .setRequired(true)
        ),

    async execute(message, args) {
        await run(message.author, args[0], message.guild, (p) => message.reply(p));
    },

    async executeSlash(i) {
        await run(i.user, i.options.getString('valor', true), i.guild, (p) => i.reply(p));
    }
};
