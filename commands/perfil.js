const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    SlashCommandBuilder
} = require('discord.js');
const flocos = require('../utils/flocos');
const cristais = require('../utils/cristais');
const bank = require('../utils/bank');
const xp = require('../utils/xp');
const shop = require('../utils/shop');
const profile = require('../utils/profile');
const snapshot = require('../utils/userSnapshot');

function fmt(n) {
    return Number(n || 0).toLocaleString('pt-BR');
}

/** Banner padrão (imagem real, URL pública — Discord carrega) */
function defaultBanner() {
    const q = encodeURIComponent(
        'aesthetic blue purple gradient soft abstract waves profile banner no text high quality'
    );
    return `https://image.pollinations.ai/prompt/${q}?width=960&height=360&nologo=true&seed=77&model=flux`;
}

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

function buildEmbed(target, guild) {
    const x = xp.get(target.id);
    const inv = shop.getInv(target.id);
    const dec = shop.getEquippedDecoration(target.id);
    const title = shop.getEquippedTitle(target.id);
    const p = profile.get(target.id);

    let remain = x.xp;
    for (let lv = 0; lv < x.level; lv++) remain -= xp.xpForLevel(lv);
    if (remain < 0) remain = 0;
    const xpNeed = xp.xpForLevel(x.level);

    const about =
        p.aboutMe?.trim() ||
        'Ainda sem biografia… Use **Alterar Sobre Mim**.';

    // Imagem de fundo = decoração comprada (URL pública) — assim o Discord mostra
    const banner = dec?.image || defaultBanner();

    const embed = new EmbedBuilder()
        .setColor(0x6366f1)
        .setAuthor({
            name: target.username,
            iconURL: target.displayAvatarURL({ size: 128 })
        })
        .setTitle(title ? `👑 ${title}` : '✨ Perfil Aeternus')
        .setDescription(
            [
                dec ? `🖼️ **Background:** ${dec.name}` : '🖼️ Background padrão',
                guild ? `🏠 **${guild.name}**` : null,
                '',
                '━━━━━━━━━━━━━━━━━━━━',
                '**📝 Sobre Mim**',
                about,
                '━━━━━━━━━━━━━━━━━━━━'
            ]
                .filter(Boolean)
                .join('\n')
        )
        // “cards” separados — cada field é um bloco
        .addFields(
            {
                name: '⭐ Nível',
                value: `**${x.level}**\n\`${Math.floor(remain)} / ${xpNeed} XP\``,
                inline: true
            },
            {
                name: '❄️ Flocos',
                value: `**${fmt(flocos.get(target.id))}**\ncarteira`,
                inline: true
            },
            {
                name: '💠 Cristais',
                value: `**${fmt(cristais.get(target.id))}**\npremium`,
                inline: true
            },
            {
                name: '🏦 Banco',
                value: `**${fmt(bank.get(target.id))}**\nguardado`,
                inline: true
            },
            {
                name: '🎒 Coleção',
                value: `**${inv.owned.length}** itens`,
                inline: true
            },
            {
                name: '🎨 Decoração',
                value: dec ? `**${dec.name}**` : '_nenhuma_',
                inline: true
            }
        )
        .setThumbnail(target.displayAvatarURL({ size: 256 }))
        // FUNDO / BANNER — imagem real na mensagem
        .setImage(banner)
        .setFooter({
            text: dec
                ? `Background equipado · ${dec.name}`
                : 'Compre backgrounds em Decorações · O.loja'
        })
        .setTimestamp();

    return embed;
}

async function showProfile(ctx, target) {
    const isSlash = Boolean(ctx.isChatInputCommand && ctx.isChatInputCommand());
    const viewer = ctx.user || ctx.author;
    const isOwner = viewer.id === target.id;

    snapshot.captureFromLive(target.id, {
        username: target.username,
        avatarURL: target.displayAvatarURL({ extension: 'png', size: 128 })
    });

    const payload = {
        embeds: [buildEmbed(target, ctx.guild)],
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
    description: 'Perfil com banner e cards de info',
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
            // mostra o perfil atualizado já com a nova imagem
            return interaction.update({
                content: null,
                embeds: [buildEmbed(interaction.user, interaction.guild)],
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
            avatarURL: interaction.user.displayAvatarURL({ extension: 'png', size: 128 }),
            aboutMe: text
        });
        await interaction.reply({
            content: '✅ **Sobre Mim** atualizado!',
            embeds: [buildEmbed(interaction.user, interaction.guild)],
            components: buttons(interaction.guild?.id, true),
            ephemeral: true
        });
        return true;
    }
};
