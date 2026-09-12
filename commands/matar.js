const { register } = require('../utils/interaction');
module.exports = register({
    name: 'matar',
    aliases: ['kill', 'elimina'],
    description: '“Mata” alguém (brincadeira)',
    gif: 'kill',
    target: '{author} eliminou {target} (de brincadeira)!',
    botReply: '{bot} ressuscitou e eliminou {author}!',
    returnLabel: 'Vingar',
    returnEmoji: '💀',
    color: 0x94a3b8
});
