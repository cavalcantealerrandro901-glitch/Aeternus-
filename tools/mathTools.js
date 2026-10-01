module.exports = function register({ registerTool }) {
  registerTool({
    name: 'calcular',
    description: 'Calcula expressão. Args: expr',
    async handler(args) {
      const expr = String(args.expr || args.expressao || args.expression || '').replace(/[^0-9+\-*/%().\s]/g, '');
      if (!expr) return { error: 'Informe a expressão.' };
      try {
        const result = Function('"use strict"; return (' + expr + ')')();
        if (typeof result !== 'number' || !Number.isFinite(result)) return { error: 'Resultado inválido.' };
        return { ok: true, text: '🧮 Resultado: **' + result + '**' };
      } catch (e) {
        return { error: 'Expressão inválida.' };
      }
    }
  });
};
