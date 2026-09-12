const { register } = require('../utils/interaction');
module.exports = register({
    name: 'maos',
    aliases: ['maosdadas', 'handhold', 'mãos', 'maos-dadas'],
    description: 'Segura a mão de alguém',
    gif: 'handhold',
    target: '{author} segurou a mão de {target}!',
    botReply: '{bot} entrelaçou as mãos com {author}!',
    returnLabel: 'Segurar de volta',
    returnEmoji: '🤝',
    color: 0xc4b5fd
});
