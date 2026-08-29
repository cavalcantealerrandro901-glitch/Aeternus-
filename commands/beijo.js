const { register } = require('../utils/interaction');
module.exports = register({ name: 'beijo', aliases: ['kiss'], gif: 'kiss', target: '{author} beijou {target}!', botReply: '{bot} beijou {author} de volta!', returnLabel: 'Devolver beijo', returnEmoji: '😘', color: 0xf472b6 });
