const flocos = require('../utils/flocos');

module.exports = {
    name: 'bal',
    aliases: ['saldo', 'atm', 'flocos', 'balance'],
    description: 'Mostra seu saldo de flocos ❄️',
    async execute(message) {
        const target = message.mentions.users.first() || message.author;
        const bal = flocos.get(target.id);
        await message.reply(
            `❄️ Cofre de **${target.username}**: **${bal.toLocaleString('pt-BR')}** flocos.`
        );
    }
};
