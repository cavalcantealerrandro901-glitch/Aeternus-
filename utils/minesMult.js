const TOTAL = 16;
const MAX_BOMBS = 11;

/**
 * % de ganho base com 1 bomba (por casas abertas).
 * Nº de bombas multiplica esse %.
 * Meta: ~2.21x com 4–5 casas e 1 bomba.
 */
const BASE_PCT = [
    0, // 0 abertas → 1.00x
    22, // 1 → 1.22x
    48, // 2 → 1.48x
    82, // 3 → 1.82x
    112, // 4 → 2.12x
    121, // 5 → 2.21x
    145, // 6 → 2.45x
    172, // 7 → 2.72x
    205, // 8 → 3.05x
    242, // 9 → 3.42x
    285, // 10 → 3.85x
    335, // 11 → 4.35x
    392, // 12 → 4.92x
    458, // 13 → 5.58x
    535, // 14 → 6.35x
    620 // 15 → 7.20x
];

function multAt(opened, bombs) {
    opened = Math.max(0, Math.min(TOTAL - 1, Number(opened) || 0));
    bombs = Math.min(MAX_BOMBS, Math.max(1, Number(bombs) || 1));
    if (opened <= 0) return 1;

    let pct = BASE_PCT[opened];
    if (pct == null) {
        const last = BASE_PCT[BASE_PCT.length - 1];
        const extra = opened - (BASE_PCT.length - 1);
        pct = last + extra * 40;
    }
    // bombas multiplicam o % da casa (1 bomba = base, 2 = ×2, …)
    const m = 1 + (pct * bombs) / 100;
    return Math.max(1, Math.round(m * 100) / 100);
}

function potentialAt(amount, opened, bombs) {
    return Math.floor(Number(amount || 0) * multAt(opened, bombs));
}

module.exports = { multAt, potentialAt, BASE_PCT, TOTAL, MAX_BOMBS };
