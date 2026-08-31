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
const invites = require('../utils/invites');
const shop = require('../utils/shop');
const profile = require('../utils/profile');

function fmt(n) {
    return Number(n || 0).toLocaleString('pt-BR');
}

function defaultBanner() {
    const q = encodeURIComponent(
        'cute doodle pattern blue gradient soft icons stars hearts kawaii aesthetic banner seamless, no text'
    );
    return `https://image.pollinations.ai/prompt/${q}?width=960&height=360&nologo=true&seed=42&model=flux`;
}

function buildEmbed(target, guild) {
    const x = xp.get(target.id);
    const inv = shop.getInv(target.id);
    const dec = shop.getEquippedDecoration(target.id);
    const title = shop.getEquippedTitle(target.id);
    const p = profile.get(target.id);
    const invStats = guild ? invites.getStats(guild.id, target.id) : { total: 0 };
    const xpNeed = xp.xpForLevel(x.level);
    let remain = x.xp;
    for (let lv = 0; lv < x.level; lv++) remain -= xp.xpForLevel(lv);
    if (remain < 0) remain = 0;

    const about =
        p.aboutMe ||
        'Ainda sem biografia… Use o botão **Alterar Sobre Mim** para escrever a sua!';

    const banner = dec?.image || defaultBanner();

    return new EmbedBuilder()
        .setColor(0x3b82f6)
        .setAuthor({
            name: target.username,
            iconURL: target.displayAvatarURL({ size: 128 })
        })
        .setDescription(
            [
                title ? `👑 **${title}**` : null,
                `⭐ **Nível ${x.level}** · ${Math.floor(remain)} / ${xpNeed} XP`,
                guild ? `🏆 **${guild.name}**` : null,
                '',
                `❄️ **${fmt(flocos.get(target.id))}**  ·  💠 **${fmt(cristais.get(target.id))}**  ·  🏦 **${fmt(bank.get(target.id))}**`,
                `🎒 Coleção **${inv.owned.length}**` +
                    (guild ? `  ·  📩 Convites **${invStats.total}**` : ''),
                '',
                '**Sobre Mim**',
                about
            ]
                .filter((l) => l !== null)
                .join('\n')
        )
        .setThumbnail(target.displayAvatarURL({ size: 256 }))
        .setImage(banner)
        .setFooter({
            text: dec
                ? `Background: ${dec.name} · Aeternus`
                : 'Background padrão · compre em Decorações'
        })
        .setTimestamp();
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

async function showProfile(ctx, target) {
    const isSlash = Boolean(ctx.isChatInputCommand && ctx.isChatInputCommand());
    const viewer = ctx.user || ctx.author;
    const isOwner = viewer.id === target.id;
    const guild = ctx.guild;

    const payload = {
        embeds: [buildEmbed(target, guild)],
        components: buttons(guild?.id, isOwner)
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
    description: 'Perfil com banner, sobre mim e botões',
    data: new SlashCommandBuilder()
        .setName('perfil')
        .setDescription('Mostra o perfil estilo card')
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
                    content: `Você ainda não tem backgrounds.\nCompre aqui: ${shop.decorPanelUrl(interaction.guild?.id)}`,
                    ephemeral: true
                });
            }
            const menu = new StringSelectMenuBuilder()
                .setCustomId('perfil:equipbg')
                .setPlaceholder('Escolha um background da sua coleção…')
                .addOptions(
                    owned.slice(0, 25).map((d) => ({
                        label: d.name.slice(0, 100),
                        value: d.id,
                        description: (d.desc || 'Background').slice(0, 100)
                    }))
                );
            return interaction.reply({
                content: '🖼️ **Seus backgrounds** — selecione para aplicar no perfil:',
                components: [new ActionRowBuilder().addComponents(menu)],
                ephemeral: true
            });
        }

        if (id === 'perfil:equipbg') {
            const itemId = interaction.values?.[0];
            const result = shop.equip(interaction.user.id, itemId);
            if (!result.ok) {
                return interaction.reply({ content: `❌ ${result.error}`, ephemeral: true });
            }
            return interaction.update({
                content: `✅ Background **${result.item.name}** equipado! Use \`O.perfil\` para ver.`,
                components: [],
                embeds: []
            });
        }
    },

    async handleModal(interaction) {
        if (interaction.customId !== 'perfil:aboutmodal') return false;
        const text = interaction.fields.getTextInputValue('about');
        profile.setAboutMe(interaction.user.id, text);

        await interaction.reply({
            content: '✅ **Sobre Mim** atualizado!',
            embeds: [buildEmbed(interaction.user, interaction.guild)],
            components: buttons(interaction.guild?.id, true),
            ephemeral: true
        });
        return true;
    }
};
