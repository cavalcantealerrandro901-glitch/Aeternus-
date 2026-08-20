const gameSystem = require('../src/systems/gameSystem');

module.exports = {
    name: 'loop',
    aliases: ['paradoxo', 'temporal'],
    description: 'Jogo do Paradoxo Temporal com Fantasma do Passado.',
    async execute(message, args) {
        await gameSystem.startLoopGame(message);
    }
};
