/**
 * Ferramentas de Informações do Servidor e Membros
 */
function registerServerTools(ai) {
    ai.registerTool({
        name: 'get_server_info',
        description: 'Obtém detalhes e estatísticas do servidor atual',
        handler: async (args, rt) => {
            const g = rt.guild;
            if (!g) return { ok: false, error: 'Fora de um servidor.' };

            return {
                ok: true,
                server: {
                    id: g.id,
                    name: g.name,
                    ownerId: g.ownerId,
                    memberCount: g.memberCount,
                    channelCount: g.channels?.cache?.size || 0,
                    roleCount: g.roles?.cache?.size || 0,
                    premiumTier: g.premiumTier ?? 0,
                    premiumSubscriptionCount: g.premiumSubscriptionCount ?? 0,
                    createdAt: g.createdAt ? new Date(g.createdAt).toLocaleDateString('pt-BR') : 'Desconhecido'
                }
            };
        }
    });

    ai.registerTool({
        name: 'get_member_info',
        description: 'Obtém informações sobre um membro do servidor',
        handler: async (args, rt) => {
            const g = rt.guild;
            if (!g) return { ok: false, error: 'Fora de um servidor.' };

            const target = String(args.target || rt.userId).trim();
            let member = null;

            if (/^\d{17,19}$/.test(target)) {
                member = g.members.cache.get(target) || (await g.members.fetch(target).catch(() => null));
            }

            if (!member && target) {
                const norm = target.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                member = g.members.cache.find(
                    (m) =>
                        m.user.username.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(norm) ||
                        m.displayName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(norm)
                );
            }

            if (!member) return { ok: false, error: 'Membro não encontrado.' };

            const highestRole = member.roles?.highest?.name !== '@everyone' ? member.roles?.highest?.name : 'Sem cargo especial';

            return {
                ok: true,
                member: {
                    id: member.id,
                    displayName: member.displayName,
                    tag: member.user.tag || member.user.username,
                    isBot: member.user.bot,
                    highestRole,
                    joinedAt: member.joinedAt ? new Date(member.joinedAt).toLocaleDateString('pt-BR') : 'Desconhecido',
                    createdAt: member.user.createdAt ? new Date(member.user.createdAt).toLocaleDateString('pt-BR') : 'Desconhecido'
                }
            };
        }
    });
}

module.exports = registerServerTools;
