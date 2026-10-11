// COMANDO DE TESTE INTENCIONALMENTE COM ERRO.
// Use apenas para testar o fluxo de autorreparo e remova depois.
// O erro acontece somente quando o comando é executado.
module.exports = {
    name: 'teste-autoreparo',
    aliases: ['teste-reparo'],
    description: 'Comando temporário para testar o autorreparo do Aeternus',

    async execute(message) {
        await message.reply('🧪 Iniciando teste do autorreparo…');
        // BUG INTENCIONAL: esta variável não existe e gera ReferenceError.
        return aeternusVariavelQueNaoExiste.executar();
    }
};
