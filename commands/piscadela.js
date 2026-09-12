const { register } = require('../utils/interaction');
module.exports = register({
    name: 'piscadela',
    aliases: ['wink', 'piscar'],
    description: 'Pisca para alguém',
    gif: 'wink',
    target: '{author} piscou para {target}!',
    solo: '{author} piscou!',
    allowSelf: true,
    botReply: '{bot} piscou de volta para {author}!',
    returnLabel: 'Piscar de volta',
    returnEmoji: '😉',
    color: 0xa5b4fc
});
