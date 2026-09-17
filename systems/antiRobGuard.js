const { AuditLogEvent } = require('discord.js');
const antiRob = require('../utils/antiRobRole');

/**
 * Garante que o cargo anti-roubo só permaneça se foi dado via cargo-membro.
 * Se um ADM (ou qualquer um) colocar o cargo manualmente, o bot remove e avisa no PV.
 */
async function findWhoAddedRole(guild, targetUserId, roleId) {
    try {
        const logs = await guild.fetchAuditLogs({
            type: AuditLogEvent.MemberRoleUpdate,
            limit: 6
        });
        const now = Date.now();
        for (const entry of logs.entries.values()) {
            if (now - entry.createdTimestamp > 15_000) continue;
            if (entry.target?.id !== String(targetUserId)) continue;
            const changes = entry.changes || [];
            const added = changes.some(
                (c) =>
                    c.key === '$add' &&
                    Array.isArray(c.new) &&
                    c.new.some((r) => String(r.id) === String(roleId))
            );
            if (added && entry.executor) {
                return entry.executor;
            }
        }
    } catch (_) {
        /* sem permissão de ver o registro de auditoria */
    }
    return null;
}

function setup(client) {
    client.on('guildMemberUpdate', async (oldMember, newMember) => {
        try {
            const roleId = antiRob.ANTI_ROB_ROLE_ID;
            const had = oldMember.roles.cache.has(roleId);
            const has = newMember.roles.cache.has(roleId);

            // Cargo removido → limpa autorização
            if (had && !has) {
                antiRob.revoke(newMember.guild.id, newMember.id);
                return;
            }

            // Cargo adicionado fora do comando → remove e avisa o responsável
            if (!had && has) {
                if (antiRob.isAuthorized(newMember.guild.id, newMember.id)) {
                    return;
                }

                // Pequeno atraso para o log de auditoria ficar disponível
                await new Promise((r) => setTimeout(r, 900));

                // Confirma se ainda tem o cargo (pode ter sido autorizado no intervalo)
                const fresh = await newMember.guild.members
                    .fetch(newMember.id)
                    .catch(() => null);
                if (!fresh || !fresh.roles.cache.has(roleId)) return;
                if (antiRob.isAuthorized(newMember.guild.id, newMember.id)) return;

                await fresh.roles
                    .remove(
                        roleId,
                        'Cargo anti-roubo só pode ser atribuído pelo comando cargo-membro'
                    )
                    .catch(() => {});

                const executor = await findWhoAddedRole(
                    newMember.guild,
                    newMember.id,
                    roleId
                );

                const aviso = [
                    '🔐 **Cargo anti-roubo bloqueado**',
                    '',
                    'Você tentou colocar o cargo de proteção em **' +
                        (newMember.user?.tag || newMember.id) +
                        '** de forma manual.',
                    '',
                    'Esse cargo **não pode** ser dado pela interface do Discord nem por outros bots.',
                    'Use apenas o comando:',
                    '• `/cargo-membro`',
                    '• ou o prefixo `cargo @membro @cargo`',
                    '',
                    'O cargo foi **retirado automaticamente**.'
                ].join('\n');

                // Avisa quem colocou (ADM)
                if (executor && !executor.bot) {
                    await executor.send(aviso).catch(() => {});
                }

                // Se não achou o executor, tenta avisar o dono do servidor
                if (!executor || executor.bot) {
                    try {
                        const owner = await newMember.guild.fetchOwner();
                        if (owner?.user && !owner.user.bot) {
                            await owner.user
                                .send(
                                    aviso +
                                        '\n\n_Não foi possível identificar quem atribuiu o cargo; este aviso foi enviado ao dono do servidor._'
                                )
                                .catch(() => {});
                        }
                    } catch (_) {}
                }

                console.log(
                    `[antiRobGuard] removido cargo manual de ${newMember.user?.tag || newMember.id}` +
                        (executor ? ` · por ${executor.tag}` : '') +
                        ` · guild ${newMember.guild.id}`
                );
            }
        } catch (e) {
            console.error('[antiRobGuard]', e.message || e);
        }
    });

    console.log('[antiRobGuard] ativo · anti-roubo só via cargo-membro · remove manual + DM');
}

module.exports = { setup };
