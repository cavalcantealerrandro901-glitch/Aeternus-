
async function safeUpdate(interaction, payload) {
    try {
        if (interaction.deferred || interaction.replied) {
            return await interaction.editReply(payload);
        }
        return await interaction.update(payload);
    } catch (e) {
        if (e && (e.code === 10062 || e.code === 40060)) return null;
        try {
            if (!interaction.replied && !interaction.deferred) {
                return await interaction.reply(
                    typeof payload === 'object'
                        ? { ...payload, ephemeral: true }
                        : { content: String(payload), ephemeral: true }
                );
            }
        } catch (_) {}
        return null;
    }
}

async function safeReply(interaction, payload) {
    try {
        const data =
            typeof payload === 'string'
                ? { content: payload, ephemeral: true }
                : { ephemeral: true, ...payload };
        if (interaction.deferred || interaction.replied) {
            return await interaction.followUp(data);
        }
        return await interaction.reply(data);
    } catch (e) {
        if (e && (e.code === 10062 || e.code === 40060)) return null;
        return null;
    }
}

const {
    EmbedBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    ButtonBuilder,
    ButtonStyle,
    MessageFlags,
    AttachmentBuilder,
    SlashCommandBuilder,
    ApplicationCommandOptionType
} = require('discord.js');
const player = require('../utils/player');
const xp = require('../utils/xp');

const drafts = new Map();
const photoWait = new Map();

const ATTR_META = [
    { key: 'forca', label: 'Força', emoji: '⚔️' },
    { key: 'agilidade', label: 'Agilidade', emoji: '💨' },
    { key: 'inteligencia', label: 'Inteligência', emoji: '🧠' },
    { key: 'vitalidade', label: 'Vitalidade', emoji: '❤️' },
    { key: 'sorte', label: 'Sorte', emoji: '🍀' }
];

function getClassName(userId) {
    try {
        const classesMod = require('../utils/classes');
        if (typeof classesMod.getClass === 'function') {
            const c = classesMod.getClass(userId);
            return c?.name || c?.id || '—';
        }
    } catch (_) {}
    return '—';
}

function buildProfileEmbed(user, profile) {
    const emb = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle(`Personagem — ${user.username}`)
        .setThumbnail(profile?.avatar || user.displayAvatarURL({ size: 256 }));

    let eterBal = 0;
    let cristaisBal = 0;
    try {
        eterBal = require('../utils/eter').get(user.id) || 0;
    } catch (_) {}
    try {
        cristaisBal = require('../utils/cp').get(user.id) || 0;
    } catch (_) {
        try {
            const cristais = require('../utils/cristais');
            cristaisBal = typeof cristais.get === 'function' ? cristais.get(user.id) : 0;
        } catch (_) {}
    }

    let guildName = '—';
    try {
        const g = require('../utils/guilds').findByMember(user.id);
        if (g) guildName = g.name || g.id || '—';
    } catch (_) {}

    const attrs = profile?.attrs || profile?.atributos || {};
    const attrLines = ATTR_META.map(
        (a) => `${a.emoji} **${a.label}:** ${attrs[a.key] ?? attrs[a.label] ?? 0}`
    ).join('\n');

    emb.addFields(
        { name: 'Classe', value: String(getClassName(user.id)), inline: true },
        { name: 'Guilda', value: String(guildName), inline: true },
        { name: 'Nível', value: String(profile?.level || xp.getLevel?.(user.id) || 1), inline: true },
        { name: 'Éter', value: String(eterBal), inline: true },
        { name: 'Cristais', value: String(cristaisBal), inline: true },
        { name: 'Atributos', value: attrLines || '—', inline: false }
    );
    emb.setFooter({ text: 'O.j criar · O.j atributos · O.j foto' });
    return emb;
}

module.exports = {
    name: 'j',
    aliases: ['personagem', 'char', 'perfil-rpg'],
    description: 'Cria e gerencia o personagem (classe, foto, atributos)',
    category: 'rpg',
    data: new SlashCommandBuilder()
        .setName('j')
        .setDescription('Personagem RPG')
        .addStringOption((o) =>
            o
                .setName('acao')
                .setDescription('Ação')
                .addChoices(
                    { name: 'perfil', value: 'perfil' },
                    { name: 'criar', value: 'criar' },
                    { name: 'atributos', value: 'atributos' },
                    { name: 'foto', value: 'foto' }
                )
        ),

    async execute(message, args) {
        const sub = (args[0] || 'perfil').toLowerCase();
        const user = message.author;

        if (sub === 'criar') {
            if (player.has && player.has(user.id)) {
                return message.reply('Você já tem personagem. Use `O.j perfil`.');
            }
            if (typeof player.create === 'function') {
                player.create(user.id, { name: user.username });
                return message.reply('Personagem criado. Use `O.j perfil` e escolha classe com `O.classe`.');
            }
            return message.reply('Sistema de personagem indisponível.');
        }

        if (sub === 'atributos') {
            const p = player.get?.(user.id) || player.load?.(user.id);
            if (!p) return message.reply('Crie o personagem com `O.j criar` primeiro.');
            const emb = new EmbedBuilder()
                .setColor(0x57f287)
                .setTitle('Atributos')
                .setDescription(
                    ATTR_META.map((a) => {
                        const attrs = p.attrs || p.atributos || {};
                        return `${a.emoji} **${a.label}:** ${attrs[a.key] ?? 0}`;
                    }).join('\n')
                );
            return message.reply({ embeds: [emb] });
        }

        if (sub === 'foto') {
            photoWait.set(user.id, Date.now() + 120000);
            return message.reply('Manda a imagem no meu PV em até 2 minutos, ou anexa aqui.');
        }

        const p = player.get?.(user.id) || player.load?.(user.id);
        if (!p) return message.reply('Sem personagem. Use `O.j criar`.');
        return message.reply({ embeds: [buildProfileEmbed(user, p)] });
    },

    async executeSlash(interaction) {
        const sub = interaction.options.getString('acao') || 'perfil';
        const user = interaction.user;

        if (sub === 'criar') {
            if (player.has && player.has(user.id)) {
                return safeReply(interaction, 'Você já tem personagem. Use `/j acao:perfil`.');
            }
            if (typeof player.create === 'function') {
                player.create(user.id, { name: user.username });
                return safeReply(interaction, 'Personagem criado. Use `/j` e `O.classe`.');
            }
            return safeReply(interaction, 'Sistema de personagem indisponível.');
        }

        if (sub === 'atributos') {
            const p = player.get?.(user.id) || player.load?.(user.id);
            if (!p) return safeReply(interaction, 'Crie o personagem com `/j acao:criar` primeiro.');
            const emb = new EmbedBuilder()
                .setColor(0x57f287)
                .setTitle('Atributos')
                .setDescription(
                    ATTR_META.map((a) => {
                        const attrs = p.attrs || p.atributos || {};
                        return `${a.emoji} **${a.label}:** ${attrs[a.key] ?? 0}`;
                    }).join('\n')
                );
            return safeReply(interaction, { embeds: [emb] });
        }

        if (sub === 'foto') {
            photoWait.set(user.id, Date.now() + 120000);
            return safeReply(interaction, 'Manda a imagem no meu PV em até 2 minutos.');
        }

        const p = player.get?.(user.id) || player.load?.(user.id);
        if (!p) return safeReply(interaction, 'Sem personagem. Use `/j acao:criar`.');
        return safeReply(interaction, { embeds: [buildProfileEmbed(user, p)], ephemeral: false });
    }
};
