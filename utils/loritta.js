/**
 * Cliente da API pública da Loritta (sonhos).
 * Docs: https://loritta.website/br/developers/docs/reference
 * Token: env LORITTA_API_TOKEN (lorixp_...)
 */
const axios = require('axios');

const BASE = 'https://api.loritta.website/v1';

function token() {
    return (
        process.env.LORITTA_API_TOKEN ||
        process.env.LORITTA_TOKEN ||
        process.env.LORIXP_TOKEN ||
        ''
    ).trim();
}

function configured() {
    return token().startsWith('lorixp_');
}

/** Quantos sonhos por 1 éter (padrão 10). */
function sonhosPerEter() {
    const n = Number(process.env.LORITTA_SONHOS_PER_ETER || 10);
    return Number.isFinite(n) && n > 0 ? n : 10;
}

function client() {
    const t = token();
    if (!t) throw new Error('LORITTA_API_TOKEN não configurado.');
    return axios.create({
        baseURL: BASE,
        timeout: 20000,
        headers: {
            Authorization: t,
            'Content-Type': 'application/json',
            Accept: 'application/json'
        }
    });
}

/**
 * GET /v1/users/{userId}
 * @returns {{ id, xp, sonhos, aboutMe, gender }}
 */
async function getUser(userId) {
    const { data } = await client().get(`/users/${userId}`);
    return data;
}

/**
 * Transfere sonhos do dono do token → receiver (mensagem no canal).
 * POST /v1/guilds/{guildId}/channels/{channelId}/sonhos/sonhos-transfer
 */
async function transferSonhos({ guildId, channelId, receiverId, quantity, reason, expiresAfterMillis }) {
    const body = {
        receiverId: String(receiverId),
        quantity: Math.floor(Number(quantity)),
        reason: String(reason || 'Câmbio Aeternus').slice(0, 200)
    };
    if (expiresAfterMillis) body.expiresAfterMillis = Number(expiresAfterMillis);

    const { data, status } = await client().post(
        `/guilds/${guildId}/channels/${channelId}/sonhos/sonhos-transfer`,
        body,
        { validateStatus: () => true }
    );

    if (status >= 200 && status < 300) {
        return { ok: true, data, status };
    }
    const msg =
        (data && (data.message || data.error || data.reason)) ||
        `HTTP ${status}`;
    return { ok: false, error: String(msg), status, data };
}

/**
 * Lista transações do usuário (se a API permitir).
 * Tentativa: GET /v1/users/{userId}/transactions
 */
async function getTransactions(userId, { types, limit } = {}) {
    try {
        const params = {};
        if (types) params.transactionTypes = Array.isArray(types) ? types.join(',') : types;
        if (limit) params.limit = limit;
        const { data, status } = await client().get(`/users/${userId}/transactions`, {
            params,
            validateStatus: () => true
        });
        if (status >= 200 && status < 300) return { ok: true, data };
        return { ok: false, error: `HTTP ${status}`, data };
    } catch (e) {
        return { ok: false, error: e.message };
    }
}

module.exports = {
    configured,
    token,
    sonhosPerEter,
    getUser,
    transferSonhos,
    getTransactions,
    BASE
};
