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

/** Carteira vazia / sem saldo para depositar */
function msgEmpty(guild, wallet) {
    const prefix = prefixOf(guild);
    return (
        `😔 Infelizmente seu depósito foi negado. Atualmente você tem ✨ **${fmt(wallet)}** éter na carteira. Use \`/ver-banco\` ou \`${prefix}banco\`.`
    );
}

/** Tentou depositar mais do que tem em mãos */
function msgTooMuch() {
    return '⚠️ Você tá tentando depositar o que você não tem. Use um valor válido.';
}

/** Comando / número inválido */
function msgInvalid(guild) {
    const prefix = prefixOf(guild);
    return (
        `❓ Comando inválido. Use \`${prefix}depositar <valor>\` — aceitamos *all* e *half*.`
    );
}

async function run(user, amountRaw, guild, reply) {
    const userId = user.id;
    const wallet = eter.get(userId);
    const prefix = prefixOf(guild);
    const raw = amountRaw == null ? '' : String(amountRaw).trim();

    if (!raw) {
        return reply({ content: msgInvalid(guild) });
    }

    if (wallet <= 0) {
        return reply({ content: msgEmpty(guild, wallet) });
    }

    const bet = resolveBet(raw, wallet, { label: '✨' });
    if (!bet.ok) {
        const err = String(bet.error || '').toLowerCase();
        if (
            /inválid|invalid|número|number|formato|parse|nan|não reconhec/i.test(err) ||
            (!/\d/.test(raw) && !/^(all|half|tudo|metade)$/i.test(raw))
        ) {
            return reply({ content: msgInvalid(guild) });
        }
        if (/insuficiente|maior|saldo|não tem|nao tem|excede/i.test(err)) {
            return reply({ content: msgTooMuch() });
        }
        return reply({ content: msgInvalid(guild) });
    }

    if (bet.amount > wallet) {
        return reply({ content: msgTooMuch() });
    }

    if (bet.amount <= 0) {
        return reply({ content: msgInvalid(guild) });
    }

    const result = bank.deposit(userId, bet.amount, eter);
    if (!result.ok) {
        const err = String(result.error || '').toLowerCase();
        if (/insuficiente|carteira/i.test(err)) {
            return reply({ content: msgTooMuch() });
        }
        return reply({ content: msgEmpty(guild, eter.get(userId)) });
    }

    const emb = new EmbedBuilder()
        .setColor(0x86efac)
        .setTitle('📥 DEPÓSITO REALIZADO!!')
        .setDescription(
            [
                '----------------------------------------',
                '',
                `Você depositou ✨ **${fmt(result.amount)}** éter`,
                '',
                `🏦 E agora você possui no banco ✨ **${fmt(result.bank)}** éter`,
                '',
                '---------------------------------------',
                '',
                `💡 Dica: use \`/sacar-eter\` ou \`${prefix}sacar <valor>\`.`
            ].join('\n')
        );

    return reply({
        content: `${user}`,
        embeds: [emb],
        allowedMentions: { users: [userId] }
    });
}

module.exports = {
    name: 'depositar',
    aliases: ['dep', 'deposit'],
    description: 'Depositar éter no cofre',
    data: new SlashCommandBuilder()
        .setName('depositar-eter')
        .setDescription('Depositar éter no banco')
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
