const { register } = require('../utils/interaction');
module.exports = register({
    name: 'beijo',
    aliases: ['kiss', 'beijar', 'beijo'],
    description: 'Beija alguém',
    gif: 'kiss',
    target: '{author} beijou {target}!',
    botReply: '{bot} devolveu o beijo de {author}!',
    returnLabel: 'Devolver beijo',
    returnEmoji: '💋',
    color: 0xfb7185
});
