const { addLog } = require('./logger');

async function analyzeAndFix(error, client) {
    const errorMessage = error.message || String(error);
    addLog('HEALER', `Analisando erro: ${errorMessage}`);

    // Envia o aviso automático no PV do usuário administrador configurado
    if (client && process.env.ADMIN_USER_ID) {
        try {
            const user = await client.users.fetch(process.env.ADMIN_USER_ID);
            if (user) {
                await user.send(
                    `🚨 **Alerta de Erro no Bot Aeternus!**\n` +
                    `> **Detalhes:** \`${errorMessage}\`\n` +
                    `> *O painel identificou a falha e está tentando aplicar a autocorreção.*`
                );
            }
        } catch (discordError) {
            console.error('Não foi possível enviar a DM para o usuário:', discordError);
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
