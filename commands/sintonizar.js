const gameSystem = require('../src/systems/gameSystem');

module.exports = {
    name: 'sintonizar',
    aliases: ['onda', 'frequencia'],
    description: 'Sintonizador de Ondas Temporais em tempo real.',
    async execute(message, args) {
        await gameSystem.startWaveGame(message);
    }
};
