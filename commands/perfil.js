const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const flocos = require('../utils/flocos');
const cristais = require('../utils/cristais');
const bank = require('../utils/bank');
const xp = require('../utils/xp');
const invites = require('../utils/invites');
const shop = require('../utils/shop');

function fmt(n) {
    return Number(n || 0).toLocaleString('pt-BR');
}

async function showProfile(ctx, target) {
    const isSlash = Boolean(ctx.isChatInputCommand && ctx.isChatInputCommand());
    const guild = ctx.guild;
    const x = xp.get(target.id);
    const inv = shop.getInv(target.id);
    const dec = shop.getEquippedDecoration(target.id);
    const title = shop.getEquippedTitle(target.id);
    const invStats = guild ? invites.getStats(guild.id, target.id) : { total: 0 };

    const embed = new EmbedBuilder()
        .setColor(0x8b5cf6)
        .setAuthor({
            name: `${target.username}`,
            iconURL: target.displayAvatarURL({ size: 64 })
        })
        .setTitle(title ? `👑 ${title}` : '✨ Perfil')
        .setDescription(
            [
                dec ? `🎨 **Decoração:** ${dec.name}` : '🎨 Sem decoração — compre no painel',
                '',
                `⭐ Nível **${x.level}**`,
                `❄️ **${fmt(flocos.get(target.id))}** flocos`,
                `💠 **${fmt(cristais.get(target.id))}** cristais`,
                `🏦 **${fmt(bank.get(target.id))}** no banco`,
                `🎒 Coleção **${inv.owned.length}**`,
                guild ? `📩 Convites **${invStats.total}**` : null
            ]
                .filter(Boolean)
                .join('\n')
        )
        .setThumbnail(target.displayAvatarURL({ size: 256 }))
        .setFooter({ text: 'Imagem de decoração · O.loja · painel /decoracoes' })
        .setTimestamp();

    // imagem real da decoração (não muda “tema de cor” — é foto de fundo)
    if (dec?.image) {
        embed.setImage(dec.image);
    }

    const payload = { embeds: [embed] };
    if (isSlash) {
        if (ctx.deferred || ctx.replied) return ctx.editReply(payload);
        return ctx.reply(payload);
    }
    return ctx.reply(payload);
}

module.exports = {
    name: 'perfil',
    aliases: ['profile', 'eu'],
    description: 'Perfil com imagem de decoração',
    data: new SlashCommandBuilder()
        .setName('perfil')
        .setDescription('Mostra o perfil')
        .addUserOption((o) =>
            o.setName('usuario').setDescription('Usuário').setRequired(false)
        ),

    async execute(message) {
        await showProfile(message, message.mentions.users.first() || message.author);
    },

    async executeSlash(interaction) {
        await showProfile(interaction, interaction.options.getUser('usuario') || interaction.user);
    }
};
