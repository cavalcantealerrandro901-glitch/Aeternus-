const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { fetchGif } = require('./giphy');

const ACTIONS = {
    tapa: {
        key: 'slap',
        verb: 'deu um tapa em',
        returnVerb: 'devolveu o tapa em',
        emoji: '👋',
        color: 0xef4444
    },
    abraco: {
        key: 'hug',
        verb: 'abraçou',
        returnVerb: 'retribuiu o abraço de',
        emoji: '🤗',
        color: 0xf472b6
    },
    beijo: {
        key: 'kiss',
        verb: 'beijou',
        returnVerb: 'retribuiu o beijo de',
        emoji: '💋',
        color: 0xec4899
    },
    carinho: {
        key: 'pat',
        verb: 'fez carinho em',
        returnVerb: 'retribuiu o carinho de',
        emoji: '🥰',
        color: 0xa78bfa
    },
    cutucar: {
        key: 'poke',
        verb: 'cutucou',
        returnVerb: 'cutucou de volta',
        emoji: '👉',
        color: 0x38bdf8
    },
    dancar: {
        key: 'dance',
        verb: 'dançou com',
        returnVerb: 'dançou de volta com',
        emoji: '💃',
        color: 0x22c55e
    },
    chorar: {
        key: 'cry',
        verb: 'chorou com',
        returnVerb: 'chorou junto de',
        emoji: '😢',
        color: 0x64748b
    },
    rir: {
        key: 'laugh',
        verb: 'riu de',
        returnVerb: 'riu de volta com',
        emoji: '😂',
        color: 0xfbbf24
    },
    oi: {
        key: 'wave',
        verb: 'acenou para',
        returnVerb: 'acenou de volta para',
        emoji: '👋',
        color: 0x38bdf8
    },
    highfive: {
        key: 'highfive',
        verb: 'bateu de mão com',
        returnVerb: 'retribuiu o high five de',
        emoji: '🙌',
        color: 0xf59e0b
    }
};

function returnRow(action, fromId, toId) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`interact_ret_${action}_${fromId}_${toId}`)
            .setLabel('Devolver')
            .setEmoji('🔄')
            .setStyle(ButtonStyle.Primary)
    );
}

async function sendInteract(message, actionName, targetUser, isReturn = false) {
    const meta = ACTIONS[actionName];
    if (!meta) return message.reply('Ação desconhecida.');

    const author = message.author || message.user;
    const gif = await fetchGif(meta.key);
    const verb = isReturn ? meta.returnVerb : meta.verb;

    const embed = new EmbedBuilder()
        .setColor(meta.color)
        .setDescription(`${meta.emoji} **${author.username}** ${verb} **${targetUser.username}**!`)
        .setImage(gif)
        .setFooter({ text: isReturn ? 'Devolução' : 'Clique em Devolver para retribuir' });

    const components =
        !isReturn && targetUser.id !== author.id
            ? [returnRow(actionName, author.id, targetUser.id)]
            : [];

    if (message.reply) {
        return message.reply({ embeds: [embed], components });
    }
    return message.channel.send({ embeds: [embed], components });
}

/**
 * Handler do botão Devolver + auto-devolução se alvo for o bot
 */
async function handleReturnButton(interaction) {
    const id = interaction.customId || '';
    if (!id.startsWith('interact_ret_')) return false;

    const parts = id.split('_');
    // interact_ret_ACTION_fromId_toId
    const action = parts[2];
    const fromId = parts[3];
    const toId = parts[4];

    if (interaction.user.id !== toId) {
        await interaction.reply({ content: 'Só quem recebeu pode devolver.', ephemeral: true });
        return true;
    }

    const meta = ACTIONS[action];
    if (!meta) {
        await interaction.reply({ content: 'Ação inválida.', ephemeral: true });
        return true;
    }

    const originalAuthor = await interaction.client.users.fetch(fromId).catch(() => null);
    if (!originalAuthor) {
        await interaction.reply({ content: 'Usuário não encontrado.', ephemeral: true });
        return true;
    }

    const gif = await fetchGif(meta.key);
    const embed = new EmbedBuilder()
        .setColor(meta.color)
        .setDescription(
            `${meta.emoji} **${interaction.user.username}** ${meta.returnVerb} **${originalAuthor.username}**!`
        )
        .setImage(gif)
        .setFooter({ text: 'Devolução' });

    await interaction.update({ components: [] }).catch(() => {});
    await interaction.followUp({ embeds: [embed] });
    return true;
}

function createCommand(name, aliases = []) {
    return {
        name,
        aliases,
        description: `Interação ${name} com GIF`,
        async execute(message, args) {
            const target =
                message.mentions.users.first() ||
                (args[0] && (await message.client.users.fetch(args[0]).catch(() => null)));

            if (!target) {
                return message.reply(`Uso: \`O.${name} @usuário\``);
            }
            if (target.id === message.author.id) {
                return message.reply('Escolha outra pessoa!');
            }

            await sendInteract(message, name, target, false);

            // Auto-devolução se for o bot
            if (target.id === message.client.user.id) {
                setTimeout(async () => {
                    try {
                        const gif = await fetchGif(ACTIONS[name].key);
                        const embed = new EmbedBuilder()
                            .setColor(ACTIONS[name].color)
                            .setDescription(
                                `${ACTIONS[name].emoji} **${message.client.user.username}** ${ACTIONS[name].returnVerb} **${message.author.username}**!`
                            )
                            .setImage(gif)
                            .setFooter({ text: 'Devolução automática do bot' });
                        await message.channel.send({ embeds: [embed] });
                    } catch (_) {}
                }, 1200);
            }
        }
    };
}

module.exports = {
    ACTIONS,
    sendInteract,
    handleReturnButton,
    createCommand,
    returnRow
};
