const { register } = require('../utils/interaction');
module.exports = register({ name: 'bonk', gif: 'bonk', target: '{author} deu BONK em {target}!', botReply: '{bot} deu BONK em {author}!', returnLabel: 'Bonk', returnEmoji: '🔨', color: 0xfbbf24 });
