const settings = require('./settings');

function getVipRoleId(guildId) {
    const g = settings.getGuild(guildId);
    return g.vipRoleId || process.env.VIP_ROLE_ID || null;
}

function setVipRoleId(guildId, roleId) {
    return settings.setKey(guildId, 'vipRoleId', roleId);
}

module.exports = { getVipRoleId, setVipRoleId };
