const TOTAL = 16;
const MAX_BOMBS = 11;

/**
 * % de ganho base com 1 bomba (por casas abertas).
 * Nº de bombas multiplica esse %.
 * Meta: ~1.95x com 5 casas e 1 bomba.
 */
const BASE_PCT = [
    0, // 0 → 1.00x
    15, // 1 → 1.15x
    32, // 2 → 1.32x
    52, // 3 → 1.52x
    75, // 4 → 1.75x
    95, // 5 → 1.95x
    118, // 6 → 2.18x
    145, // 7 → 2.45x
    175, // 8 → 2.75x
    210, // 9 → 3.10x
    250, // 10 → 3.50x
    295, // 11 → 3.95x
    345, // 12 → 4.45x
    400, // 13 → 5.00x
    460, // 14 → 5.60x
    530 // 15 → 6.30x
];

function multAt(opened, bombs) {
    opened = Math.max(0, Math.min(TOTAL - 1, Number(opened) || 0));
    bombs = Math.min(MAX_BOMBS, Math.max(1, Number(bombs) || 1));
    if (opened <= 0) return 1;

    let pct = BASE_PCT[opened];
    if (pct == null) {
        const last = BASE_PCT[BASE_PCT.length - 1];
        const extra = opened - (BASE_PCT.length - 1);
        pct = last + extra * 35;
    }
    // bombas multiplicam o % da casa (1 bomba = base, 2 = ×2, …)
    const m = 1 + (pct * bombs) / 100;
    return Math.max(1, Math.round(m * 100) / 100);
}

function potentialAt(amount, opened, bombs) {
    return Math.floor(Number(amount || 0) * multAt(opened, bombs));
}

module.exports = { multAt, potentialAt, BASE_PCT, TOTAL, MAX_BOMBS };
