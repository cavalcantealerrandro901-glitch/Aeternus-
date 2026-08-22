const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const registro = require('../utils/registro');

module.exports = {
    name: 'registro',
    aliases: ['reg', 'anotar'],
    description: 'Registra uma informação do servidor',
    async execute(message, args) {
        if (!message.member?.permissions?.has(PermissionFlagsBits.ManageGuild)) {
            return message.reply('❌ Precisa de **Gerenciar Servidor**.');
        }

        const texto = args.join(' ').trim();
        if (!texto || texto.length < 2) {
            return message.reply(
                'Uso: `O.registro <texto>`\nEx.: `O.registro Evento de Páscoa em 20/04`'
            );
        }

        const item = registro.add(message.guild.id, {
            text: texto.slice(0, 1000),
            authorId: message.author.id,
            authorTag: message.author.tag
        });

        const embed = new EmbedBuilder()
            .setColor(0x38bdf8)
            .setTitle('📝 Registro salvo')
            .setDescription(item.text)
            .addFields(
                { name: 'ID', value: `\`${item.id}\``, inline: true },
                { name: 'Por', value: `${message.author}`, inline: true }
            )
            .setFooter({ text: 'Veja com O.registros' })
            .setTimestamp();

        await message.reply({ embeds: [embed] });
    }
};
