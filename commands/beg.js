const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const eter = require('../utils/eter');
const store = require('../utils/store');

const CD_MS = 60 * 60 * 1000;
const REWARD_MIN = 100_000;
const REWARD_MAX = 600_000;

function fmt(n) {
    return Number(n || 0).toLocaleString('pt-BR');
}

function cdLeft(userId) {
    const cds = store.load('begcd.json', {});
    const last = Number(cds[userId] || 0);
    const left = CD_MS - (Date.now() - last);
    return left > 0 ? left : 0;
}

function setCd(userId) {
    const cds = store.load('begcd.json', {});
    cds[userId] = Date.now();
    store.save('begcd.json', cds);
}

function formatCd(ms) {
    const s = Math.ceil(ms / 1000);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const r = s % 60;
    if (h > 0) return `**${h}h ${String(m).padStart(2, '0')}m**`;
    if (m > 0) return `**${m}m ${String(r).padStart(2, '0')}s**`;
    return `**${r}s**`;
}

function successEmbed(user, amount, balance) {
    return new EmbedBuilder()
        .setColor(0x34d399)
        .setAuthor({
            name: user.username,
            iconURL: user.displayAvatarURL({ size: 64 })
        })
        .setTitle('🙏 Pedido atendido')
        .setDescription(
            [
                'Alguém passou e deixou éter para você.',
                '',
                `Você recebeu **✨ ${fmt(amount)}**.`,
                `**Saldo:** ✨ **${fmt(balance)}**`,
                '',
                '_Cooldown: 1 hora · você será avisado no PV quando liberar._'
            ].join('\n')
        );
}

function waitEmbed(user, left) {
    return new EmbedBuilder()
        .setColor(0xf59e0b)
        .setAuthor({
            name: user.username,
            iconURL: user.displayAvatarURL({ size: 64 })
        })
        .setTitle('⏳ Em espera')
        .setDescription(
            [
                'Você já pediu há pouco tempo.',
                `Aguarde ${formatCd(left)} para pedir de novo.`,
                '',
                '_Quando o tempo acabar, você recebe um aviso no PV._'
            ].join('\n')
        );
}

async function run(user, reply) {
    const left = cdLeft(user.id);
    if (left > 0) {
        return reply({ embeds: [waitEmbed(user, left)] });
    }

    setCd(user.id);
    const amount = REWARD_MIN + Math.floor(Math.random() * (REWARD_MAX - REWARD_MIN + 1));
    eter.add(user.id, amount, { reason: 'beg' });
    const balance = eter.get(user.id);
    return reply({ embeds: [successEmbed(user, amount, balance)] });
}

module.exports = {
    name: 'beg',
    aliases: ['mendigar', 'pedir'],
    description: 'Pedir éter',
    CD_MS,
    data: new SlashCommandBuilder()
        .setName('pedir')
        .setDescription('Pedir éter (100k–600k · cooldown 1h)'),

    async execute(message) {
        await run(message.author, (p) => message.reply(p));
    },

    async executeSlash(i) {
        await run(i.user, (p) => {
            if (typeof p === 'string') {
                return i.reply({ content: p, flags: 64 });
            }
            return i.reply(p);
        });
    }
};
