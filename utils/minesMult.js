const TOTAL = 16;
const MAX_BOMBS = 11;

/** % de ganho base com 1 bomba (por casas abertas). Nº de bombas multiplica o %. */
const BASE_PCT = [
    0, 5, 12, 24, 24, 30, 38, 48, 60, 75, 92, 112, 135, 160, 190, 225
];

function multAt(opened, bombs) {
    opened = Math.max(0, Math.min(TOTAL - 1, Number(opened) || 0));
    bombs = Math.min(MAX_BOMBS, Math.max(1, Number(bombs) || 1));
    if (opened <= 0) return 1;

    let pct = BASE_PCT[opened];
    if (pct == null) {
        const last = BASE_PCT[BASE_PCT.length - 1];
        const extra = opened - (BASE_PCT.length - 1);
        pct = last + extra * 30;
    }
    const m = 1 + (pct * bombs) / 100;
    return Math.max(1, Math.round(m * 100) / 100);
}

function potentialAt(amount, opened, bombs) {
    return Math.floor(Number(amount || 0) * multAt(opened, bombs));
}

module.exports = { multAt, potentialAt, BASE_PCT, TOTAL, MAX_BOMBS };
