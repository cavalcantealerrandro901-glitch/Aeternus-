/**
 * Ferramentas de RPG e Criação de Classes
 */
function registerRpgTools(ai) {
    ai.registerTool({
        name: 'get_player_summary',
        description: 'Resumo do perfil RPG',
        handler: async (args, rt) => {
            try {
                const player = require('../utils/player');
                const id = String(args.userId || rt.userId);
                const p = player.get?.(id);
                if (!p) return { ok: false, error: 'Sem ficha de personagem.' };
                return {
                    ok: true,
                    userId: id,
                    classId: p.classId || p.classe || null,
                    level: p.level || p.nivel || null,
                    attrs: p.attrs || p.atributos || null
                };
            } catch (e) {
                return { ok: false, error: e.message || String(e) };
            }
        }
    });

    ai.registerTool({
        name: 'design_rpg_class',
        description: 'Gera um modelo de classe RPG',
        handler: async (args) => {
            const power = String(args.powerLevel || 'rara').toLowerCase();
            const base = /unica|lend/.test(power) ? 220 : /epic|epica/.test(power) ? 160 : /rar/.test(power) ? 120 : 80;
            const theme = String(args.theme || 'mistério');
            const name = String(args.name || 'Nova Classe');
            return {
                ok: true,
                classId: name
                    .toLowerCase()
                    .normalize('NFD')
                    .replace(/[\u0300-\u036f]/g, '')
                    .replace(/[^a-z0-9]+/g, '_')
                    .replace(/^_|_$/g, '')
                    .slice(0, 40),
                name,
                theme,
                suggestedStats: {
                    forca: base + 10,
                    agilidade: base,
                    defesa: base + 5,
                    vida: base + 15
                },
                suggestedActives: [
                    { name: `${theme.split(' ')[0]} I`, power: Math.round(base * 1.2), note: 'Dano Principal' },
                    { name: `${theme.split(' ')[0]} II`, power: Math.round(base * 0.9), note: 'Controle de Grupo' },
                    { name: 'Evasão', power: Math.round(base * 0.7), note: 'Mobilidade' },
                    { name: 'Despertar', power: Math.round(base * 1.8), note: 'Habilidade Suprema' }
                ],
                suggestedPassives: [
                    { name: 'Essência', note: `Tema: ${theme.slice(0, 40)}` },
                    { name: 'Resiliência', note: 'Sinergia de Combate' }
                ]
            };
        }
    });
}

module.exports = registerRpgTools;
