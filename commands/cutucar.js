const { register } = require('../utils/interaction');
module.exports = register({ name: 'cutucar', aliases: ['poke'], gif: 'poke', target: '{author} cutucou {target}!', botReply: '{bot} cutucou de volta!', returnLabel: 'Devolver', returnEmoji: '👉', color: 0xa5b4fc });
