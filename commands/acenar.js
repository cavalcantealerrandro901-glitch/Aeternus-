const { register } = require('../utils/interaction');
module.exports = register({
    name: 'acenar',
    aliases: ['wave', 'oi', 'ola'],
    description: 'Acena para alguém',
    gif: 'wave',
    target: '{author} acenou para {target}!',
    solo: '{author} está acenando!',
    allowSelf: true,
    botReply: '{bot} acenou de volta para {author}!',
    returnLabel: 'Acenar de volta',
    returnEmoji: '👋',
    color: 0x93c5fd
});
