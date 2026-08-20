const gameSystem = require('../src/systems/gameSystem');

module.exports = {
    name: 'borboleta',
    aliases: ['efeito', 'causa'],
    description: 'Simulador de Causa e Efeito no Tempo.',
    async execute(message, args) {
        await gameSystem.startButterflyGame(message);
    }
};
