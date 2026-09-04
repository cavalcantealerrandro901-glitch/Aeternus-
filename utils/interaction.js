const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder } = require('discord.js');
const gifs = require('./gifs');

const ACTIONS = {};

const NEKOS = {
    hug: 'hug',
    kiss: 'kiss',
    slap: 'slap',
    pat: 'pat',
    poke: 'poke',
    bite: 'bite',
    highfive: 'highfive',
    cry: 'cry',
    dance: 'dance',
    bonk: 'baka',
    abraco: 'hug',
    beijo: 'kiss',
    tapa: 'slap',
    carinho: 'pat',
    cutucar: 'poke',
    morder: 'bite',
    chorar: 'cry',
    dancar: 'dance'
};

function register(def) {
    ACTIONS[def.name] = def;
    const data = new SlashCommandBuilder()
        .setName(String(def.name).slice(0, 32))
        .setDescription(String(def.description || def.name).slice(0, 100))
        .addUserOption((o) =>
            o.setName('usuario').setDescription('Membro').setRequired(false)
        );
    return {
        name: def.name,
        aliases: def.aliases || [],
        description: def.description || def.name,
        data,
        async execute(message) {
            await run(message, def, {});
        },
        async executeSlash(interaction) {
            const target = interaction.options.getUser('usuario');
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
            const parts = interaction.customId.split(':');
            if (parts[1] !== 'devolver') return;
            const actionName = parts[2];
            const fromId = parts[3];
            const toId = parts[4];
            if (interaction.user.id !== fromId)
                return interaction.reply({
                    content: 'Só quem recebeu pode devolver.',
                    ephemeral: true
                });
            const actionDef = ACTIONS[actionName] || def;
            const fromUser = await interaction.client.users
                .fetch(fromId)
                .catch(() => interaction.user);
            const toUser = await interaction.client.users.fetch(toId).catch(() => null);
            if (!toUser)
                return interaction.reply({ content: 'Usuário inválido.', ephemeral: true });
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

async function fetchNekos(key) {
    const ep = NEKOS[key] || NEKOS.hug;
    try {
        const res = await fetch(`https://nekos.best/api/v2/${ep}`, {
            headers: { Accept: 'application/json' }
        });
        if (!res.ok) return null;
        const data = await res.json();
        const url = data?.results?.[0]?.url;
        return url || null;
    } catch {
        return null;
    }
}

async function pickGif(def) {
    const key = def.gif || def.name;
    const online = await fetchNekos(key);
    if (online) return online;
    if (typeof gifs.pickAsync === 'function') {
        try {
            const a = await gifs.pickAsync(key);
            if (a) return a;
        } catch (_) {}
    }
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
                    .setDescription('Mencione alguém ou use a opção **usuario**.')
            ]
        });
    }
    if (target && target.id === author.id && !def.allowSelf)
        return message.reply(def.selfMsg || 'Não pode usar em si mesmo.');

    const gif = await pickGif(def);
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
                const replyGif = await pickGif(def);
                const botText = (def.botReply || '{bot} devolveu para {author}!')
                    .replace(/{bot}/g, `**${target.username}**`)
                    .replace(/{author}/g, `**${author.username}**`);
                const botEmbed = new EmbedBuilder()
                    .setColor(def.color || 0xf472b6)
                    .setDescription(botText)
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
