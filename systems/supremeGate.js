const sg = require('../utils/supremeGate');

module.exports = (client) => {
    client.on('guildMemberAdd', async (member) => {
        if (member.user.bot) return;
        try {
            await sg.onMemberJoin(member);
        } catch (e) {
            console.error('[SUPREME GATE join]', e.message);
        }
    });

    client.on('guildMemberRemove', async (member) => {
        if (member.user?.bot) return;
        try {
            await sg.onMemberLeave(member);
        } catch (e) {
            console.error('[SUPREME GATE leave]', e.message);
        }
    });
};
