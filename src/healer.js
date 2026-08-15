const { addLog } = require('./logger');

async function analyzeAndFix(error, client) {
    const errorMessage = error.message || String(error);
    addLog('HEALER', `Analisando erro: ${errorMessage}`);

    // Envia o aviso automático no canal do Discord configurado
    if (client && process.env.ERROR_CHANNEL_ID) {
        try {
            const channel = await client.channels.fetch(process.env.ERROR_CHANNEL_ID);
            if (channel) {
                await channel.send(
                    `🚨 **Alerta de Erro Detectado!**\n` +
                    `> **Detalhes:** \`${errorMessage}\`\n` +
                    `> *O painel Aeternus identificou a falha e está tentando aplicar a autocorreção.*`
                );
            }
        } catch (discordError) {
            console.error('Não foi possível enviar o alerta no Discord:', discordError);
        }
    }

    // Regras de autocorreção
    if (errorMessage.includes('MODULE_NOT_FOUND')) {
        addLog('HEALER', 'Módulo ausente detectado.');
        return true;
    }

    if (errorMessage.includes('TokenInvalid')) {
        addLog('HEALER', 'Token inválido detectado! Verifique as configurações.');
        return true;
    }

    return false;
}

module.exports = { analyzeAndFix };
