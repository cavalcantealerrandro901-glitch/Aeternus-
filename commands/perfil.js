const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    AttachmentBuilder,
    SlashCommandBuilder
} = require('discord.js');
const xp = require('../utils/xp');
const shop = require('../utils/shop');
const profile = require('../utils/profile');
const profileCard = require('../utils/profileCard');
const snapshot = require('../utils/userSnapshot');

function buttons(guildId, isOwner) {
    const decorUrl = shop.decorPanelUrl(guildId);
    return [
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('perfil:about')
                .setLabel('Alterar Sobre Mim')
                .setEmoji('📝')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(!isOwner),
            new ButtonBuilder()
                .setCustomId('perfil:bg')
                .setLabel('Background')
                .setEmoji('🖼️')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(!isOwner),
            new ButtonBuilder()
                .setLabel('Decorações')
                .setEmoji('🛍️')
                .setStyle(ButtonStyle.Link)
                .setURL(decorUrl)
        )
    ];
}

async function buildCardBuffer(target) {
    const x = xp.get(target.id);
    const dec = shop.getEquippedDecoration(target.id);
    const p = profile.get(target.id);

    let remain = x.xp;
    for (let lv = 0; lv < x.level; lv++) remain -= xp.xpForLevel(lv);
    if (remain < 0) remain = 0;

    return profileCard.render({
        userId: target.id,
        username: target.username,
        avatarURL: target.displayAvatarURL({ extension: 'png', size: 256 }),
        aboutMe: p.aboutMe || 'Ainda sem biografia…',
        level: x.level,
        xpRemain: Math.floor(remain),
        xpNeed: xp.xpForLevel(x.level),
        bgImage: dec?.image || null,
        love: profileCard.loveTypeFor(target.id)
    });
}

async function showProfile(ctx, target) {
    const isSlash = Boolean(ctx.isChatInputCommand && ctx.isChatInputCommand());
    const viewer = ctx.user || ctx.author;
    const isOwner = viewer.id === target.id;

    snapshot.captureFromLive(target.id, {
        username: target.username,
        avatarURL: target.displayAvatarURL({ extension: 'png', size: 128 })
    });

    if (isSlash && !ctx.deferred && !ctx.replied) {
        await ctx.deferReply().catch(() => {});
    }

    const buf = await buildCardBuffer(target);
    const file = new AttachmentBuilder(buf, { name: 'perfil.svg' });

    // SEM embed — só a imagem/card + botões
    const payload = {
        content: '',
        files: [file],
        components: buttons(ctx.guild?.id, isOwner)
    };

    if (isSlash) {
        if (ctx.deferred || ctx.replied) return ctx.editReply(payload);
        return ctx.reply(payload);
    }
    return ctx.reply(payload);
}

module.exports = {
    name: 'perfil',
    aliases: ['profile', 'eu'],
    description: 'Card de perfil (só imagem)',
    data: new SlashCommandBuilder()
        .setName('perfil')
        .setDescription('Mostra o perfil em card')
        .addUserOption((o) =>
            o.setName('usuario').setDescription('Usuário').setRequired(false)
        ),

    async execute(message) {
        const target = message.mentions.users.first() || message.author;
        const wait = await message.reply('🖼️ Montando card…');
        try {
            snapshot.captureFromLive(target.id, {
                username: target.username,
                avatarURL: target.displayAvatarURL({ extension: 'png', size: 128 })
            });
            const buf = await buildCardBuffer(target);
            const file = new AttachmentBuilder(buf, { name: 'perfil.svg' });
            const isOwner = message.author.id === target.id;
            await wait.edit({
                content: null,
                files: [file],
                components: buttons(message.guild?.id, isOwner)
            });
        } catch (e) {
            console.error('[perfil]', e);
            await wait.edit('❌ Não consegui gerar o card.').catch(() => {});
        }
    },

    async executeSlash(interaction) {
        await showProfile(
            interaction,
            interaction.options.getUser('usuario') || interaction.user
        );
    },

    async handleComponent(interaction) {
        const id = interaction.customId;

        if (id === 'perfil:about') {
            const modal = new ModalBuilder()
                .setCustomId('perfil:aboutmodal')
                .setTitle('Alterar Sobre Mim');
            const input = new TextInputBuilder()
                .setCustomId('about')
                .setLabel('Sua biografia (máx. 200)')
                .setStyle(TextInputStyle.Paragraph)
                .setMaxLength(200)
                .setRequired(true)
                .setValue(profile.get(interaction.user.id).aboutMe || '');
            modal.addComponents(new ActionRowBuilder().addComponents(input));
            return interaction.showModal(modal);
        }

        if (id === 'perfil:bg') {
            const owned = shop.ownedDecorations(interaction.user.id);
            if (!owned.length) {
                return interaction.reply({
                    content: `Sem backgrounds. Compre: ${shop.decorPanelUrl(interaction.guild?.id)}`,
                    ephemeral: true
                });
            }
            const menu = new StringSelectMenuBuilder()
                .setCustomId('perfil:equipbg')
                .setPlaceholder('Background…')
                .addOptions(
                    owned.slice(0, 25).map((d) => ({
                        label: d.name.slice(0, 100),
                        value: d.id,
                        description: (d.desc || '').slice(0, 100)
                    }))
                );
            return interaction.reply({
                content: '🖼️ Escolha o background:',
                components: [new ActionRowBuilder().addComponents(menu)],
                ephemeral: true
            });
        }

        if (id === 'perfil:equipbg') {
            const result = shop.equip(interaction.user.id, interaction.values?.[0]);
            if (!result.ok) {
                return interaction.reply({ content: `❌ ${result.error}`, ephemeral: true });
            }
            await interaction.update({ content: '✅ Background equipado! Gerando card…', components: [] });
            const buf = await buildCardBuffer(interaction.user);
            const file = new AttachmentBuilder(buf, { name: 'perfil.svg' });
            return interaction.followUp({
                files: [file],
                components: buttons(interaction.guild?.id, true)
            });
        }
    },

    async handleModal(interaction) {
        if (interaction.customId !== 'perfil:aboutmodal') return false;
        const text = interaction.fields.getTextInputValue('about');
        profile.setAboutMe(interaction.user.id, text);
        snapshot.captureFromLive(interaction.user.id, {
            username: interaction.user.username,
            aboutMe: text
        });

        await interaction.deferReply({ ephemeral: true });
        const buf = await buildCardBuffer(interaction.user);
        const file = new AttachmentBuilder(buf, { name: 'perfil.svg' });
        await interaction.editReply({
            content: '✅ Sobre Mim atualizado!',
            files: [file]
        });
        return true;
    }
};
