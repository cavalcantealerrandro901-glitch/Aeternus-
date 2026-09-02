/**
 * Convida usuários sem perfil de jogador via DM.
 */
const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');
const player = require('../utils/player');

const invited = new Set();
const INVITE_COOLDOWN = 1000 * 60 * 60 * 24;
const lastInvite = new Map();

function inviteEmbed() {
    return new EmbedBuilder()
        .setColor(0xa78bfa)
        .setTitle('🎮 Crie seu perfil de jogador')
        .setDescription(
            [
                'Você ainda **não tem um perfil** no Aeternus.',
                '',
                'No perfil você define:',
                '• **Nome** de aventureiro',
                '• **Classe** (Mago, Arqueiro, Tanque, Healer…)',
                '• **Foto** do personagem',
                '',
                'Depois use `O.j perfil` no servidor para ver sua ficha.',
                '',
                'Clique no botão abaixo para começar.'
            ].join('\n')
        )
        .setFooter({ text: 'Aeternus · RPG' });
}

function inviteRow() {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('j:start')
            .setLabel('Criar meu perfil')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('✨')
    );
}

async function sendInvite(user) {
    if (!user || user.bot) return false;
    if (player.has(user.id)) return false;

    const now = Date.now();
    const last = lastInvite.get(user.id) || 0;
    if (now - last < INVITE_COOLDOWN && invited.has(user.id)) return false;

    try {
        await user.send({
            embeds: [inviteEmbed()],
            components: [inviteRow()]
        });
        invited.add(user.id);
        lastInvite.set(user.id, now);
        return true;
    } catch {
        return false;
    }
}

function setup(client) {
    client.on('guildMemberAdd', async (member) => {
        if (member.user.bot) return;
        if (player.has(member.id)) return;
        setTimeout(() => sendInvite(member.user), 2500);
    });

    client.once('ready', async () => {
        try {
            if (player.count() > 0) {
                console.log(`🎮 [player] ${player.count()} perfil(is) carregado(s)`);
                return;
            }
            console.log('🎮 [player] nenhum perfil — enviando convites iniciais…');
            let sent = 0;
            for (const guild of client.guilds.cache.values()) {
                const members = await guild.members.fetch().catch(() => null);
                if (!members) continue;
                for (const m of members.values()) {
                    if (m.user.bot) continue;
                    if (await sendInvite(m.user)) sent++;
                    if (sent >= 40) break;
                    await new Promise((r) => setTimeout(r, 400));
                }
                if (sent >= 40) break;
            }
            console.log(`🎮 [player] convites iniciais enviados: ${sent}`);
        } catch (e) {
            console.error('[player onboard]', e);
        }
    });

    client.on('messageCreate', async (message) => {
        try {
            if (!message.guild || message.author.bot) return;
            if (player.has(message.author.id)) return;
            const last = lastInvite.get(message.author.id) || 0;
            if (Date.now() - last < INVITE_COOLDOWN) return;
            if (Math.random() > 0.15) return;
            await sendInvite(message.author);
        } catch (_) {}
    });

    console.log('🎮 [playerOnboard] ativo');
}

module.exports = { setup, sendInvite };
