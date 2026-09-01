const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    SlashCommandBuilder
} = require('discord.js');
const music = require('../utils/music');

function controls() {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('music:pause').setLabel('Pausar').setEmoji('⏸️').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('music:resume').setLabel('Retomar').setEmoji('▶️').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('music:skip').setLabel('Pular').setEmoji('⏭️').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('music:stop').setLabel('Parar').setEmoji('⏹️').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('music:loop').setLabel('Loop').setEmoji('🔁').setStyle(ButtonStyle.Secondary)
    );
}

function trackEmbed(track, { position, playing, user }) {
    const sourceLabel = {
        soundcloud: 'SoundCloud',
        youtube: 'YouTube',
        spotify: 'Spotify',
        deezer: 'Deezer',
        jiosaavn: 'JioSaavn',
        bandcamp: 'Bandcamp',
        radio: 'Rádio',
        direct: 'Link direto',
        vimeo: 'Vimeo'
    }[track.source] || track.channel || track.source || 'Desconhecido';

    const emb = new EmbedBuilder()
        .setColor(0xa78bfa)
        .setAuthor({
            name: playing ? 'Tocando agora' : 'Adicionado à fila',
            iconURL: user?.displayAvatarURL?.({ size: 64 })
        })
        .setTitle(track.title.slice(0, 200))
        .setURL(track.url)
        .addFields(
            { name: 'Duração', value: music.fmtDuration(track.duration), inline: true },
            { name: 'Fonte', value: String(sourceLabel).slice(0, 40), inline: true },
            {
                name: playing ? 'Status' : 'Posição',
                value: playing ? '▶️ Reproduzindo' : `#${position}`,
                inline: true
            }
        )
        .setFooter({ text: 'O.play · O.queue · O.np · O.skip · O.stop' })
        .setTimestamp();
    if (track.thumbnail) emb.setThumbnail(track.thumbnail);
    return emb;
}

async function runPlay(ctx, query, member, channel) {
    if (!member?.voice?.channel) {
        return { content: '❌ Entre em um canal de voz primeiro.' };
    }
    if (!query?.trim()) {
        return {
            embeds: [
                new EmbedBuilder()
                    .setColor(0xa78bfa)
                    .setTitle('🎵  Play')
                    .setDescription(
                        [
                            'Uso: `O.play <nome ou link>`',
                            '',
                            '**Fontes suportadas (todas gratuitas):**',
                            '• SoundCloud',
                            '• YouTube',
                            '• Spotify (busca)',
                            '• Deezer',
                            '• JioSaavn',
                            '• Bandcamp',
                            '• Links diretos (.mp3, .ogg, etc)',
                            '• Rádios / streams',
                            '',
                            'Exemplos:',
                            '`O.play never gonna give you up`',
                            '`O.play https://soundcloud.com/...`',
                            '`O.play https://open.spotify.com/track/...`',
                            '`O.play https://youtu.be/...`',
                            '',
                            'Controles: pausar · retomar · pular · parar · loop'
                        ].join('\n')
                    )
            ]
        };
    }

    const result = await music.enqueue(
        ctx.guild,
        member.voice.channel,
        channel,
        query.trim(),
        ctx.user || ctx.author
    );

    if (!result.ok) return { content: `❌ ${result.error}` };

    return {
        embeds: [
            trackEmbed(result.track, {
                position: result.position,
                playing: result.playing,
                user: ctx.user || ctx.author
            })
        ],
        components: [controls()]
    };
}

module.exports = {
    name: 'play',
    aliases: ['p', 'tocar'],
    description: 'Toca música de várias fontes gratuitas',
    data: new SlashCommandBuilder()
        .setName('play')
        .setDescription('Toca música (SoundCloud, YouTube, Spotify, etc)')
        .addStringOption((o) =>
            o.setName('busca').setDescription('Nome ou link de qualquer fonte suportada').setRequired(true)
        ),

    async execute(message, args) {
        const query = args.join(' ');
        const wait = await message.reply('🔍 Buscando…');
        try {
            const payload = await runPlay(message, query, message.member, message.channel);
            await wait.edit(payload);
        } catch (e) {
            console.error('[play]', e);
            await wait.edit(`❌ ${e.message || 'Erro ao tocar.'}`);
        }
    },

    async executeSlash(interaction) {
        await interaction.deferReply();
        const query = interaction.options.getString('busca');
        try {
            const payload = await runPlay(
                interaction,
                query,
                interaction.member,
                interaction.channel
            );
            await interaction.editReply(payload);
        } catch (e) {
            console.error('[play]', e);
            await interaction.editReply(`❌ ${e.message || 'Erro ao tocar.'}`);
        }
    },

    async handleComponent(interaction) {
        if (!interaction.customId.startsWith('music:')) return;
        if (!interaction.member?.voice?.channel) {
            return interaction.reply({ content: 'Entre no canal de voz.', ephemeral: true });
        }

        const action = interaction.customId.split(':')[1];
        const gid = interaction.guildId;

        if (action === 'pause') {
            const ok = music.pause(gid);
            return interaction.reply({ content: ok ? '⏸️ Pausado.' : '❌ Nada tocando.', ephemeral: true });
        }
        if (action === 'resume') {
            const ok = music.resume(gid);
            return interaction.reply({ content: ok ? '▶️ Retomado.' : '❌ Nada pausado.', ephemeral: true });
        }
        if (action === 'skip') {
            const ok = music.skip(gid);
            return interaction.reply({ content: ok ? '⏭️ Pulado.' : '❌ Nada na fila.', ephemeral: true });
        }
        if (action === 'stop') {
            music.stop(gid);
            return interaction.reply({ content: '⏹️ Parado e desconectado.', ephemeral: true });
        }
        if (action === 'loop') {
            const mode = music.setLoop(gid, 'cycle');
            const label = mode === 'track' ? 'faixa' : mode === 'queue' ? 'fila' : 'desligado';
            return interaction.reply({ content: `🔁 Loop: **${label}**`, ephemeral: true });
        }
    }
};
