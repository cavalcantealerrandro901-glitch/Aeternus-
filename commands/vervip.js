const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const vip = require('../utils/vip');

const COLOR = 0xa78bfa;

module.exports = {
    name: 'veranotacoes',
    aliases: ['vervip', 'vip', 'meuvip', 'listavip', 'verregistros', 'registros', 'anotacoes'],
    description: 'Ver anotações de compras VIP',
    data: new SlashCommandBuilder()
        .setName('ver-anotacoes')
        .setDescription('Ver anotações de compras VIP')
        .addUserOption((o) =>
            o.setName('usuario').setDescription('Ver só um membro (opcional)').setRequired(false)
        ),

    async execute(message) {
        const target = message.mentions.users.first();
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
        .setTitle('Anotação')
        .setThumbnail(user.displayAvatarURL({ size: 128 }));

    if (!rec || rec.expired) {
        emb.setDescription(`${user} **não possui registro ativo** neste servidor.`);
        return emb;
    }

    const label = vip.vipLabel(rec);
    emb.setDescription(`${user}`);
    emb.addFields(
        { name: 'Nome', value: `**${label}**`, inline: true },
        {
            name: 'Cargo',
            value: rec.roleId ? `<@&${rec.roleId}>` : rec.roleName || '—',
            inline: true
        },
        {
            name: 'Data / hora',
            value: rec.registeredAt
                ? `<t:${Math.floor(rec.registeredAt / 1000)}:F>`
                : '—',
            inline: true
        },
        {
            name: 'Há quanto tempo',
            value: vip.timeHeld(rec.registeredAt),
            inline: true
        }
    );
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
    const list = vip.listAll(guild.id);
    const emb = new EmbedBuilder().setColor(COLOR).setTitle('Anotações de compra');

    if (!list.length) {
        emb.setDescription('Nenhuma anotação no momento.');
        return emb;
    }

    const lines = [];
    const max = 25;
    list.slice(0, max).forEach((v, idx) => {
        const n = idx + 1;
        const label = vip.vipLabel(v);
        const cargo = v.roleId ? `<@&${v.roleId}>` : v.roleName || '—';
        const when = v.registeredAt
            ? `<t:${Math.floor(v.registeredAt / 1000)}:f>`
            : '—';
        const status = v.expired ? ' · _expirado_' : '';
        lines.push(
            `**${n}.** **${label}** — <@${v.userId}>\n` +
                `  📅 ${when} · 🎭 ${cargo}${status}`
        );
    });
    if (list.length > max) lines.push(`_…e mais ${list.length - max}_`);

    emb.setDescription(lines.join('\n\n'));
    emb.setFooter({ text: `${list.length} anotação(ões)` });
    return emb;
}
