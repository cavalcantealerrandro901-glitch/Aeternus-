const { register } = require('../utils/interaction');
module.exports = register({
    name: 'lambida',
    aliases: ['lick', 'lamber'],
    description: 'Dá uma lambida',
    gif: 'lick',
    target: '{author} lambeu {target}!',
    botReply: '{bot} lambeu {author} de volta!',
    returnLabel: 'Lamber de volta',
    returnEmoji: '😛',
    color: 0xf0abfc
});
