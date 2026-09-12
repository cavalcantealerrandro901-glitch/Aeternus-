const { register } = require('../utils/interaction');
module.exports = register({
    name: 'sorrir',
    aliases: ['smile', 'sorriso'],
    description: 'Sorri para alguém',
    gif: 'smile',
    target: '{author} sorriu para {target}!',
    solo: '{author} está sorrindo!',
    allowSelf: true,
    botReply: '{bot} sorriu de volta para {author}!',
    returnLabel: 'Sorrir de volta',
    returnEmoji: '😊',
    color: 0xfde68a
});
