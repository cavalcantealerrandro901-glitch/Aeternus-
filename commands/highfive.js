const { register } = require('../utils/interaction');
module.exports = register({ name: 'highfive', aliases: ['tocaqui'], gif: 'highfive', target: '{author} deu high five em {target}!', botReply: '{bot} retribuiu!', returnLabel: 'Toca aqui', returnEmoji: '✋', color: 0x34d399 });
