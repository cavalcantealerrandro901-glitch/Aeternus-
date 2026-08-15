module.exports = {
    name: 'afk',
    execute(message, args) {
        const reason = args.join(' ') || 'Sem motivo';
        
        // Salvamos no cache do bot (client.afk)
        // Isso estará disponível em qualquer lugar pois o client é passado
        message.client.afk.set(message.author.id, {
            reason: reason,
            time: Date.now()
        });

        message.reply(`✅ Você está agora AFK. Motivo: ${reason}`);
    }
};
