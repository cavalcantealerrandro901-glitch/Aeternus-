const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const WAIFU = {
    hug: 'hug', kiss: 'kiss', slap: 'slap', pat: 'pat', cuddle: 'cuddle', poke: 'poke',
    bonk: 'bonk', bite: 'bite', highfive: 'highfive', handhold: 'handhold', wave: 'wave',
    smile: 'smile', blush: 'blush', cry: 'cry', dance: 'dance', wink: 'wink',
    kill: 'kill', kick: 'kick', yeet: 'yeet', bully: 'bully', glomp: 'glomp', cringe: 'cringe', awoo: 'awoo', lick: 'lick'
};

async function fetchGif(category) {
    const key = WAIFU[category] || category;
    try {
        const r = await fetch(`https://api.waifu.pics/sfw/${key}`);
        if (r.ok) { const j = await r.json(); if (j.url) return j.url; }
    } catch (_) {}
    try {
        const r2 = await fetch(`https://nekos.best/api/v2/${key === 'pat' ? 'pat' : key === 'slap' ? 'slap' : 'hug'}`);
        if (r2.ok) { const j2 = await r2.json(); const url = j2?.results?.[0]?.url; if (url) return url; }
    } catch (_) {}
    return null;
}

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

async function run(message, def, opts) {
    const author = message.author;
    let target = opts.forcedTarget || message.mentions?.users?.first?.() || null;
    if (!target && !def.solo) return message.reply(`Mencione alguém: \`O.${def.name} @usuario\``);
    if (target && target.id === author.id && !def.allowSelf)
        return message.reply(def.selfMsg || 'Não pode usar em si mesmo.');

    const gif = await fetchGif(def.gif || def.name);
    const text = target
        ? (def.target || '{author} → {target}').replace(/{author}/g, `**${author.username}**`).replace(/{target}/g, `**${target.username}**`)
        : (def.solo || '{author}').replace(/{author}/g, `**${author.username}**`);

    const embed = new EmbedBuilder().setColor(def.color || 0xf472b6).setDescription(text).setTimestamp();
    if (gif) embed.setImage(gif);

    const content = target ? `${author} ➜ ${target}` : `${author}`;
    const components = [];
    if (target && !target.bot) {
        components.push(new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`act:devolver:${def.name}:${target.id}:${author.id}`)
                .setLabel(def.returnLabel || 'Devolver')
                .setEmoji(def.returnEmoji || '🔁')
                .setStyle(ButtonStyle.Secondary)
        ));
    }
    await message.reply({ content, embeds: [embed], components });

    if (target?.bot) {
        setTimeout(async () => {
            try {
                const replyGif = await fetchGif(def.gif || def.name);
                const botText = (def.botReply || '{bot} devolveu para {author}!')
                    .replace(/{bot}/g, `**${target.username}**`)
                    .replace(/{author}/g, `**${author.username}**`);
                const botEmbed = new EmbedBuilder().setColor(def.color || 0xf472b6).setDescription(botText).setTimestamp();
                if (replyGif) botEmbed.setImage(replyGif);
                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId(`act:devolver:${def.name}:${author.id}:${target.id}`)
                        .setLabel(def.returnLabel || 'Devolver')
                        .setEmoji(def.returnEmoji || '🔁')
                        .setStyle(ButtonStyle.Secondary)
                );
                await message.channel.send({ content: `${target} ➜ ${author}`, embeds: [botEmbed], components: [row] });
            } catch (e) { console.error('[interaction]', e.message); }
        }, 1000);
    }
}

module.exports = { register, fetchGif, ACTIONS };
