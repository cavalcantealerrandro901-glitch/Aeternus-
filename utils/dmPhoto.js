/**
 * Processa imagem enviada no PV durante criação de personagem.
 */
const player = require('./player');

function isImageAttachment(att) {
    if (!att) return false;
    const name = String(att.name || att.filename || '');
    const type = String(att.contentType || att.content_type || '');
    if (type.startsWith('image/')) return true;
    const url = String(att.proxyURL || att.proxy_url || att.url || '');
    return /\.(png|jpe?g|gif|webp|bmp)(\?|$)/i.test(name) || /\.(png|jpe?g|gif|webp|bmp)(\?|$)/i.test(url);
}

function pickImageUrl(message) {
    if (!message) return null;
    try {
        const atts =
            typeof message.attachments?.values === 'function'
                ? [...message.attachments.values()]
                : [];
        for (const att of atts) {
            if (isImageAttachment(att)) return att.proxyURL || att.proxy_url || att.url || null;
        }
    } catch (_) {}
    try {
        for (const e of message.embeds || []) {
            if (e.image?.url) return e.image.url;
            if (e.thumbnail?.url) return e.thumbnail.url;
        }
    } catch (_) {}
    const content = String(message.content || '');
    const link = content.match(/https?:\/\/\S+\.(?:png|jpe?g|gif|webp)(?:\?\S*)?/i);
    return link ? link[0] : null;
}

async function tryConsumePhotoMessage(message, client) {
    const userId = message.author?.id;
    if (!userId || message.guild) return false;

    const jCmd = client.commands.get('j');
    const draft =
        (jCmd?.photoWait && jCmd.photoWait.get(userId)) ||
        (jCmd?.drafts && jCmd.drafts.get(userId));
    if (!draft || !draft.classId || !draft.name) return false;

    const photoUrl = pickImageUrl(message);
    if (!photoUrl) return false;

    const channel = message.channel;
    await channel.send({ content: '📸 **Foto recebida!** Salvando no seu perfil…' }).catch(() => {});

    try {
        if (player.has(userId)) {
            player.update(userId, { photoUrl });
        } else {
            player.create(userId, {
                name: draft.name,
                classId: draft.classId,
                photoUrl
            });
        }
        if (jCmd?.photoWait) jCmd.photoWait.delete(userId);
        if (jCmd?.drafts) jCmd.drafts.delete(userId);

        const profile = player.get(userId);
        const { EmbedBuilder } = require('discord.js');
        const emb = new EmbedBuilder()
            .setColor(0xa78bfa)
            .setTitle('✅ Personagem pronto')
            .setDescription(`**${profile.name}** — foto salva no perfil.`)
            .setThumbnail(photoUrl);
        await channel.send({ content: '✅ Foto salva!', embeds: [emb] }).catch(() => {});
        return true;
    } catch (e) {
        await channel.send('❌ Erro ao salvar: ' + e.message).catch(() => {});
        return false;
    }
}

module.exports = { tryConsumePhotoMessage, pickImageUrl, isImageAttachment };
