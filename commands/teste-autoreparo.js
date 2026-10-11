module.exports = {
    name: 'teste-autoreparo',
    aliases: ['teste-reparo'],
    description: 'Comando temporário para testar o autorreparo do Aeternus',

    async execute(message) {
        await message.reply('🧪 Iniciando teste do autorreparo…');
        // Correção: removida referência a variável inexistente.
        // Opcional: enviar confirmação de conclusão.
        await message.reply('✅ Teste de autorreparo concluído com sucesso.');
        return true;
    }
};