const { registerSlash } = require('../utils/registerSlash');

module.exports = {
    name: 'clientReady',
    once: true,
    async execute(client) {
        console.log(`🤖 Bot online: ${client.user.tag}`);

        // Auto-registro no boot (Render / Termux / qualquer host)
        try {
            const result = await registerSlash(client);
            if (result.ok) {
                console.log(`✅ Slash sincronizados (${result.count}).`);
            }
        } catch (e) {
            console.error('❌ Falha no registro de slash:', e);
        }

        // status
        try {
            client.user.setPresence({
                activities: [{ name: 'O.ajuda · Aeternus', type: 3 }],
                status: 'online'
            });
        } catch (_) {}
    }
};
