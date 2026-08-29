const { register } = require('../utils/interaction');
module.exports = register({ name: 'morder', aliases: ['bite'], gif: 'bite', target: '{author} mordeu {target}!', botReply: '{bot} mordeu de volta!', returnLabel: 'Devolver', returnEmoji: '🦷', color: 0xf87171 });
