const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    MessageFlags
} = require('discord.js');
const gifs = require('./gifs');
const actionStats = require('./actionStats');

const ACTIONS = {};

function register(def) {
    ACTIONS[def.name] = def;
    return {
        name: def.name,
        aliases: def.aliases || [],
        description: def.description || def.name,
        category: 'interacao',
        slash: false,
        noSlash: true,
        async execute(message) {
            await run(message, def, {});
        },
        async executeSlash(interaction) {
            const target = interaction.options?.getUser?.('usuario');
            const fake = {
                author: interaction.user,
                client: interaction.client,
                guild: interaction.guild,
                channel: interaction.channel,
                mentions: { users: { first: () => target || null } },
                reply: (payload) => interaction.reply(payload)
            };
            await run(fake, def, { forcedTarget: target || null });
        },
        async handleComponent(interaction) {
            const parts = String(interaction.customId || '').split(':');

            let actionName;
            let fromId;
            let toId;

            if (parts[0] === 'act' && parts[1] === 'devolver') {
                actionName = parts[2];
                fromId = parts[3];
                toId = parts[4];
            } else if (parts[1] === 'devolver') {
                actionName = parts[0];
                fromId = parts[2];
                toId = parts[3];
            } else {
                return;
            }

            if (interaction.user.id !== fromId) {
                return interaction.reply({
                    content: 'Só quem **recebeu** pode devolver.',
                    flags: MessageFlags.Ephemeral
                });
            }

            const actionDef = ACTIONS[actionName] || def;
            const fromUser = await interaction.client.users
                .fetch(fromId)
                .catch(() => interaction.user);
            const toUser = await interaction.client.users.fetch(toId).catch(() => null);

            if (!toUser) {
                return interaction.reply({
                    content: 'Usuário inválido.',
                    flags: MessageFlags.Ephemeral
                });
            }

            try {
                const disabled = ActionRowBuilder.from(interaction.message.components[0]).setComponents(
                    ButtonBuilder.from(interaction.message.components[0].components[0]).setDisabled(true)
                );
                await interaction.update({ components: [disabled] }).catch(() => {});
            } catch (_) {}

            const fake = {
                author: fromUser,
                client: interaction.client,
                guild: interaction.guild,
                channel: interaction.channel,
                mentions: { users: { first: () => toUser } },
                reply: (payload) => interaction.followUp(payload)
            };

            await run(fake, actionDef, { forcedTarget: toUser, isReturn: true });
        }
    };
}

async function pickGif(def) {
    const key = def.gif || def.name;
    try {
        if (typeof gifs.pickAsync === 'function') {
            const a = await gifs.pickAsync(key);
            if (a) return a;
        }
    } catch (e) {
        console.warn('[interaction] pickAsync', key, e.message);
    }
    try {
        const b = gifs.pick(key);
        if (b) return b;
    } catch (_) {}
    // último recurso matar
    if (String(key).toLowerCase() === 'kill' || String(key).toLowerCase() === 'matar') {
        if (Array.isArray(gifs.KILL_LOCAL) && gifs.KILL_LOCAL.length) {
            return gifs.KILL_LOCAL[Math.floor(Math.random() * gifs.KILL_LOCAL.length)];
        }
    }
    return null;
}

async function run(message, def, opts) {
    const author = message.author;
    let target = opts.forcedTarget || message.mentions?.users?.first?.() || null;

    if (!target && !def.solo) {
        return message.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(def.color || 0xf472b6)
                    .setTitle((def.returnEmoji || '✨') + '  ' + def.name)
                    .setDescription('Mencione alguém (ex.: `O.' + def.name + ' @user`).')
            ]
        });
    }
    if (target && target.id === author.id && !def.allowSelf) {
        return message.reply(def.selfMsg || 'Não pode usar em si mesmo.');
    }

    const gif = await pickGif(def);
    const text = target
        ? (def.target || '{author} → {target}')
              .replace(/{author}/g, '**' + author.username + '**')
              .replace(/{target}/g, '**' + target.username + '**')
        : (def.solo || '{author}').replace(/{author}/g, '**' + author.username + '**');

    const embed = new EmbedBuilder()
        .setColor(def.color || 0xf472b6)
        .setAuthor({
            name: String(author.username),
            iconURL: author.displayAvatarURL({ size: 64 })
        })
        .setDescription(text)
        .setTimestamp();

    if (gif) {
        embed.setImage(gif);
    } else {
        console.warn('[interaction] sem GIF para', def.name, def.gif);
    }

    if (target) embed.setThumbnail(target.displayAvatarURL({ size: 64 }));

    const content = target ? author.toString() + ' ➜ ' + target.toString() : author.toString();
    const components = [];

    if (target && !target.bot) {
        components.push(
            new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(def.name + ':devolver:' + target.id + ':' + author.id)
                    .setLabel(def.returnLabel || 'Devolver')
                    .setEmoji(def.returnEmoji || '🔁')
                    .setStyle(ButtonStyle.Secondary)
            )
        );
    }

    await message.reply({ content, embeds: [embed], components });

    try {
        actionStats.add(def.name, author.id, message.guild?.id);
    } catch (_) {}

    if (target?.bot && !opts.isReturn) {
        setTimeout(async () => {
            try {
                const replyGif = await pickGif(def);
                const botText = (def.botReply || '{bot} devolveu para {author}!')
                    .replace(/{bot}/g, '**' + target.username + '**')
                    .replace(/{author}/g, '**' + author.username + '**');
                const botEmbed = new EmbedBuilder()
                    .setColor(def.color || 0xf472b6)
                    .setDescription(botText)
                    .setTimestamp();
                if (replyGif) botEmbed.setImage(replyGif);

                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId(def.name + ':devolver:' + author.id + ':' + target.id)
                        .setLabel(def.returnLabel || 'Devolver')
                        .setEmoji(def.returnEmoji || '🔁')
                        .setStyle(ButtonStyle.Secondary)
                );

                await message.channel.send({
                    content: target.toString() + ' ➜ ' + author.toString(),
                    embeds: [botEmbed],
                    components: [row]
                });
            } catch (e) {
                console.warn('[interaction]', e.message);
            }
        }, 900);
    }
}

module.exports = { register, ACTIONS, pickGif };
