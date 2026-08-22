const sg = require('../utils/supremeGate');

module.exports = (client) => {
    // Entrada de membros (além do welcome clássico)
    client.on('guildMemberAdd', async (member) => {
        try {
            await sg.onMemberJoin(member);
        } catch (e) {
            console.error('[SUPREME GATE join]', e.message);
        }
    });

    client.on('guildMemberRemove', async (member) => {
        try {
            const c = sg.cfg(member.guild.id);
            if (!c.enabled) return;
            await sg.log(
                member.guild,
                'leave',
                `🚪 **Saída**\n${member.user?.tag || member.id} (\`${member.id}\`) saiu do servidor.`
            );
        } catch (e) {
            console.error('[SUPREME GATE leave]', e.message);
        }
    });
};
