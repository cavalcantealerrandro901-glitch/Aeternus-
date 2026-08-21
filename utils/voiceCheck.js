/**
 * Relatório de dependências de voz (@discordjs/voice)
 */
function printVoiceReport() {
    try {
        const { generateDependencyReport } = require('@discordjs/voice');
        console.log('——— Voice dependency report ———');
        console.log(generateDependencyReport());
        console.log('———————————————');
    } catch (e) {
        console.warn('Não foi possível gerar relatório de voz:', e.message);
    }
}

module.exports = { printVoiceReport };
