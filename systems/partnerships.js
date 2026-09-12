/**
 * Cancela parceria se o representante sair do servidor.
 * Avisa no canal onde a parceria foi postada e no DM do representante.
 */
const partnerships = require('../utils/partnerships');

async function onMemberLeave(member) {
    if (!member?.guild || member.user?.bot) return;

    const active = partnerships.findByRep(member.guild.id, member.id);
    if (!active.length) return;

    const hostName = member.guild.name;
    const repTag =
        member.user?.tag ||
        member.user?.username ||
        member.displayName ||
        String(member.id);

    for (const p of active) {
        partnerships.cancel(member.guild.id, p.id);

        // 1) Apaga o anúncio original da parceria
        if (p.channelId && p.messageId) {
            try {
                const ch = await member.guild.channels.fetch(p.channelId).catch(() => null);
                if (ch?.messages) {
                    const msg = await ch.messages.fetch(p.messageId).catch(() => null);
                    if (msg) await msg.delete().catch(() => {});
                }
            } catch (_) {}
        }

        const vars = {
            host: hostName,
            server: p.serverName || 'Servidor parceiro',
            rep: `<@${member.id}>`,
            repTag,
            invite: p.inviteUrl || '—'
        };

        // 2) Mensagem no canal onde a parceria foi postada
        try {
            if (p.channelId) {
                const postCh = await member.guild.channels.fetch(p.channelId).catch(() => null);
                if (postCh?.isTextBased?.() || typeof postCh?.send === 'function') {
                    await postCh
                        .send(partnerships.cancelChannelPayload(vars))
                        .catch(() => {});
                }
            }
        } catch (_) {}

        // 3) Se o painel tiver outro canal de log de parcerias e for diferente, avisa lá também
        try {
            const conf = partnerships.getConfig(member.guild.id);
            if (conf.channelId && String(conf.channelId) !== String(p.channelId)) {
                const logCh = await member.guild.channels.fetch(conf.channelId).catch(() => null);
                if (logCh?.isTextBased?.() || typeof logCh?.send === 'function') {
                    await logCh
                        .send(partnerships.cancelChannelPayload(vars))
                        .catch(() => {});
                }
            }
        } catch (_) {}

        // 4) DM do representante (ainda funciona se o usuário não bloqueou o bot)
        try {
            const user = member.user || (await member.client.users.fetch(member.id).catch(() => null));
            if (user) {
                await user.send(partnerships.cancelDmPayload(vars)).catch(() => {});
            }
        } catch (_) {}

        console.log(
            `[partnership] cancelada ${p.id} em ${member.guild.id} — rep ${member.id} saiu · canal=${p.channelId || '?'} · dm tentado`
        );
    }
}

function setup(client) {
    client.on('guildMemberRemove', (member) => {
        onMemberLeave(member).catch((e) =>
            console.warn('[partnership] leave:', e.message)
        );
    });
    console.log('[partnership] ativo · cancela se representante sair (canal + DM)');
}

module.exports = { setup, onMemberLeave };
