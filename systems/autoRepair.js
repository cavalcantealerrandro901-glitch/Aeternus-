/**
 * Liga o auto-reparo ao client e a erros não tratados.
 */
const autoRepair = require('../utils/autoRepair');

function setup(client) {
    autoRepair.setClient(client);

    client.once('clientReady', async () => {
        try {
            await client.application?.fetch?.();
        } catch (_) {}
        const owners = autoRepair.ownerIds();
        if (owners.length) {
            console.log(`🔧 [autoRepair] Dono(s): ${owners.join(', ')}`);
        } else {
            console.warn(
                '🔧 [autoRepair] Defina OWNER_ID no .env para receber DMs de erro.'
            );
        }
    });

    client.once('ready', async () => {
        try {
            await client.application?.fetch?.();
        } catch (_) {}
    });

    process.on('unhandledRejection', (err) => {
        console.error('[unhandledRejection]', err);
    });

    client.autoRepair = autoRepair;
    console.log('🔧 [autoRepair] sistema ativo');
}

module.exports = { setup };
