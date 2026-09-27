/**
 * Consciência nativa do Aeternus (sem API de IA externa).
 */
const ai = require('../utils/aeternusAI');

function setup(client) {
    const ready = () => {
        console.log(
            `🧠 [Aeternus] consciência nativa · tools=${ai.listTools().length} · contexts=${ai.listContexts().length}`
        );
    };
    if (client.isReady?.()) ready();
    else client.once('clientReady', ready);

    return { stop() {} };
}

module.exports = { setup };
