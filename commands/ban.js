const {
    EmbedBuilder,
    PermissionFlagsBits,
    SlashCommandBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');

const SAFE_MENTIONS = { parse: [], repliedUser: false };
const AETERNUS_PURPLE = 0x8B5CF6;
const CONFIRM_TIMEOUT = 6 * 60 * 1000;

function resolveMember(message, args) {
    const mentioned = message.mentions.members.first();
    if (mentioned) return mentioned;

    const id = String(args[0] || '').match(/^\d{15,25}$/)?.[0];
    if (!id) return null;
    return message.guild.members.cache.get(id) || null;
}

function sanitizeReason(value) {
    return String(value || 'Sem motivo')
        .replace(/@everyone/gi, '@ everyone')
        .replace(/@here/gi, '@ here')
        .replace(/[\u0000-\u001F\u007F]/g, ' ')
        .trim()
        .slice(0, 400) || 'Sem motivo';
}

function reasonFrom(args, hasMention) {
    const firstIsId = /^\d{15,25}$/.test(String(args[0] || ''));
    const start = hasMention || firstIsId ? 1 : 1;
    return sanitizeReason(args.slice(start).join(' '));
}

function moderatorCanBan(moderator, targetMember, guild) {
    if (!moderator?.permissions?.has(PermissionFlagsBits.BanMembers)) {
        return { ok: false, error: 'Você não tem a permissão **Banir membros**.' };
    }
    if (targetMember.id === moderator.id) {
        return { ok: false, error: 'Você não pode banir a si mesmo.' };
    }
    if (targetMember.id === moderator.client?.user?.id) {
        return { ok: false, error: 'Não posso banir a mim mesmo.' };
    }
    if (guild.ownerId !== moderator.id &&
        targetMember.roles.highest.comparePositionTo(moderator.roles.highest) >= 0) {
        return { ok: false, error: 'Seu cargo precisa estar acima do cargo do membro que deseja banir.' };
    }
    if (!targetMember.bannable) {
        return { ok: false, error: 'Não consigo banir esse membro. Confira a hierarquia de cargos e a permissão do Aeternus.' };
    }
    return { ok: true };
}

function confirmationRow(customId, disabled = false) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(customId)
            .setLabel('Confirmar banimento')
            .setEmoji('🔨')
            .setStyle(ButtonStyle.Danger)
            .setDisabled(disabled)
    );
}

async function handleBanProcess(context, moderator, targetMember, reason, isSlash = false) {
    const customId = `ban_confirm_${moderator.id}_${Date.now()}`;
    const embed = new EmbedBuilder()
        .setColor(AETERNUS_PURPLE)
        .setAuthor({
            name: 'AETERNUS • CENTRAL DE MODERAÇÃO',
            iconURL: moderator.displayAvatarURL?.({ size: 64 }) || undefined
        })
        .setTitle('🔨 Confirmar banimento')
        .setDescription('Revise os dados abaixo. O banimento só será executado após a confirmação.')
        .addFields(
            { name: '👮 Moderador', value: `<@${moderator.id}>`, inline: true },
            { name: '👤 Membro', value: `<@${targetMember.id}>`, inline: true },
            { name: '📝 Motivo', value: reason.slice(0, 400) }
        )
        .setFooter({ text: 'A confirmação expira em 6 minutos • Aeternus' })
        .setTimestamp();

    const payload = {
        embeds: [embed],
        components: [confirmationRow(customId)],
        allowedMentions: SAFE_MENTIONS
    };
    const sentMsg = isSlash
        ? await context.reply({ ...payload, fetchReply: true })
        : await context.reply(payload);

    const collector = sentMsg.createMessageComponentCollector({
        filter: i => i.customId === customId && i.user.id === moderator.id,
        time: CONFIRM_TIMEOUT,
        max: 1
    });

    collector.on('collect', async i => {
        try {
            await i.deferUpdate();
            await sentMsg.edit({ components: [confirmationRow(customId, true)] }).catch(() => {});

            const currentModerator = await context.guild.members.fetch(moderator.id).catch(() => null);
            const currentTarget = await context.guild.members.fetch(targetMember.id).catch(() => null);
            if (!currentModerator || !currentTarget) {
                await sentMsg.reply({
                    content: '❌ Não foi possível confirmar os cargos atuais do moderador e do membro. Nenhum banimento foi executado.',
                    allowedMentions: SAFE_MENTIONS
                });
                return;
            }

            const check = moderatorCanBan(currentModerator, currentTarget, context.guild);
            if (!check.ok) {
                await sentMsg.reply({ content: `❌ ${check.error}`, allowedMentions: SAFE_MENTIONS });
                return;
            }

            await currentTarget.ban({
                reason: `${reason} · por ${moderator.tag}`.slice(0, 512)
            });

            const success = new EmbedBuilder()
                .setColor(0x22C55E)
                .setTitle('✅ Banimento concluído')
                .setDescription(`<@${targetMember.id}> foi banido do servidor.`)
                .addFields({ name: '📝 Motivo', value: reason.slice(0, 400) })
                .setFooter({ text: 'Aeternus • Registro de moderação' })
                .setTimestamp();

            await sentMsg.reply({ embeds: [success], allowedMentions: SAFE_MENTIONS });
        } catch (error) {
            console.error('[ban] Falha ao banir:', error?.message || error);
            await sentMsg.reply({
                content: '❌ Não consegui concluir o banimento. Confira as permissões e a hierarquia do Aeternus.',
                allowedMentions: SAFE_MENTIONS
            }).catch(() => {});
        }
    });

    collector.on('end', async (_collected, endReason) => {
        await sentMsg.edit({ components: [confirmationRow(customId, true)] }).catch(() => {});
        if (endReason === 'time') {
            await sentMsg.reply({
                content: '⏳ A confirmação do banimento expirou. Nenhuma ação foi executada.',
                allowedMentions: SAFE_MENTIONS
            }).catch(() => {});
        }
    });
}

module.exports = {
    name: 'ban',
    aliases: ['banir'],
    description: 'Banir membro',
    data: new SlashCommandBuilder()
        .setName('banir')
        .setDescription('Banir membro')
        .addUserOption(o =>
            o.setName('usuario')
                .setDescription('Membro que será banido')
                .setRequired(true)
        )
        .addStringOption(o =>
            o.setName('motivo')
                .setDescription('Motivo do banimento (opcional)')
                .setRequired(false)
                .setMaxLength(400)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

    async execute(message, args) {
        const moderator = message.member;
        if (!moderator?.permissions?.has(PermissionFlagsBits.BanMembers)) {
            return message.reply({ content: '❌ Você não tem a permissão **Banir membros**.', allowedMentions: SAFE_MENTIONS });
        }

        const member = resolveMember(message, args);
        if (!member) {
            return message.reply({ content: '❌ Mencione o membro ou informe um ID válido.', allowedMentions: SAFE_MENTIONS });
        }

        const check = moderatorCanBan(moderator, member, message.guild);
        if (!check.ok) {
            return message.reply({ content: `❌ ${check.error}`, allowedMentions: SAFE_MENTIONS });
        }

        const reason = reasonFrom(args, Boolean(message.mentions.members.first()));
        return handleBanProcess(message, moderator, member, reason, false);
    },

    async executeSlash(i) {
        if (!i.inGuild()) {
            return i.reply({ content: '❌ Este comando só pode ser usado dentro de um servidor.', ephemeral: true });
        }

        const moderator = await i.guild.members.fetch(i.user.id).catch(() => null);
        if (!moderator) {
            return i.reply({ content: '❌ Não consegui verificar suas permissões neste servidor.', ephemeral: true });
        }
        if (!moderator.permissions.has(PermissionFlagsBits.BanMembers)) {
            return i.reply({ content: '❌ Você não tem a permissão **Banir membros**.', ephemeral: true });
        }

        const user = i.options.getUser('usuario', true);
        const reason = sanitizeReason(i.options.getString('motivo'));
        const member = await i.guild.members.fetch(user.id).catch(() => null);
        if (!member) {
            return i.reply({ content: '❌ Membro não encontrado neste servidor.', ephemeral: true });
        }

        const check = moderatorCanBan(moderator, member, i.guild);
        if (!check.ok) {
            return i.reply({ content: `❌ ${check.error}`, ephemeral: true });
        }

        return handleBanProcess(i, moderator, member, reason, true);
    }
};
