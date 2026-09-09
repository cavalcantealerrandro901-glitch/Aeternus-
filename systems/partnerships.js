/**
 * Cancela parceria se o representante sair do servidor
 */
const partnerships = require('../utils/partnerships');

async function onMemberLeave(member) {
    if (!member?.guild || member.user?.bot) return;
    const active = partnerships.findByRep(member.guild.id, member.id);
    if (!active.length) return;

    for (const p of active) {
        partnerships.cancel(member.guild.id, p.id);

        if (p.channelId && p.messageId) {
            try {
                const ch = await member.guild.channels.fetch(p.channelId).catch(() => null);
                if (ch?.messages) {
                    const msg = await ch.messages.fetch(p.messageId).catch(() => null);
                    if (msg) await msg.delete().catch(() => {});
                }
            } catch (_) {}
        }

        try {
            const conf = partnerships.getConfig(member.guild.id);
            const chId = conf.channelId || p.channelId;
            if (chId) {
                const ch = await member.guild.channels.fetch(chId).catch(() => null);
                if (ch?.isTextBased()) {
                    await ch
                        .send(
                            `❌ Parceria **${p.serverName}** cancelada — o representante <@${member.id}> saiu do servidor. O anúncio/convite foi removido.`
                        )
                        .catch(() => {});
                }
            }
        } catch (_) {}

        console.log(
            `[partnership] cancelada ${p.id} em ${member.guild.id} — rep ${member.id} saiu`
        );
    }
}

function setup(client) {
    client.on('guildMemberRemove', (member) => {
        onMemberLeave(member).catch((e) =>
            console.warn('[partnership] leave:', e.message)
        );
    });
    console.log('[partnership] ativo · cancela se representante sair');
}

module.exports = { setup, onMemberLeave };
