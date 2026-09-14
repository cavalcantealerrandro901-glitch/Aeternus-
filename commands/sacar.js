const { EmbedBuilder, SlashCommandBuilder, MessageFlags } = require('discord.js');
const eter = require('../utils/eter');
const bank = require('../utils/bank');
const { resolveBet } = require('../utils/parseAmount');
const { getPrefix } = require('../utils/settings');

function fmt(n) {
    return Number(n || 0).toLocaleString('pt-BR');
}

function prefixOf(guild) {
    return guild?.id ? getPrefix(guild.id) : 'O.';
}

/** Banco vazio / sem saldo para sacar */
function msgEmpty(guild, bankBal) {
    const prefix = prefixOf(guild);
    return (
        `😔 Infelizmente seu saque foi negado. Atualmente você tem ✨ **${fmt(bankBal)}** éter no seu banco. Use \`/ver-banco\` ou \`${prefix}banco\`.`
    );
}

/** Tentou sacar mais do que tem */
function msgTooMuch() {
    return '⚠️ Você tá tentando sacar o que você não tem. Use um valor válido.';
}

/** Comando / número inválido */
function msgInvalid(guild) {
    const prefix = prefixOf(guild);
    return (
        `❓ Comando inválido. Use \`${prefix}sacar <valor>\` — aceitamos *all* e *half*.`
    );
}

async function run(user, amountRaw, guild, reply) {
    const userId = user.id;
    const bankBal = bank.get(userId);
    const prefix = prefixOf(guild);
    const raw = amountRaw == null ? '' : String(amountRaw).trim();

    if (!raw) {
        return reply({ content: msgInvalid(guild) });
    }

    if (bankBal <= 0) {
        return reply({ content: msgEmpty(guild, bankBal) });
    }

    const bet = resolveBet(raw, bankBal, { label: '✨' });
    if (!bet.ok) {
        const err = String(bet.error || '').toLowerCase();
        // número/comando inválido
        if (
            /inválid|invalid|número|number|formato|parse|nan|não reconhec/i.test(err) ||
            (!/\d/.test(raw) && !/^(all|half|tudo|metade)$/i.test(raw))
        ) {
            return reply({ content: msgInvalid(guild) });
        }
        // pediu mais do que tem
        if (/insuficiente|maior|saldo|não tem|nao tem|excede/i.test(err)) {
            return reply({ content: msgTooMuch() });
        }
        return reply({ content: msgInvalid(guild) });
    }

    if (bet.amount > bankBal) {
        return reply({ content: msgTooMuch() });
    }

    if (bet.amount <= 0) {
        return reply({ content: msgInvalid(guild) });
    }

    const result = bank.withdraw(userId, bet.amount, eter);
    if (!result.ok) {
        const err = String(result.error || '').toLowerCase();
        if (/insuficiente|cofre/i.test(err)) {
            return reply({ content: msgTooMuch() });
        }
        return reply({ content: msgEmpty(guild, bank.get(userId)) });
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
