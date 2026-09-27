/**
 * Ferramentas de Economia (Éter e Loritta)
 */
function registerEconomyTools(ai) {
    ai.registerTool({
        name: 'get_eter_balance',
        description: 'Consulta o saldo de Éter',
        handler: async (args, rt) => {
            try {
                const eter = require('../utils/eter');
                const id = String(args.userId || rt.userId);
                return { userId: id, eter: eter.get(id) };
            } catch (e) {
                return { userId: rt.userId, eter: null, error: e.message };
            }
        }
    });

    ai.registerTool({
        name: 'get_loritta_sonhos',
        description: 'Consulta o saldo de Sonhos na Loritta',
        handler: async (args, rt) => {
            try {
                const loritta = require('../utils/loritta');
                const id = String(args.userId || rt.userId);
                if (typeof loritta.configured === 'function' && !loritta.configured()) {
                    return { ok: false, error: 'Chave LORITTA_API_TOKEN não configurada.' };
                }
                const u = await loritta.getUser(id);
                return { ok: true, userId: id, sonhos: u.sonhos ?? u.money ?? null };
            } catch (e) {
                return { ok: false, error: e.message || String(e) };
            }
        }
    });
}

module.exports = registerEconomyTools;
