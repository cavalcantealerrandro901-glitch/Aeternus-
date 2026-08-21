/**
 * Comando removido — use O.play <nome>
 * Este arquivo só redireciona por compatibilidade.
 */
module.exports = {
    name: 'buscar_deprecated',
    aliases: [],
    description: 'Removido — use O.play',
    async execute(message) {
        await message.reply('Este comando foi unificado. Use `O.play <nome da música>`.');
    }
};
