const { register } = require('../utils/interaction');
module.exports = register({ name: 'tapa', aliases: ['slap'], gif: 'slap', target: '{author} deu um tapa em {target}!', botReply: '{bot} devolveu o tapa!', returnLabel: 'Devolver tapa', returnEmoji: '👋', color: 0xfb7185 });
