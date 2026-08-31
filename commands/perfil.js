const { EmbedBuilder, AttachmentBuilder, SlashCommandBuilder } = require('discord.js');
const flocos = require('../utils/flocos');
const cristais = require('../utils/cristais');
const bank = require('../utils/bank');
const xp = require('../utils/xp');
const invites = require('../utils/invites');
const shop = require('../utils/shop');

function fmt(n) {
    return Number(n || 0).toLocaleString('pt-BR');
}

function escapeXml(s) {
    return String(s || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .slice(0, 28);
}

/** Card de perfil gerado pelo bot (SVG) */
function buildProfileCard({ username, theme, title, level, flocosBal, crisBal, bankBal, invTotal }) {
    const name = escapeXml(username);
    const t = theme || {};
    const titleLine = title ? escapeXml(title) : 'MEMBRO';
    return Buffer.from(
        `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="800" height="420" viewBox="0 0 800 420">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${t.bg1 || '#0f172a'}"/>
      <stop offset="100%" stop-color="${t.bg2 || '#1e1b4b'}"/>
    </linearGradient>
    <radialGradient id="glow" cx="20%" cy="30%" r="60%">
      <stop offset="0%" stop-color="${t.accent || '#a78bfa'}" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="${t.accent || '#a78bfa'}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="800" height="420" rx="24" fill="url(#bg)"/>
  <rect width="800" height="420" rx="24" fill="url(#glow)"/>
  <rect x="24" y="24" width="752" height="372" rx="18" fill="none" stroke="${t.accent || '#a78bfa'}" stroke-opacity="0.35" stroke-width="2"/>
  <text x="56" y="72" font-family="Segoe UI, Arial, sans-serif" font-size="13" letter-spacing="6" fill="${t.accent || '#a78bfa'}">AETERNUS · PROFILE</text>
  <text x="56" y="120" font-family="Segoe UI, Arial, sans-serif" font-size="36" font-weight="700" fill="#f8fafc">${name}</text>
  <text x="56" y="152" font-family="Segoe UI, Arial, sans-serif" font-size="16" fill="${t.accent || '#a78bfa'}">${titleLine} · TEMA ${escapeXml(t.name || 'PADRÃO')}</text>
  <g font-family="Segoe UI, Arial, sans-serif" fill="#e2e8f0">
    <text x="56" y="220" font-size="15" fill="#94a3b8">NÍVEL</text>
    <text x="56" y="248" font-size="28" font-weight="700">${level}</text>
    <text x="200" y="220" font-size="15" fill="#94a3b8">FLOCOS</text>
    <text x="200" y="248" font-size="22" font-weight="700">${fmt(flocosBal)}</text>
    <text x="400" y="220" font-size="15" fill="#94a3b8">CRISTAIS</text>
    <text x="400" y="248" font-size="22" font-weight="700">${fmt(crisBal)}</text>
    <text x="600" y="220" font-size="15" fill="#94a3b8">BANCO</text>
    <text x="600" y="248" font-size="22" font-weight="700">${fmt(bankBal)}</text>
    <text x="56" y="310" font-size="15" fill="#94a3b8">ITENS NA COLEÇÃO</text>
    <text x="56" y="338" font-size="22" font-weight="700">${invTotal}</text>
  </g>
  <text x="56" y="380" font-family="Segoe UI, Arial, sans-serif" font-size="12" fill="#64748b">Decoração gerada pelo bot · O.loja · O.perfil</text>
</svg>`,
        'utf8'
    );
}

async function showProfile(ctx, target) {
    const isSlash = Boolean(ctx.isChatInputCommand && ctx.isChatInputCommand());
    const guild = ctx.guild;
    const x = xp.get(target.id);
    const inv = shop.getInv(target.id);
    const theme = shop.getEquippedTheme(target.id);
    const title = shop.getEquippedTitle(target.id);
    const invStats = guild ? invites.getStats(guild.id, target.id) : { total: 0 };

    const card = buildProfileCard({
        username: target.username,
        theme,
        title,
        level: x.level,
        flocosBal: flocos.get(target.id),
        crisBal: cristais.get(target.id),
        bankBal: bank.get(target.id),
        invTotal: inv.owned.length
    });

    const file = new AttachmentBuilder(card, { name: 'perfil.svg' });

    const embed = new EmbedBuilder()
        .setColor(0xa78bfa)
        .setAuthor({
            name: `${target.username} · Perfil`,
            iconURL: target.displayAvatarURL({ size: 64 })
        })
        .setTitle(title ? `👑 ${title}` : '✨ Perfil Aeternus')
        .setDescription(
            [
                `**Tema:** ${theme.name || 'PADRÃO'}`,
                `**Coleção:** ${inv.owned.length} item(ns)`,
                guild ? `**Convites:** ${invStats.total}` : null,
                '',
                '❄️ Flocos · 💠 Cristais · 🏦 Banco no card abaixo.',
                'Compre decorações em `O.loja` e equipe pelo menu.'
            ]
                .filter(Boolean)
                .join('\n')
        )
        .setImage('attachment://perfil.svg')
        .setThumbnail(target.displayAvatarURL({ size: 256 }))
        .setFooter({ text: 'Card gerado pelo bot · Aeternus' })
        .setTimestamp();

    const payload = { embeds: [embed], files: [file] };
    if (isSlash) {
        if (ctx.deferred || ctx.replied) return ctx.editReply(payload);
        return ctx.reply(payload);
    }
    return ctx.reply(payload);
}

module.exports = {
    name: 'perfil',
    aliases: ['profile', 'eu'],
    description: 'Perfil premium com card gerado pelo bot',
    data: new SlashCommandBuilder()
        .setName('perfil')
        .setDescription('Mostra o perfil com card decorado')
        .addUserOption((o) =>
            o.setName('usuario').setDescription('Usuário').setRequired(false)
        ),

    async execute(message) {
        const user = message.mentions.users.first() || message.author;
        await showProfile(message, user);
    },

    async executeSlash(interaction) {
        const user = interaction.options.getUser('usuario') || interaction.user;
        await showProfile(interaction, user);
    }
};
