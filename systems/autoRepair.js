/**
 * Liga o auto-reparo ao client e a TODOS os erros (comandos + sistemas + process).
 */
const autoRepair = require('../utils/autoRepair');

function setup(client) {
    autoRepair.setClient(client);
    autoRepair.installGlobalHooks();

    const onReady = async () => {
        try {
            await client.application?.fetch?.();
        } catch (_) {}
        const owners = autoRepair.ownerIds();
        if (owners.length) {
            console.log(`🔧 [autoRepair] Dono(s) DM: ${owners.join(', ')}`);
        } else {
            console.warn(
                '🔧 [autoRepair] Defina OWNER_ID no .env para receber DMs de erro.'
            );
        }
    };

    client.once('ready', onReady);
    client.once('clientReady', onReady);

    client.on('error', (err) => {
        autoRepair
            .reportError({
                source: 'discord.js',
                error: err,
                context: 'client.on(error)'
            })
            .catch(() => {});
    });

    client.on('shardError', (err) => {
        autoRepair
            .reportError({
                source: 'shard',
                error: err,
                context: 'client.on(shardError)'
            })
            .catch(() => {});
    });

    // remove handlers duplicados do index se existirem — já cobertos pelo autoRepair
    client.autoRepair = autoRepair;
    console.log('🔧 [autoRepair] sistema ativo — qualquer erro vai no DM do dono');
}

module.exports = { setup };
