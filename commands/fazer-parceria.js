const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    EmbedBuilder
} = require('discord.js');
const partnerships = require('../utils/partnerships');

module.exports = {
    name: 'fazer-parceria',
    aliases: ['parceria', 'addparceria', 'novaparceria'],
    description: 'Registra uma parceria com um representante',
    category: 'moderacao',

    data: new SlashCommandBuilder()
        .setName('fazer-parceria')
        .setDescription('Registra parceria (representante + convite do servidor parceiro)')
        .addUserOption((o) =>
            o
                .setName('representante')
                .setDescription('Membro que representa a parceria neste servidor')
                .setRequired(true)
        )
        .addStringOption((o) =>
            o
                .setName('convite')
                .setDescription('Link de convite do servidor parceiro')
                .setRequired(true)
                .setMaxLength(200)
        )
        .addStringOption((o) =>
            o
                .setName('nome')
                .setDescription('Nome do servidor parceiro')
                .setRequired(false)
                .setMaxLength(80)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .setDMPermission(false),

    async execute(message, args) {
        if (!message.member?.permissions?.has(PermissionFlagsBits.ManageGuild)) {
            return message.reply('❌ Precisa de **Gerenciar Servidor**.');
        }
        const rep =
            message.mentions.members.first() ||
            (args[0] && (await message.guild.members.fetch(args[0]).catch(() => null)));
        const invite =
            args.find((a) => /discord\.gg\/|discord\.com\/invite\//i.test(a)) ||
            args[1];
        const nomeParts = args.filter(
            (a) =>
                !a.startsWith('<@') &&
                !/discord\.gg\/|discord\.com\/invite\//i.test(a) &&
                !/^\d{17,20}$/.test(a)
        );
        const nome = nomeParts.join(' ') || null;
        if (!rep || !invite) {
            return message.reply(
                'Uso: `O.fazer-parceria @representante <link-convite> [nome do servidor]`'
            );
        }
        return run(message, {
            repUser: rep.user,
            member: rep,
            invite: String(invite).trim(),
            serverName: nome
        });
    },

    async executeSlash(i) {
        if (!i.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
            return i.reply({
                content: '❌ Precisa de **Gerenciar Servidor**.',
                flags: 64
            });
        }
        await i.deferReply();
        const user = i.options.getUser('representante', true);
        const invite = i.options.getString('convite', true).trim();
        const serverName = i.options.getString('nome');
        const member = await i.guild.members.fetch(user.id).catch(() => null);
        if (!member) {
            return i.editReply({ content: '❌ Representante não está neste servidor.' });
        }
        return run(i, {
            repUser: user,
            member,
            invite,
            serverName,
            isSlash: true
        });
    }
};

async function run(ctx, { repUser, member, invite, serverName, isSlash }) {
    const guild = ctx.guild;
    const conf = partnerships.getConfig(guild.id);
    if (conf.enabled === false) {
        return reply(ctx, isSlash, '❌ Sistema de parcerias desativado no painel.');
    }

    if (!/discord\.gg\/|discord\.com\/invite\//i.test(invite)) {
        return reply(
            ctx,
            isSlash,
            '❌ Informe um convite válido (`discord.gg/...` ou `discord.com/invite/...`).'
        );
    }

    const channelId = conf.channelId || ctx.channel?.id;
    const ch = await guild.channels.fetch(channelId).catch(() => null);
    if (!ch?.isTextBased()) {
        return reply(
            ctx,
            isSlash,
            '❌ Canal de parcerias inválido. Configure no painel (Parcerias).'
        );
    }

    const name = serverName || `Parceiro de ${repUser.username}`;
    const text = partnerships.fill(conf.phrase || partnerships.DEFAULT_PHRASE, {
        rep: `${repUser}`,
        server: name,
        invite,
        host: guild.name
    });

    const emb = new EmbedBuilder()
        .setColor(0xa78bfa)
        .setTitle('🤝 Parceria')
        .setDescription(text)
        .addFields(
            { name: 'Representante', value: `${repUser}`, inline: true },
            { name: 'Servidor', value: name, inline: true },
            { name: 'Convite', value: invite, inline: false }
        )
        .setFooter({ text: `Por ${ctx.user?.tag || ctx.author?.tag || 'staff'}` })
        .setTimestamp();

    if (conf.image && /^https?:\/\//i.test(conf.image)) {
        emb.setImage(conf.image);
    }

    const msg = await ch.send({ embeds: [emb] }).catch(() => null);
    if (!msg) {
        return reply(ctx, isSlash, '❌ Não consegui enviar no canal de parcerias.');
    }

    const entry = partnerships.create(guild.id, {
        repId: repUser.id,
        repTag: repUser.tag,
        inviteUrl: invite,
        serverName: name,
        messageId: msg.id,
        channelId: ch.id,
        createdBy: (ctx.user || ctx.author).id
    });

    try {
        await repUser.send({
            content: partnerships.fixedDmText({
                host: guild.name,
                server: name,
                invite
            })
        });
    } catch (_) {}

    const ok = new EmbedBuilder()
        .setColor(0x22c55e)
        .setTitle('✅ Parceria registrada')
        .setDescription(
            `**Representante:** ${repUser}\n` +
                `**Servidor:** ${name}\n` +
                `**Canal:** ${ch}\n` +
                `**ID:** \`${entry.id}\`\n\n` +
                `_Se o representante sair do servidor, a parceria e o anúncio são removidos._`
        );

    return reply(ctx, isSlash, { embeds: [ok] });
}

async function reply(ctx, isSlash, content) {
    const payload = typeof content === 'string' ? { content } : content;
    if (isSlash) {
        if (ctx.deferred || ctx.replied) return ctx.editReply(payload);
        return ctx.reply(payload);
    }
    return ctx.reply(payload);
}
