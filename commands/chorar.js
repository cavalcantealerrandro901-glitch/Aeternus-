const { register } = require('../utils/interaction');
module.exports = register({ name: 'chorar', aliases: ['cry'], gif: 'cry', solo: '{author} está chorando…', target: '{author} chorou com {target}!', botReply: '{bot} consolou {author}!', returnLabel: 'Consolar', returnEmoji: '😢', color: 0x93c5fd, allowSelf: true });
