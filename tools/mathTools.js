/**
 * Módulo de Cálculos Matemáticos Seguros
 */
function safeEvalMath(expression) {
    const clean = expression.replace(/[^0-9+\-*/%().^\s]/g, '').trim();
    if (!clean) return null;

    try {
        const formatted = clean.replace(/\^/g, '**');
        const result = new Function(`"use strict"; return (${formatted});`)();
        if (typeof result === 'number' && !isNaN(result) && isFinite(result)) {
            return result;
        }
    } catch (_) {}
    return null;
}

function registerMathTools(ai) {
    ai.registerTool({
        name: 'calculate_math',
        description: 'Realiza cálculos matemáticos de forma segura',
        handler: async (args) => {
            const expr = String(args.expression || '').trim();
            const result = safeEvalMath(expr);

            if (result === null) {
                return { ok: false, error: 'Expressão matemática inválida ou não suportada.' };
            }

            return { ok: true, expression: expr, result };
        }
    });
}

module.exports = registerMathTools;
