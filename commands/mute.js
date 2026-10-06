const { EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

function resolveMember(message, args) {
    const m = message.mentions.members.first();
    if (m) return m;
    const id = String(args[0] || '').replace(/\D/g, '');
    if (id) return message.guild.members.cache.get(id) || null;
    return null;
}

function parseDuration(str) {
    if (!str) return 10 * 60 * 1000;
    const num = parseInt(str);
    if (isNaN(num)) return 10 * 60 * 1000;
    if (str.includes('h')) return num * 60 * 60 * 1000;
    if (str.includes('d')) return num * 24 * 60 * 60 * 1000;
    return num * 60 * 1000;
}

async function handleMuteProcess(context, moderator, targetMember, durationMs, reason, isSlash = false) {
    const normalBtnId = `mute_normal_${moderator.id}_${Date.now()}`;
    const silentBtnId = `mute_silent_${moderator.id}_${Date.now()}`;

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(normalBtnId)
            .setLabel('Confirmar silêncio')
            .setEmoji('✅')
            .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
            .setCustomId(silentBtnId)
            .setLabel('Silêncio silencioso')
            .setEmoji('🤫')
            .setStyle(ButtonStyle.Secondary)
    );

    const content = `Nossa, você <@${moderator.id}> vai mutar <@${targetMember.id}> mesmo? Uh... Sendo assim, escolha uma das opções abaixo. Você tem 6 minutos para decidir.`;

    let sentMsg;
    if (isSlash) {
        sentMsg = await context.reply({
            content,
            components: [row],
            fetchReply: true
        });
    } else {
        sentMsg = await context.reply({
            content,
            components: [row]
        });
    }

    const filter = i => (i.customId === normalBtnId || i.customId === silentBtnId) && i.user.id === moderator.id;
    const collector = sentMsg.createMessageComponentCollector({ filter, time: 6 * 60 * 1000, max: 1 });

    collector.on('collect', async i => {
        try {
            // Responde imediatamente à Interaction para evitar DiscordAPIError[10062].
            await i.deferUpdate();

            if (!targetMember.moderatable) {
                return await sentMsg.edit({
                    content: '❌ Não consigo silenciar este membro (cargo mais alto).',
                    components: []
                });
            }

            await targetMember.timeout(durationMs, `${reason} · por ${moderator.tag}`);

            const isSilent = i.customId === silentBtnId;
            const successText = isSilent
                ? `---------- 🤫 O usuário <@${targetMember.id}> foi silenciado silenciosamente, mas quem manda quebrar las regras né!!`
                : `---------- 🔇 O usuário <@${targetMember.id}> foi silenciado com sucesso, mas quem manda quebrar las regras né!!`;

            await sentMsg.edit({
                content: successText,
                components: []
            });
        } catch (e) {
            try {
                await sentMsg.edit({
                    content: '❌ Não consegui silenciar o usuário.',
                    components: []
                });
            } catch (_) {}

            console.error('[mute] Erro ao processar confirmação:', e);
        }
    });
    collector.on('end', async (collected, reasonCollected) => {
        if (reasonCollected === 'time') {
            try {
                await sentMsg.edit({ content: '⏳ Tempo esgotado para confirmar o silenciamento.', components: [] });
            } catch (_) {}
        }
    });
}

module.exports = {
    name: 'mute',
    aliases: ['mutar', 'timeout', 'silenciar'],
    description: 'Silenciar membro',
    data: new SlashCommandBuilder()
        .setName('mutar-membro')
        .setDescription('Silenciar membro')
        .addUserOption((o) => o.setName('usuario').setDescription('Membro').setRequired(true))
        .addStringOption((o) => o.setName('tempo').setDescription('Duração (ex: 10m, 1h)').setRequired(false))
        .addStringOption((o) => o.setName('motivo').setDescription('Motivo').setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    async execute(message, args) {
        if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
            return message.reply('❌ Sem permissão.');
        }
        const member = resolveMember(message, args);
        if (!member) return message.reply('❌ Mencione o membro ou informe o ID.');
        if (member.id === message.author.id) return message.reply('❌ Você não pode se mutar.');
        if (member.id === message.client.user.id) return message.reply('❌ Não posso me mutar.');
        if (!member.moderatable) return message.reply('❌ Não consigo silenciar este membro (cargo mais alto).');

        const hasMention = !!message.mentions.members.first();
        const timeArg = args[hasMention ? 1 : 1];
        const durationMs = parseDuration(timeArg);
        const reason = args.slice(hasMention ? 2 : 2).join(' ').trim() || 'Sem motivo';

        await handleMuteProcess(message, message.author, member, durationMs, reason, false);
    },

    async executeSlash(i) {
        if (!i.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
            return i.reply({ content: '❌ Sem permissão.', ephemeral: true });
        }
        const user = i.options.getUser('usuario', true);
        const timeStr = i.options.getString('tempo');
        const reason = i.options.getString('motivo') || 'Sem motivo';
        
        const member = await i.guild.members.fetch(user.id).catch(() => null);
        if (!member) return i.reply({ content: '❌ Membro não encontrado.', ephemeral: true });
        if (member.id === i.user.id) return i.reply({ content: '❌ Você não pode se mutar.', ephemeral: true });
        if (member.id === i.client.user.id) return i.reply({ content: '❌ Não posso me mutar.', ephemeral: true });
        if (!member.moderatable) {
            return i.reply({ content: '❌ Não consigo silenciar este membro (cargo mais alto).', ephemeral: true });
        }

        const durationMs = parseDuration(timeStr);
        await handleMuteProcess(i, i.user, member, durationMs, reason, true);
    }
};
