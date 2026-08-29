const { register } = require('../utils/interaction');
module.exports = register({ name: 'dancar', aliases: ['dance'], gif: 'dance', solo: '{author} está dançando!', target: '{author} dançou com {target}!', botReply: '{bot} dançou junto!', returnLabel: 'Dançar', returnEmoji: '💃', color: 0xc4b5fd, allowSelf: true });
