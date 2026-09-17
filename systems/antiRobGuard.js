const antiRob = require('../utils/antiRobRole');

/**
 * Garante que o cargo anti-roubo só permaneça se foi dado via cargo-membro.
 * Qualquer atribuição fora do comando é removida automaticamente.
 */
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

            // Cargo adicionado → só mantém se autorizado pelo comando
            if (!had && has) {
                if (!antiRob.isAuthorized(newMember.guild.id, newMember.id)) {
                    await newMember.roles
                        .remove(
                            roleId,
                            'Cargo anti-roubo só pode ser atribuído pelo comando cargo-membro'
                        )
                        .catch(() => {});
                    console.log(
                        `[antiRobGuard] removido cargo não autorizado de ${newMember.user?.tag || newMember.id} em ${newMember.guild.id}`
                    );
                }
            }
        } catch (e) {
            console.error('[antiRobGuard]', e.message || e);
        }
    });

    console.log('[antiRobGuard] ativo · cargo anti-roubo só via cargo-membro');
}

module.exports = { setup };
