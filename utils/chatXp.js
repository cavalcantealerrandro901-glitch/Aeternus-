/**
 * XP por mensagem no chat (anti-spam)
 */
const xp = require('./xp');

const COOLDOWN_MS = 45_000; // 45s entre XP no mesmo usuário
const MIN_LENGTH = 5;
const XP_MIN = 30;
const XP_MAX = 77;

/** @type {Map<string, number>} */
const lastXp = new Map();

function randomXp() {
    return XP_MIN + Math.floor(Math.random() * (XP_MAX - XP_MIN + 1));
}

/**
 * Tenta dar XP por mensagem.
 * @returns {null|{ amount:number, result:object }}
 */
function tryAward(message) {
    if (!message?.author || message.author.bot || !message.guild) return null;

    const content = (message.content || '').trim();
    if (content.length < MIN_LENGTH) return null;

    // ignora comandos
    if (/^[O.!.\/?]/.test(content) || content.startsWith('<@')) {
        // menções curtas ok se tiver texto suficiente; comandos com prefixo curto
    }

    const id = message.author.id;
    const now = Date.now();
    const last = lastXp.get(id) || 0;
    if (now - last < COOLDOWN_MS) return null;

    // spam: mesma mensagem repetida
    if (message.client._lastMsgContent?.get(id) === content) return null;
    if (!message.client._lastMsgContent) message.client._lastMsgContent = new Map();
    message.client._lastMsgContent.set(id, content);

    lastXp.set(id, now);
    const amount = randomXp();
    const result = xp.add(id, amount);
    return { amount, result };
}

module.exports = { tryAward, COOLDOWN_MS, XP_MIN, XP_MAX };
