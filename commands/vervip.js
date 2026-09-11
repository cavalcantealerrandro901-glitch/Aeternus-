const {
    EmbedBuilder,
    SlashCommandBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');
const vip = require('../utils/vip');

const COLOR = 0xa78bfa;
const PAGE_SIZE = 6;

function rolesText(v) {
    const ids =
        Array.isArray(v.roleIds) && v.roleIds.length
            ? v.roleIds
            : v.roleId
              ? [v.roleId]
              : [];
    if (!ids.length) return '_sem cargo_';
    return ids.map((id) => `<@&${id}>`).join(' ');
}

module.exports = {
    name: 'veranotacoes',
    aliases: ['vervip', 'vip', 'meuvip', 'listavip', 'verregistros', 'registros', 'anotacoes'],
    description: 'Ver anotações de compras e registros',
    data: (() => {
        const b = new SlashCommandBuilder()
            .setName('ver-anotacoes')
            .setDescription('Ver anotações por categoria')
            .addStringOption((o) => {
                o.setName('categoria')
                    .setDescription('Filtrar por categoria')
                    .setRequired(false);
                o.addChoices({ name: 'Todas', value: 'todas' });
                for (const c of vip.CATEGORIES) {
                    o.addChoices({ name: c.name, value: c.value });
                }
                return o;
            })
            .addUserOption((o) =>
                o
                    .setName('usuario')
                    .setDescription('Ver só um membro (opcional)')
                    .setRequired(false)
            );
        return b;
    })(),

    async execute(message, args) {
        const target = message.mentions.users.first();
        if (target) {
            return message.reply({ embeds: [buildUserEmbed(message.guild, target)] });
        }
        let category = 'todas';
        const a0 = String(args[0] || '').toLowerCase();
        if (a0 && a0 !== 'todas') {
            const known = vip.CATEGORIES.find(
                (c) => c.value === a0 || c.name.toLowerCase() === a0
            );
            if (known) category = known.value;
        }
        const list = vip.listAll(message.guild.id, category);
        return message.reply(buildPagePayload(list, category, 0));
    },

    async executeSlash(i) {
        const target = i.options.getUser('usuario');
        if (target) {
            return i.reply({ embeds: [buildUserEmbed(i.guild, target)] });
        }
        const category = i.options.getString('categoria') || 'todas';
        const list = vip.listAll(i.guild.id, category);
        return i.reply(buildPagePayload(list, category, 0));
    },

    async handleComponent(interaction) {
        const id = interaction.customId || '';
        const parts = id.split(':');
        if (parts[0] !== 'veranotacoes') return;
        const dir = parts[1];
        const category = parts[2] || 'todas';
        let page = Number(parts[3]) || 0;

        if (dir === 'prev') page = Math.max(0, page - 1);
        else if (dir === 'next') page = page + 1;
        else return;

        const list = vip.listAll(interaction.guild.id, category);
        const totalPages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
        if (page >= totalPages) page = totalPages - 1;
        if (page < 0) page = 0;

        await interaction.update(buildPagePayload(list, category, page));
    }
};

function buildUserEmbed(guild, user) {
    const list = vip.listAll(guild.id).filter((r) => String(r.userId) === String(user.id));
    const emb = new EmbedBuilder()
        .setColor(COLOR)
        .setTitle('Anotações')
        .setThumbnail(user.displayAvatarURL({ size: 128 }));

    if (!list.length) {
        emb.setDescription(`${user} **não possui anotações** neste servidor.`);
        return emb;
    }

    const lines = list.slice(0, 15).map((v, idx) => {
        const label = vip.vipLabel(v);
        const cat = vip.categoryLabel(v.category);
        const when = v.registeredAt
            ? `<t:${Math.floor(v.registeredAt / 1000)}:f>`
            : '—';
        const cargo =
            (Array.isArray(v.roleIds) && v.roleIds.length) || v.roleId
                ? ` · ${rolesText(v)}`
                : '';
        return `**${idx + 1}.** [${cat}] **${label}** — ${when}${cargo}`;
    });
    emb.setDescription(`${user}\n\n` + lines.join('\n'));
    emb.setFooter({ text: `${list.length} anotação(ões)` });
    return emb;
}

function buildPagePayload(list, category, page) {
    const totalPages = Math.max(1, Math.ceil(list.length / PAGE_SIZE) || 1);
    page = Math.max(0, Math.min(page, totalPages - 1));
    const start = page * PAGE_SIZE;
    const slice = list.slice(start, start + PAGE_SIZE);
    const catLabel = category === 'todas' ? 'Todas' : vip.categoryLabel(category);

    const emb = new EmbedBuilder()
        .setColor(COLOR)
        .setTitle(`Anotações · ${catLabel}`);

    if (!list.length) {
        emb.setDescription('Nenhuma anotação nesta categoria.');
    } else {
        const lines = slice.map((v, idx) => {
            const n = start + idx + 1;
            const label = vip.vipLabel(v);
            const cat = vip.categoryLabel(v.category);
            const cargo = rolesText(v);
            const when = v.registeredAt
                ? `<t:${Math.floor(v.registeredAt / 1000)}:f>`
                : '—';
            const status = v.expired ? ' · _expirado_' : '';
            return (
                `**${n}.** **${label}** — <@${v.userId}>\n` +
                `  📂 ${cat} · 📅 ${when} · 🎭 ${cargo}${status}`
            );
        });
        emb.setDescription(lines.join('\n\n'));
    }

    emb.setFooter({
        text: `Página ${page + 1}/${totalPages} · ${list.length} anotação(ões)`
    });

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`veranotacoes:prev:${category}:${page}`)
            .setLabel('Voltar')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(page <= 0),
        new ButtonBuilder()
            .setCustomId(`veranotacoes:next:${category}:${page}`)
            .setLabel('Próximo')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(page >= totalPages - 1 || list.length === 0)
    );

    return { embeds: [emb], components: [row] };
}
