const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const vip = require('../utils/vip');

const COLOR = 0xa78bfa;

module.exports = {
    name: 'vervip',
    aliases: ['vip', 'meuvip', 'checkvip'],
    description: 'Ver VIP de um membro ou lista do servidor',
    data: new SlashCommandBuilder()
        .setName('ver-vip')
        .setDescription('Ver status de VIP')
        .addUserOption((o) =>
            o.setName('usuario').setDescription('Membro (opcional)').setRequired(false)
        ),

    async execute(message, args) {
        const target =
            message.mentions.users.first() ||
            (args[0] && (await message.client.users.fetch(args[0]).catch(() => null))) ||
            null;

        if (target) {
            return message.reply({ embeds: [await buildUserEmbed(message.guild, target)] });
        }
        return message.reply({ embeds: [await buildListEmbed(message.guild)] });
    },

    async executeSlash(i) {
        const target = i.options.getUser('usuario');
        if (target) {
            return i.reply({ embeds: [await buildUserEmbed(i.guild, target)] });
        }
        return i.reply({ embeds: [await buildListEmbed(i.guild)] });
    }
};

async function buildUserEmbed(guild, user) {
    const rec = vip.get(guild.id, user.id);
    const emb = new EmbedBuilder()
        .setColor(COLOR)
        .setTitle('VIP')
        .setThumbnail(user.displayAvatarURL({ size: 128 }));

    if (!rec || rec.expired) {
        emb.setDescription(`${user} **não possui VIP ativo** neste servidor.`);
        return emb;
    }

    const label = vip.vipLabel(rec);
    emb.setDescription(`${user}`);
    emb.addFields(
        { name: 'VIP', value: `**${label}**`, inline: true },
        {
            name: 'Há quanto tempo',
            value: vip.timeHeld(rec.registeredAt),
            inline: true
        },
        {
            name: 'Tempo restante',
            value: vip.timeLeft(rec.expiresAt),
            inline: true
        },
        {
            name: 'Desde',
            value: rec.registeredAt
                ? `<t:${Math.floor(rec.registeredAt / 1000)}:D>`
                : '—',
            inline: true
        }
    );
    if (rec.expiresAt) {
        emb.addFields({
            name: 'Expira em',
            value: `<t:${Math.floor(rec.expiresAt / 1000)}:D>`,
            inline: true
        });
    }
    if (rec.registeredBy) {
        emb.addFields({
            name: 'Registrado por',
            value: `<@${rec.registeredBy}>`,
            inline: true
        });
    }
    if (rec.note) emb.addFields({ name: 'Nota', value: rec.note });
    return emb;
}

async function buildListEmbed(guild) {
    const list = vip.listActive(guild.id);
    const emb = new EmbedBuilder().setColor(COLOR).setTitle('VIPs do servidor');

    if (!list.length) {
        emb.setDescription('Nenhum VIP ativo no momento.');
        return emb;
    }

    const lines = [];
    for (const v of list.slice(0, 20)) {
        const label = vip.vipLabel(v);
        const held = vip.timeHeld(v.registeredAt);
        const left = vip.timeLeft(v.expiresAt);
        lines.push(
            `<@${v.userId}> · **${label}** · há **${held}** · resta **${left}**`
        );
    }
    if (list.length > 20) lines.push(`_…e mais ${list.length - 20}_`);

    emb.setDescription(lines.join('\n'));
    emb.setFooter({ text: `${list.length} VIP(s) ativo(s)` });
    return emb;
}
