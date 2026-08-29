const { register } = require('../utils/interaction');
module.exports = register({ name: 'abraco', aliases: ['hug'], gif: 'hug', target: '{author} abraçou {target}!', botReply: '{bot} retribuiu o abraço de {author}!', returnLabel: 'Devolver abraço', returnEmoji: '🤗', color: 0xf9a8d4 });
