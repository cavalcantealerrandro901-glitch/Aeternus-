const { register } = require('../utils/interaction');
module.exports = register({ name: 'carinho', aliases: ['pat'], gif: 'pat', target: '{author} fez carinho em {target}!', botReply: '{bot} retribuiu o carinho!', returnLabel: 'Devolver', returnEmoji: '🥰', color: 0xfda4af });
