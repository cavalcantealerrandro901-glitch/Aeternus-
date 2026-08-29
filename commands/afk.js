const afk = require('../utils/afk');
module.exports = {
    name: 'afk',
    async execute(message, args) {
        const reason = args.join(' ') || 'AFK';
        afk.set(message.author.id, reason);
        await message.reply(`💤 AFK: **${reason}**`);
    }
};
