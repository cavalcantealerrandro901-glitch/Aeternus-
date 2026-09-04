const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const { needVoice, voiceState, COLOR, COLOR_ERR } = require('../systems/music');

module.exports = {
    name: 'tocar',
    aliases: ['play', 'p', 'musica'],
    description: 'Tocar música',
    data: new SlashCommandBuilder()
        .setName('tocar')
        .setDescription('Tocar música')
        .addStringOption((o) =>
            o.setName('busca').setDescription('Nome ou URL (YouTube, Spotify, SoundCloud…)').setRequired(true)
        ),

    async execute(message, args) {
        if (!message.client.distube) {
            return message.reply('❌ Sistema de música não carregou. Veja os logs do bot.');
        }
        const err = needVoice(message, { memberNeed: true });
        if (err) return message.reply(err);
        const query = args.join(' ').trim();
        if (!query) return message.reply('Uso: `O.tocar <nome ou url>`');

        const { memberVC } = voiceState(message);
        try {
            await message.channel.sendTyping();
            await message.client.distube.play(memberVC, query, {
                member: message.member,
                textChannel: message.channel,
                message
            });
        } catch (e) {
            await message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(COLOR_ERR)
                        .setTitle('❌ Erro')
                        .setDescription(String(e.message || e).slice(0, 500))
                ]
            });
        }
    },

    async executeSlash(i) {
        if (!i.client.distube) {
            return i.reply({ content: '❌ Sistema de música não carregou.', ephemeral: true });
        }
        const err = needVoice(i, { memberNeed: true });
        if (err) return i.reply({ content: err, ephemeral: true });
        const query = i.options.getString('busca', true);
        const { memberVC } = voiceState(i);
        await i.deferReply();
        try {
            await i.client.distube.play(memberVC, query, {
                member: i.member,
                textChannel: i.channel
            });
            await i.editReply({ content: `🎵 Buscando: **${query.slice(0, 80)}**` });
        } catch (e) {
            await i.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(COLOR_ERR)
                        .setTitle('❌ Erro')
                        .setDescription(String(e.message || e).slice(0, 500))
                ]
            });
        }
    }
};
