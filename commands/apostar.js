const gameSystem = require('../src/systems/gameSystem');

module.exports = {
    name: 'apostar',
    aliases: ['investir', 'quantico'],
    description: 'Aposte cristais virtuais do bot em linhas do tempo paralelas.',
    async execute(message, args) {
        const amount = parseInt(args[0]);
        await gameSystem.startQuantumInvest(message, amount);
    }
};
