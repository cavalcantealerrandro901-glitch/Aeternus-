const flocos = require('../utils/flocos');

module.exports = {
    name: 'bal',
    aliases: ['saldo', 'flocos', 'balance'],
    description: 'Saldo rápido de ❄️ flocos',
    async execute(message) {
        const target = message.mentions.users.first() || message.author;
        const bal = flocos.get(target.id);
        await message.reply(
            `❄️ Cofre de **${target.username}**: **${bal.toLocaleString('pt-BR')}** flocos.\n` +
                `_Use \`O.atm\` para ver economia completa e o painel._`
        );
    }
};
