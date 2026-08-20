module.exports = {
    name: 'afk',
    aliases: ['ausente'],
    description: 'Define seu status como ausente no servidor.',
    async execute(message, args, client) {
        const reason = args.join(' ') || 'Ausente';
        
        client.afk.set(message.author.id, {
            reason,
            timestamp: Date.now()
        });

        await message.reply(`💤 **${message.author.username}**, seu status foi definido como **AFK**: \`${reason}\``);
    }
};
