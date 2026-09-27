/**
 * Carrega o núcleo da IA e registra no boot.
 * Novos módulos podem: require('../utils/aeternusAI').registerContext(...)
 */
const ai = require('../utils/aeternusAI');

function setup(client) {
    const ready = () => {
        if (ai.configured()) {
            console.log(
                `🧠 [IA] Aeternus AI ativa · model=${ai.model()} · tools=${ai.listTools().length} · contexts=${ai.listContexts().length}`
            );
        } else {
            console.log(
                '🧠 [IA] Aeternus AI inativa — defina AETERNUS_AI_API_KEY (ou OPENAI/GROQ/XAI).'
            );
        }
    };
    if (client.isReady?.()) ready();
    else client.once('clientReady', ready);

    return {
        stop() {}
    };
}

module.exports = { setup };
