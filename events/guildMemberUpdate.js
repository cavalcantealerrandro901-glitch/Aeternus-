const antiRob = require('../utils/antiRob');

module.exports = {
    name: 'guildMemberUpdate',
    async execute(oldMember, newMember) {
        try {
            await antiRob.onMemberRolesUpdate(oldMember, newMember);
        } catch (_) {}
    }
};
