const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

/**
 * Botão "Novamente" — guarda o jogo + args para repetir a rodada.
 * customId: again:<game>:<userId>:<payloadBase64>
 * payload max ~80 chars após encode (limite Discord 100 no customId).
 */
function encodePayload(obj) {
    const json = JSON.stringify(obj);
    return Buffer.from(json, 'utf8').toString('base64url');
}

function decodePayload(b64) {
    try {
        return JSON.parse(Buffer.from(b64, 'base64url').toString('utf8'));
    } catch {
        return null;
    }
}

function againRow(gameName, userId, argsArray = []) {
    const payload = encodePayload({ a: argsArray.map(String) });
    const id = `again:${gameName}:${userId}:${payload}`;
    // Discord customId max 100 chars
    if (id.length > 100) {
        const short = encodePayload({ a: argsArray.slice(0, 2).map(String) });
        return new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`again:${gameName}:${userId}:${short}`)
                .setLabel('Novamente')
                .setEmoji('🔄')
                .setStyle(ButtonStyle.Primary)
        );
    }
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(id)
            .setLabel('Novamente')
            .setEmoji('🔄')
            .setStyle(ButtonStyle.Primary)
    );
}

/** Monta objeto message-like a partir da interação (para reexecutar comando prefixo) */
function messageFromInteraction(interaction) {
    return {
        id: interaction.id,
        author: interaction.user,
        member: interaction.member,
        channel: interaction.channel,
        guild: interaction.guild,
        client: interaction.client,
        content: '',
        mentions: { users: { first: () => null, size: 0 } },
        reply: (payload) => interaction.followUp(payload),
        delete: async () => {}
    };
}

module.exports = { againRow, encodePayload, decodePayload, messageFromInteraction };
