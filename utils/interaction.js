const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const gifs = require('./gifs');

const ACTIONS = {};

function register(def) {
    ACTIONS[def.name] = def;
    return {
        name: def.name,
        aliases: def.aliases || [],
        description: def.description || def.name,
        async execute(message) {
            await run(message, def, {});
        },
        async handleComponent(interaction) {
            const parts = interaction.customId.split(':');
            if (parts[1] !== 'devolver') return;
            const actionName = parts[2];
            const fromId = parts[3];
            const toId = parts[4];
            if (interaction.user.id !== fromId)
                return interaction.reply({ content: 'Só quem recebeu pode devolver.', ephemeral: true });
            const actionDef = ACTIONS[actionName] || def;
            const fromUser = await interaction.client.users.fetch(fromId).catch(() => interaction.user);
            const toUser = await interaction.client.users.fetch(toId).catch(() => null);
            if (!toUser) return interaction.reply({ content: 'Usuário inválido.', ephemeral: true });
            await interaction.deferUpdate().catch(() => {});
            const fake = {
                author: fromUser,
                client: interaction.client,
                guild: interaction.guild,
                channel: interaction.channel,
                mentions: { users: { first: () => toUser } },
                reply: (p) => interaction.followUp(p)
            };
            await run(fake, actionDef, { forcedTarget: toUser });
        }
    };
}

function pickGif(def) {
    const key = def.gif || def.name;
    return gifs.pick(key);
}

async function run(message, def, opts) {
    const author = message.author;
    let target = opts.forcedTarget || message.mentions?.users?.first?.() || null;
    if (!target && !def.solo) {
        return message.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(def.color || 0xf472b6)
                    .setTitle(`${def.returnEmoji || '✨'}  ${def.name}`)
                    .setDescription(
                        `Mencione alguém:\n\`O.${def.name} @usuario\``
                    )
            ]
        });
    }
    if (target && target.id === author.id && !def.allowSelf)
        return message.reply(def.selfMsg || 'Não pode usar em si mesmo.');

    const gif = pickGif(def);
    const text = target
        ? (def.target || '{author} → {target}')
              .replace(/{author}/g, `**${author.username}**`)
              .replace(/{target}/g, `**${target.username}**`)
        : (def.solo || '{author}').replace(/{author}/g, `**${author.username}**`);

    const embed = new EmbedBuilder()
        .setColor(def.color || 0xf472b6)
        .setAuthor({
            name: `${author.username}`,
            iconURL: author.displayAvatarURL({ size: 64 })
        })
        .setDescription(text)
        .setFooter({ text: `Aeternus · ${gifs.count(def.gif || def.name)}+ GIFs locais` })
        .setTimestamp();
    if (gif) embed.setImage(gif);
    if (target) embed.setThumbnail(target.displayAvatarURL({ size: 64 }));

    const content = target ? `${author} ➜ ${target}` : `${author}`;
    const components = [];
    if (target && !target.bot) {
        components.push(
            new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`act:devolver:${def.name}:${target.id}:${author.id}`)
                    .setLabel(def.returnLabel || 'Devolver')
                    .setEmoji(def.returnEmoji || '🔁')
                    .setStyle(ButtonStyle.Secondary)
            )
        );
    }
    await message.reply({ content, embeds: [embed], components });

    if (target?.bot) {
        setTimeout(async () => {
            try {
                const replyGif = pickGif(def);
                const botText = (def.botReply || '{bot} devolveu para {author}!')
                    .replace(/{bot}/g, `**${target.username}**`)
                    .replace(/{author}/g, `**${author.username}**`);
                const botEmbed = new EmbedBuilder()
                    .setColor(def.color || 0xf472b6)
                    .setDescription(botText)
                    .setFooter({ text: 'Aeternus · interpretação' })
                    .setTimestamp();
                if (replyGif) botEmbed.setImage(replyGif);
                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId(`act:devolver:${def.name}:${author.id}:${target.id}`)
                        .setLabel(def.returnLabel || 'Devolver')
                        .setEmoji(def.returnEmoji || '🔁')
                        .setStyle(ButtonStyle.Secondary)
                );
                await message.channel.send({
                    content: `${target} ➜ ${author}`,
                    embeds: [botEmbed],
                    components: [row]
                });
            } catch (e) {
                console.error('[interaction]', e.message);
            }
        }, 900);
    }
}

module.exports = { register, ACTIONS, pickGif };
