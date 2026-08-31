const {
    EmbedBuilder,
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
const flocos = require('../utils/flocos');
const cristais = require('../utils/cristais');
const bank = require('../utils/bank');
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
                .setLabel('Alterar Background')
                .setEmoji('🖼️')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(!isOwner),
            new ButtonBuilder()
                .setLabel('Loja de Decorações')
                .setEmoji('🛍️')
                .setStyle(ButtonStyle.Link)
                .setURL(decorUrl)
        )
    ];
}

function buildCardData(target) {
    const x = xp.get(target.id);
    const dec = shop.getEquippedDecoration(target.id);
    const p = profile.get(target.id);
    let remain = x.xp;
    for (let lv = 0; lv < x.level; lv++) remain -= xp.xpForLevel(lv);
    if (remain < 0) remain = 0;

    return {
        username: target.username,
        avatarURL: target.displayAvatarURL({ extension: 'png', size: 128 }),
        title: shop.getEquippedTitle(target.id) || 'Membro',
        aboutMe: p.aboutMe || 'Ainda sem biografia… Use Alterar Sobre Mim.',
        level: x.level,
        xpRemain: Math.floor(remain),
        xpNeed: xp.xpForLevel(x.level),
        flocos: flocos.get(target.id),
        cristais: cristais.get(target.id),
        bank: bank.get(target.id),
        bgImage: dec?.image || null,
        decorationName: dec?.name || 'Padrão'
    };
}

async function showProfile(ctx, target) {
    const isSlash = Boolean(ctx.isChatInputCommand && ctx.isChatInputCommand());
    const viewer = ctx.user || ctx.author;
    const isOwner = viewer.id === target.id;

    // snapshot 10 dias (Mongo/arquivo) — painel e pós-deploy
    snapshot.captureFromLive(target.id, {
        username: target.username,
        avatarURL: target.displayAvatarURL({ extension: 'png', size: 128 })
    });

    const data = buildCardData(target);
    const buf = profileCard.render(data);
    const file = new AttachmentBuilder(buf, { name: 'perfil.png' });
    // Discord aceita SVG como attachment; extensão .png às vezes ajuda no mobile
    // preferir .svg para fidelidade
    const fileSvg = new AttachmentBuilder(buf, { name: 'perfil.svg' });

    const embed = new EmbedBuilder()
        .setColor(0x6366f1)
        .setImage('attachment://perfil.svg')
        .setFooter({ text: 'Card com fundo + seções · dados salvos 10 dias' });

    const payload = {
        embeds: [embed],
        files: [fileSvg],
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
    description: 'Perfil em card com fundo e seções',
    data: new SlashCommandBuilder()
        .setName('perfil')
        .setDescription('Mostra o perfil em card')
        .addUserOption((o) =>
            o.setName('usuario').setDescription('Usuário').setRequired(false)
        ),

    async execute(message) {
        await showProfile(message, message.mentions.users.first() || message.author);
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
                .setPlaceholder('Background da coleção…')
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
            snapshot.captureFromLive(interaction.user.id, {
                username: interaction.user.username,
                avatarURL: interaction.user.displayAvatarURL({ extension: 'png', size: 128 })
            });
            return interaction.update({
                content: `✅ Background **${result.item.name}** equipado! Use \`O.perfil\`.`,
                components: []
            });
        }
    },

    async handleModal(interaction) {
        if (interaction.customId !== 'perfil:aboutmodal') return false;
        const text = interaction.fields.getTextInputValue('about');
        profile.setAboutMe(interaction.user.id, text);
        snapshot.captureFromLive(interaction.user.id, {
            username: interaction.user.username,
            avatarURL: interaction.user.displayAvatarURL({ extension: 'png', size: 128 }),
            aboutMe: text
        });
        await interaction.reply({
            content: '✅ Sobre Mim salvo (10 dias no banco). Use `O.perfil` para ver o card.',
            ephemeral: true
        });
        return true;
    }
};
