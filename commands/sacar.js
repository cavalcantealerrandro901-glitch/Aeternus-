const { EmbedBuilder, SlashCommandBuilder, MessageFlags } = require('discord.js');
const eter = require('../utils/eter');
const bank = require('../utils/bank');
const { resolveBet } = require('../utils/parseAmount');

function fmt(n) {
    return Number(n || 0).toLocaleString('pt-BR');
}

function getPrefix(guild) {
    try {
        const store = require('../utils/store');
        const data = store.load('prefixes.json', {});
        if (guild?.id && data[guild.id]) return String(data[guild.id]);
    } catch (_) {}
    return process.env.PREFIX || 'O.';
}

async function run(user, amountRaw, guild, reply) {
    const userId = user.id;
    const bankBal = bank.get(userId);
    const bet = resolveBet(amountRaw, bankBal, { label: '✨' });
    if (!bet.ok) {
        return reply({ content: `❌ ${bet.error}`, flags: MessageFlags.Ephemeral });
    }

    const result = bank.withdraw(userId, bet.amount, eter);
    if (!result.ok) {
        return reply({ content: `❌ ${result.error}`, flags: MessageFlags.Ephemeral });
    }

    const prefix = getPrefix(guild);

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
