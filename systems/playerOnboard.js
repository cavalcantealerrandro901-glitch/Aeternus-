/**
 * Convida usuarios sem perfil de jogador via DM.
 */
const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');
const player = require('../utils/player');

const INVITE_COOLDOWN = 1000 * 60 * 60 * 24;
const lastInvite = new Map();

function inviteEmbed() {
    return new EmbedBuilder()
        .setColor(0xa78bfa)
        .setTitle('Crie seu perfil de jogador')
        .setDescription(
            [
                'Voce ainda **nao tem um perfil** no Aeternus.',
                '',
                'No perfil voce define:',
                '- **Nome** de aventureiro',
                '- **Classe** (Mago, Arqueiro, Tanque, Healer...)',
                '- **Foto** do personagem',
                '',
                'Depois use `O.j perfil` no servidor para ver sua ficha.',
                '',
                'Clique no botao abaixo para comecar.'
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
    if (now - last < INVITE_COOLDOWN) return false;

    try {
        await user.send({
            embeds: [inviteEmbed()],
            components: [inviteRow()]
        });
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

    // Não envia DMs em massa ao iniciar nem sorteia convites em mensagens comuns.
    // O convite é enviado apenas quando um membro novo entra no servidor.

    console.log('[playerOnboard] ativo');
}

module.exports = { setup, sendInvite };
