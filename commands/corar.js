const { register } = require('../utils/interaction');
module.exports = register({
    name: 'corar',
    aliases: ['blush', 'envergonhar'],
    description: 'Fica corado',
    gif: 'blush',
    target: '{author} corou por causa de {target}!',
    solo: '{author} está corado(a)!',
    allowSelf: true,
    botReply: '{bot} também ficou corado com {author}!',
    returnLabel: 'Corar também',
    returnEmoji: '😳',
    color: 0xfda4af
});
