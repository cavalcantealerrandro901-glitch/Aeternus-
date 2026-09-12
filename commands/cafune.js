const { register } = require('../utils/interaction');
module.exports = register({
    name: 'cafune',
    aliases: ['cuddle', 'cafuné', 'cafunezinho'],
    description: 'Faz cafuné em alguém',
    gif: 'cuddle',
    target: '{author} fez cafuné em {target}!',
    botReply: '{bot} retribuiu o cafuné de {author}!',
    returnLabel: 'Devolver cafuné',
    returnEmoji: '🥰',
    color: 0xf9a8d4
});
