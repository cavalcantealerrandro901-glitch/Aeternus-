const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const eter = require('../utils/eter');
const store = require('../utils/store');

const CD_MS = 10 * 60 * 1000;

const CRIMES = [
    { name: 'Assalto ao caixa', emoji: '🏦' },
    { name: 'Furto na loja', emoji: '🏪' },
    { name: 'Roubo de carteira', emoji: '👛' },
    { name: 'Golpe online', emoji: '💻' },
    { name: 'Sequestro de NFT', emoji: '🖼️' },
    { name: 'Invasão ao cofre', emoji: '🔐' },
    { name: 'Tráfico de emojis', emoji: '📦' },
    { name: 'Hack no banco', emoji: '🧬' },
    { name: 'Desvio de carga', emoji: '🚚' },
    { name: 'Falsificação de éter', emoji: '🪙' }
];

function fmt(n) {
    return Number(n || 0).toLocaleString('pt-BR');
}

function cdLeft(userId) {
    const cds = store.load('crimecd.json', {});
    const last = Number(cds[userId] || 0);
    const left = CD_MS - (Date.now() - last);
    return left > 0 ? left : 0;
}

function setCd(userId) {
    const cds = store.load('crimecd.json', {});
    cds[userId] = Date.now();
    store.save('crimecd.json', cds);
}

function formatCd(ms) {
    const s = Math.ceil(ms / 1000);
    const m = Math.floor(s / 60);
    const r = s % 60;
    if (m <= 0) return `**${r}s**`;
    return `**${m}m ${String(r).padStart(2, '0')}s**`;
}

function pickCrime() {
    return CRIMES[Math.floor(Math.random() * CRIMES.length)];
}

function rollReward() {
    return 100 + Math.floor(Math.random() * 900);
}

function rollFine(balance) {
    const raw = 50 + Math.floor(Math.random() * 450);
    return Math.min(Math.max(0, balance), raw);
}

function successEmbed(user, crime, amount, balance) {
    return new EmbedBuilder()
        .setColor(0x22c55e)
        .setAuthor({
            name: user.username,
            iconURL: user.displayAvatarURL({ size: 64 })
        })
        .setTitle(`${crime.emoji} Crime bem-sucedido`)
        .setDescription(
            [
                `**${crime.name}** deu certo.`,
                '',
                `Você levou **✨ ${fmt(amount)}**.`,
                `**Saldo:** ✨ **${fmt(balance)}**`,
                '',
                `_Próximo crime em ${formatCd(CD_MS).replace(/\*\*/g, '')}._`
            ].join('\n')
        );
}

function failEmbed(user, crime, fine, balance) {
    const lines = [
        `**${crime.name}** deu errado.`,
        '',
        fine > 0
            ? `A polícia te pegou. Multa de **✨ ${fmt(fine)}**.`
            : 'A polícia te pegou, mas você não tinha éter para pagar a multa.',
        `**Saldo:** ✨ **${fmt(balance)}**`,
        '',
        `_Próximo crime em ${formatCd(CD_MS).replace(/\*\*/g, '')}._`
    ];
    return new EmbedBuilder()
        .setColor(0xef4444)
        .setAuthor({
            name: user.username,
            iconURL: user.displayAvatarURL({ size: 64 })
        })
        .setTitle(`${crime.emoji} Crime fracassou`)
        .setDescription(lines.join('\n'));
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
                'Você ainda está se escondendo da última tentativa.',
                `Aguarde ${formatCd(left)} para cometer outro crime.`
            ].join('\n')
        );
}

async function run(user, reply) {
    const left = cdLeft(user.id);
    if (left > 0) {
        return reply({ embeds: [waitEmbed(user, left)] });
    }

    setCd(user.id);
    const crime = pickCrime();
    const win = Math.random() < 0.55;

    if (win) {
        const amount = rollReward();
        eter.add(user.id, amount, { reason: 'crime' });
        const balance = eter.get(user.id);
        return reply({ embeds: [successEmbed(user, crime, amount, balance)] });
    }

    const fine = rollFine(eter.get(user.id));
    if (fine > 0) eter.remove(user.id, fine, { reason: 'crime fail' });
    const balance = eter.get(user.id);
    return reply({ embeds: [failEmbed(user, crime, fine, balance)] });
}

module.exports = {
    name: 'crime',
    aliases: ['cometer-crime', 'assaltar'],
    description: 'Tentar um crime por éter',
    data: new SlashCommandBuilder()
        .setName('cometer-crime')
        .setDescription('Tentar um crime para ganhar ou perder éter'),

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
