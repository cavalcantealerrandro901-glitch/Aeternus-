const { register } = require('../utils/interaction');

module.exports = register({
    name: 'matar',
    aliases: ['kill', 'elimina', 'assassinar'],
    description: '“Mata” alguém de brincadeira (GIF de eliminação)',
    gif: 'kill',
    target: '{author} eliminou {target}! 💀',
    botReply: '{bot} voltou dos mortos e eliminou {author}!',
    returnLabel: 'Vingar',
    returnEmoji: '💀',
    color: 0x64748b
});
