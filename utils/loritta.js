/**
 * Cliente API Loritta (token lorixp_ do painel).
 * Docs: https://loritta.website/br/developers/docs
 *
 * - GET users / transactions: ok com token de usuário
 * - sonhos-transfer: só bots oficiais
 * - sonhos-request / third-party: fluxo de solicitação (pagador confirma)
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

function sonhosPerEter() {
    const n = Number(process.env.LORITTA_SONHOS_PER_ETER || 10);
    return Number.isFinite(n) && n > 0 ? n : 10;
}

function client() {
    const t = token();
    if (!t) throw new Error('LORITTA_API_TOKEN não configurado.');
    return axios.create({
        baseURL: BASE,
        timeout: 25000,
        headers: {
            Authorization: t,
            'Content-Type': 'application/json',
            Accept: 'application/json'
        },
        validateStatus: () => true
    });
}

function parseError(status, data) {
    if (!data) return `HTTP ${status}`;
    if (typeof data === 'string') return data.slice(0, 200);
    return (
        data.message ||
        data.error ||
        data.reason ||
        (data.errors && JSON.stringify(data.errors)) ||
        `HTTP ${status}`
    );
}

/** GET /v1/users/{userId} */
async function getUser(userId) {
    const res = await client().get(`/users/${userId}`);
    if (res.status >= 200 && res.status < 300) return res.data;
    throw new Error(parseError(res.status, res.data));
}

/** GET /v1/users/{userId}/transactions */
async function getTransactions(userId, filters = {}) {
    const params = {};
    if (filters.limit) params.limit = filters.limit;
    if (filters.offset) params.offset = filters.offset;
    if (filters.transactionTypes) {
        params.transactionTypes = Array.isArray(filters.transactionTypes)
            ? filters.transactionTypes.join(',')
            : filters.transactionTypes;
    }
    if (filters.beforeDate) params.beforeDate = filters.beforeDate;
    if (filters.afterDate) params.afterDate = filters.afterDate;

    const res = await client().get(`/users/${userId}/transactions`, { params });
    if (res.status >= 200 && res.status < 300) return { ok: true, data: res.data };
    return { ok: false, error: parseError(res.status, res.data), status: res.status, data: res.data };
}

/**
 * Solicita transferência (pagador confirma no Discord via Loritta).
 * POST .../sonhos/sonhos-request
 * Body típico: senderId, quantity, reason [, expiresAfterMillis]
 * (receiver pode ser o dono do token ou body.receiverId se a API aceitar)
 */
async function requestSonhosTransfer({
    guildId,
    channelId,
    senderId,
    receiverId,
    quantity,
    reason,
    expiresAfterMillis
}) {
    const body = {
        senderId: String(senderId),
        quantity: Math.floor(Number(quantity)),
        reason: String(reason || 'Cambio Aeternus').slice(0, 200)
    };
    if (receiverId) body.receiverId = String(receiverId);
    if (expiresAfterMillis) body.expiresAfterMillis = Number(expiresAfterMillis);

    const res = await client().post(
        `/guilds/${guildId}/channels/${channelId}/sonhos/sonhos-request`,
        body
    );

    if (res.status >= 200 && res.status < 300) {
        return { ok: true, data: res.data, status: res.status };
    }
    return {
        ok: false,
        error: parseError(res.status, res.data),
        status: res.status,
        data: res.data
    };
}

/**
 * Transferência direta (geralmente só bot oficial).
 * POST .../sonhos/sonhos-transfer
 */
async function transferSonhos({
    guildId,
    channelId,
    receiverId,
    quantity,
    reason,
    expiresAfterMillis
}) {
    const body = {
        receiverId: String(receiverId),
        quantity: Math.floor(Number(quantity)),
        reason: String(reason || 'Cambio Aeternus').slice(0, 200)
    };
    if (expiresAfterMillis) body.expiresAfterMillis = Number(expiresAfterMillis);

    const res = await client().post(
        `/guilds/${guildId}/channels/${channelId}/sonhos/sonhos-transfer`,
        body
    );

    if (res.status >= 200 && res.status < 300) {
        return { ok: true, data: res.data, status: res.status };
    }
    return {
        ok: false,
        error: parseError(res.status, res.data),
        status: res.status,
        data: res.data
    };
}

/** GET /v1/sonhos/third-party-sonhos-transfer/{id} */
async function getTransferStatus(sonhosTransferId) {
    const res = await client().get(`/sonhos/third-party-sonhos-transfer/${sonhosTransferId}`);
    if (res.status >= 200 && res.status < 300) {
        return { ok: true, data: res.data, status: res.status };
    }
    return {
        ok: false,
        error: parseError(res.status, res.data),
        status: res.status,
        data: res.data
    };
}

module.exports = {
    configured,
    token,
    sonhosPerEter,
    getUser,
    getTransactions,
    requestSonhosTransfer,
    transferSonhos,
    getTransferStatus,
    BASE
};
