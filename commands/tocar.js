const { addSong, stopMusic, skipMusic } = require('../systems/musicSystem');

module.exports = {
    name: 'play',
    aliases: ['tocar', 'p', 'pular', 'parar', 'stop', 'skip'],
    description: 'Sistema de música para canais de voz.',
    async execute(message, args) {
        const commandName = message.content.slice(1).split(/ +/)[0].toLowerCase();

        if (commandName === 'parar' || commandName === 'stop') {
            const stopped = stopMusic(message.guild.id);
            return message.reply(stopped ? '⏹️ Reprodução parada e saí do canal de voz.' : '❌ Não há nenhuma música tocando.');
        }

        if (commandName === 'pular' || commandName === 'skip') {
            const skipped = skipMusic(message.guild.id);
            return message.reply(skipped ? '⏭️ Música pulada!' : '❌ Não há nenhuma música para pular.');
        }

        const query = args.join(' ');
        if (!query) return message.reply('❌ Digite o nome ou link da música! Exemplo: `!play nome da musica`');

        await addSong(message, query);
    }
};
