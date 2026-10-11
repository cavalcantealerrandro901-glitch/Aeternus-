// COMANDO TEMPORÁRIO: contém um erro de propósito para validar o fluxo de autorreparo.
// Remova este arquivo depois de concluir o teste.
module.exports = {
    name: 'teste-autoreparo',
    aliases: ['teste-reparo'],
    description: 'Provoca um erro controlado para testar o sistema de autorreparo',

    async execute(message) {
        await message.reply('🧪 Teste controlado iniciado. Vou provocar um erro para testar o autorreparo.');
        // ERRO INTENCIONAL: ReferenceError reproduzível durante a execução.
        return aeternusVariavelQueNaoExiste.executar();
    }
};
