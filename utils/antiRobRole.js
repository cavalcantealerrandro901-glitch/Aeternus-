const store = require('./store');

/** Cargo de anti-roubo — só pode ser dado via /cargo-membro (ou prefixo cargo) */
function getAntiRobRoleId() {
    const id = String(process.env.ANTI_ROB_ROLE_ID || process.env.ANTI_ROUBO_ROLE_ID || '').trim();
    return /^\d{15,25}$/.test(id) ? id : null;
}
const KEY = 'antirob_auth.json';

function all() {
    return store.load(KEY, {});
}

function save(data) {
    store.save(KEY, data);
}

function isAuthorized(guildId, userId) {
    const data = all();
    const g = data[String(guildId)];
    if (!g) return false;
    return !!g[String(userId)];
}

/** Marca que o cargo foi concedido pelo comando cargo-membro */
function authorize(guildId, userId, by) {
    const data = all();
    const gid = String(guildId);
    const uid = String(userId);
    if (!data[gid]) data[gid] = {};
    data[gid][uid] = { by: by ? String(by) : null, at: Date.now() };
    save(data);
    return data[gid][uid];
}

/** Remove autorização (ao retirar o cargo pelo comando ou manualmente) */
function revoke(guildId, userId) {
    const data = all();
    const gid = String(guildId);
    const uid = String(userId);
    if (data[gid] && data[gid][uid]) {
        delete data[gid][uid];
        if (!Object.keys(data[gid]).length) delete data[gid];
        save(data);
        return true;
    }
    return false;
}

function isAntiRobRole(roleId) {
    const configuredId = getAntiRobRoleId();
    return Boolean(configuredId && String(roleId) === configuredId);
}

module.exports = {
    getAntiRobRoleId,
    get ANTI_ROB_ROLE_ID() { return getAntiRobRoleId(); },
    isAuthorized,
    authorize,
    revoke,
    isAntiRobRole
};
