const TOTAL = 16;
const MAX_BOMBS = 11;

/**
 * % de ganho base com 1 bomba (por casas abertas).
 * Nº de bombas multiplica esse %.
 * Valores reduzidos — menos agressivos que a versão anterior.
 */
const BASE_PCT = [
    0, // 0 → 1.00x
    8, // 1 → 1.08x
    17, // 2 → 1.17x
    28, // 3 → 1.28x
    40, // 4 → 1.40x
    55, // 5 → 1.55x
    72, // 6 → 1.72x
    92, // 7 → 1.92x
    115, // 8 → 2.15x
    140, // 9 → 2.40x
    168, // 10 → 2.68x
    200, // 11 → 3.00x
    235, // 12 → 3.35x
    275, // 13 → 3.75x
    320, // 14 → 4.20x
    370 // 15 → 4.70x
];

function multAt(opened, bombs) {
    opened = Math.max(0, Math.min(TOTAL - 1, Number(opened) || 0));
    bombs = Math.min(MAX_BOMBS, Math.max(1, Number(bombs) || 1));
    if (opened <= 0) return 1;

    let pct = BASE_PCT[opened];
    if (pct == null) {
        const last = BASE_PCT[BASE_PCT.length - 1];
        const extra = opened - (BASE_PCT.length - 1);
        pct = last + extra * 25;
    }
    // bombas multiplicam o % da casa (1 bomba = base, 2 = ×2, …)
    const m = 1 + (pct * bombs) / 100;
    return Math.max(1, Math.round(m * 100) / 100);
}

function potentialAt(amount, opened, bombs) {
    return Math.floor(Number(amount || 0) * multAt(opened, bombs));
}

module.exports = { multAt, potentialAt, BASE_PCT, TOTAL, MAX_BOMBS };
