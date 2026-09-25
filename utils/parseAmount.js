/**
 * Aceita valores flexíveis:
 *   1000 | 1.5k | 2m | 1b | 1t | 10kk
 *   all | tudo | max | full
 *   half | metade | meio | 50%
 *   25% | 10%
 *   1.000.000 (milhar BR) | 1_000
 */
function parseAmount(input, balance = null) {
    if (input == null) return NaN;
    let s = String(input).trim().toLowerCase().replace(/\s+/g, '').replace(/_/g, '');
    if (!s) return NaN;

    if (['all', 'tudo', 'max', 'full', 'todo', 'todos'].includes(s)) {
        if (balance == null || !Number.isFinite(Number(balance))) return NaN;
        return Math.max(0, Math.floor(Number(balance)));
    }
    if (['half', 'metade', 'meio', '1/2'].includes(s)) {
        if (balance == null || !Number.isFinite(Number(balance))) return NaN;
        return Math.max(0, Math.floor(Number(balance) / 2));
    }
    if (['quarter', 'quarta', '1/4'].includes(s)) {
        if (balance == null || !Number.isFinite(Number(balance))) return NaN;
        return Math.max(0, Math.floor(Number(balance) / 4));
    }

    const pct = s.match(/^(\d+(?:[.,]\d+)?)%$/);
    if (pct) {
        if (balance == null || !Number.isFinite(Number(balance))) return NaN;
        const p = parseFloat(pct[1].replace(',', '.'));
        if (!Number.isFinite(p) || p <= 0) return NaN;
        return Math.max(0, Math.floor((Number(balance) * Math.min(100, p)) / 100));
    }

    // Separar sufixo k/m/b/t/mil/kk
    let suf = '';
    const sufM = s.match(/^(.*?)(kk|k|m|b|t|mil)$/i);
    if (sufM) {
        s = sufM[1];
        suf = sufM[2].toLowerCase();
    }
    if (!s) return NaN;

    // Normalizar número
    // 1.000.000 ou 1.000 → milhar BR
    if (/^\d{1,3}(\.\d{3})+$/.test(s)) {
        s = s.replace(/\./g, '');
    } else if (s.includes(',') && s.includes('.')) {
        // 1.234,56
        s = s.replace(/\./g, '').replace(',', '.');
    } else if (s.includes(',')) {
        // 1,5
        s = s.replace(',', '.');
    }

    let n = parseFloat(s);
    if (!Number.isFinite(n)) return NaN;

    if (suf === 'k' || suf === 'mil') n *= 1e3;
    else if (suf === 'm' || suf === 'kk') n *= 1e6;
    else if (suf === 'b') n *= 1e9;
    else if (suf === 't') n *= 1e12;

    return Math.floor(n);
}

function looksLikeAmount(input) {
    if (input == null) return false;
    const s = String(input).trim().toLowerCase().replace(/\s+/g, '');
    if (!s) return false;
    if (
        [
            'all', 'tudo', 'max', 'full', 'todo', 'todos',
            'half', 'metade', 'meio', '1/2',
            'quarter', 'quarta', '1/4'
        ].includes(s)
    ) {
        return true;
    }
    if (/^\d+(?:[.,]\d+)?%$/.test(s)) return true;
    if (/^[0-9_.,]+(kk|k|m|b|t|mil)?$/i.test(s)) return true;
    return false;
}

function resolveBet(input, balance, { min = 1, label = 'saldo' } = {}) {
    const bal = Math.max(0, Math.floor(Number(balance) || 0));
    const amount = parseAmount(input, bal);
    if (!Number.isFinite(amount) || amount <= 0) {
        return {
            ok: false,
            error: 'Valor inválido. Use número, **1k/2m/1b**, **all**, **half**, **50%**…'
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

module.exports = { parseAmount, resolveBet, looksLikeAmount };
