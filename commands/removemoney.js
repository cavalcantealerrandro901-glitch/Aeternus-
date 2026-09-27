const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const eter = require('../utils/eter');
const { parseAmount, resolveBet, looksLikeAmount } = require('../utils/parseAmount');

/** Cargo autorizado a remover éter */
const ALLOWED_ROLE_ID = '1553858768708706404';

function fmt(n) {
    return Number(n || 0).toLocaleString('pt-BR');
}

function pickAmount(args) {
    return args.find((a) => !a.startsWith('<@') && looksLikeAmount(a)) || null;
}

function hasAllowedRole(member) {
    if (!member) return false;
    if (member.roles?.cache?.has(ALLOWED_ROLE_ID)) return true;
    const roles = member.roles?.cache || member._roles || [];
    if (Array.isArray(roles)) return roles.map(String).includes(ALLOWED_ROLE_ID);
    return false;
}

async function run(modMember, target, amountRaw, reply) {
    if (!hasAllowedRole(modMember)) {
        return reply('❌ Você não tem permissão para usar este comando.');
    }
    if (!target) return reply('❌ Informe o usuário. Ex.: `O.removemoney @user half`');
    if (!amountRaw) {
        return reply(
            '❌ Informe o valor.\n' +
                'Exemplos: `1000` · `1k` · `all` · `half` · `50%`'
        );
    }

    const bal = eter.get(target.id);
    // all/half/% relativos ao saldo do alvo; números fixos também
    const bet = resolveBet(amountRaw, bal, { label: '✨', min: 1 });
    if (!bet.ok) {
        // se for número maior que saldo, remove o que tiver?
        const fixed = parseAmount(amountRaw, bal);
        if (Number.isFinite(fixed) && fixed > 0 && bal > 0) {
            const take = Math.min(fixed, bal);
            eter.remove(target.id, take, { reason: 'removemoney' });
            return reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0xef4444)
                        .setTitle('Éter removido')
                        .setDescription(
                            `**${target.tag || target.username}** · ✨ **-${fmt(take)}**\n` +
                                `Saldo: **${fmt(eter.get(target.id))}**`
                        )
                        .setFooter({ text: `Mod: ${modMember.user?.tag || 'staff'}` })
                        .setTimestamp()
                ]
            });
        }
        return reply(`❌ ${bet.error}`);
    }

    eter.remove(target.id, bet.amount, { reason: 'removemoney' });
    return reply({
        embeds: [
            new EmbedBuilder()
                .setColor(0xef4444)
                .setTitle('Éter removido')
                .setDescription(
                    `**${target.tag || target.username}** · ✨ **-${fmt(bet.amount)}**\n` +
                        `Saldo: **${fmt(eter.get(target.id))}**`
                )
                .setFooter({ text: `Mod: ${modMember.user?.tag || 'staff'}` })
                .setTimestamp()
        ]
    });
}

module.exports = {
    name: 'removemoney',
    aliases: ['removeeter', 'takemoney', 'remover-eter'],
    description: 'Remover éter (cargo autorizado) — all/half/k/m…',
    data: new SlashCommandBuilder()
        .setName('remover-eter')
        .setDescription('Remover éter de um usuário')
        .addUserOption((o) => o.setName('usuario').setDescription('Usuário').setRequired(true))
        .addStringOption((o) =>
            o
                .setName('valor')
                .setDescription('Valor: 1k, all, half, 50%…')
                .setRequired(true)
        ),

    async execute(message, args) {
        const target = message.mentions.users.first();
        const amountRaw = pickAmount(args);
        await run(message.member, target, amountRaw, (p) => message.reply(p));
    },

    async executeSlash(i) {
        await run(
            i.member,
            i.options.getUser('usuario', true),
            i.options.getString('valor'),
            (p) => (typeof p === 'string' ? i.reply({ content: p, ephemeral: true }) : i.reply(p))
        );
    }
};
