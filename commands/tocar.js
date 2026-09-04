const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const {
    needVoice,
    voiceState,
    ensureCrypto,
    COLOR_ERR
} = require('../systems/music');

module.exports = {
    name: 'tocar',
    aliases: ['play', 'p', 'musica'],
    description: 'Tocar música',
    data: new SlashCommandBuilder()
        .setName('tocar')
        .setDescription('Tocar música')
        .addStringOption((o) =>
            o
                .setName('busca')
                .setDescription('Nome ou URL (YouTube, Spotify, SoundCloud…)')
                .setRequired(true)
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
            await ensureCrypto(message.client);
            await message.channel.sendTyping();
            await message.client.distube.play(memberVC, query, {
                member: message.member,
                textChannel: message.channel,
                message
            });
        } catch (e) {
            const msg = String(e.message || e);
            let tip = msg.slice(0, 400);
            if (/30 seconds|connect to the voice/i.test(msg)) {
                tip +=
                    '\n\nConfira permissões **Conectar/Falar**, reinicie o deploy e veja se o log mostra `crypto: libsodium-wrappers OK`.';
            }
            await message.reply({
                embeds: [
                    new EmbedBuilder().setColor(COLOR_ERR).setTitle('❌ Erro').setDescription(tip)
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
            await ensureCrypto(i.client);
            await i.client.distube.play(memberVC, query, {
                member: i.member,
                textChannel: i.channel
            });
            await i.editReply({ content: `🎵 Buscando: **${query.slice(0, 80)}**` });
        } catch (e) {
            const msg = String(e.message || e);
            let tip = msg.slice(0, 400);
            if (/30 seconds|connect to the voice/i.test(msg)) {
                tip +=
                    '\n\nConfira permissões **Conectar/Falar** e o log `crypto: libsodium-wrappers OK`.';
            }
            await i.editReply({
                embeds: [
                    new EmbedBuilder().setColor(COLOR_ERR).setTitle('❌ Erro').setDescription(tip)
                ]
            });
        }
    }
};
