const { register } = require('../utils/interaction');
module.exports = register({
    name: 'yeet',
    aliases: ['arremessar', 'jogar'],
    description: 'Yeet em alguém',
    gif: 'yeet',
    target: '{author} deu um yeet em {target}!',
    botReply: '{bot} devolveu o yeet em {author}!',
    returnLabel: 'Yeet de volta',
    returnEmoji: '🚀',
    color: 0xfb923c
});
