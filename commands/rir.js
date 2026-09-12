const { register } = require('../utils/interaction');
module.exports = register({
    name: 'rir',
    aliases: ['laugh', 'happy', 'haha'],
    description: 'Ri com alguém',
    gif: 'happy',
    target: '{author} riu com {target}!',
    solo: '{author} está rindo!',
    allowSelf: true,
    botReply: '{bot} riu junto com {author}!',
    returnLabel: 'Rir junto',
    returnEmoji: '😆',
    color: 0xfbbf24
});
