/**
 * Aceita: 1000 | 1.5k | 2m | all | tudo | half | metade | 50%
 * @param {string} input
 * @param {number} [balance] necessário para all/half
 */
function parseAmount(input, balance = null) {
    if (input == null) return NaN;
    let s = String(input).trim().toLowerCase().replace(/\s/g, '').replace(/,/g, '.');
    if (!s) return NaN;

    if (['all', 'tudo', 'max', 'full'].includes(s)) {
        if (balance == null || !Number.isFinite(balance)) return NaN;
        return Math.max(0, Math.floor(balance));
    }
    if (['half', 'metade', 'meio', '50%'].includes(s)) {
        if (balance == null || !Number.isFinite(balance)) return NaN;
        return Math.max(0, Math.floor(Number(balance) / 2));
    }

    const m = s.match(/^([0-9]*\.?[0-9]+)([km])?$/i);
    if (!m) {
        const n = Number(s.replace(/\./g, ''));
        return Number.isFinite(n) ? Math.floor(n) : NaN;
    }
    let n = parseFloat(m[1]);
    if (!Number.isFinite(n)) return NaN;
    const suf = (m[2] || '').toLowerCase();
    if (suf === 'k') n *= 1e3;
    if (suf === 'm') n *= 1e6;
    return Math.floor(n);
}

/**
 * Resolve aposta com validação de saldo.
 * @returns {{ ok:true, amount:number, balance:number } | { ok:false, error:string }}
 */
function resolveBet(input, balance, { min = 1, label = 'saldo' } = {}) {
    const bal = Math.max(0, Math.floor(Number(balance) || 0));
    const amount = parseAmount(input, bal);
    if (!Number.isFinite(amount) || amount <= 0) {
        return {
            ok: false,
            error: `Valor inválido. Use número, **k/m**, **all** ou **half**.`
        };
    }
    if (amount < min) {
        return { ok: false, error: `Aposta mínima: **${min.toLocaleString('pt-BR')}**.` };
    }
    if (amount > bal) {
        return {
            ok: false,
            error: `${label} insuficiente. Você tem **${bal.toLocaleString('pt-BR')}**.`
        };
    }
    return { ok: true, amount, balance: bal };
}

module.exports = { parseAmount, resolveBet };
