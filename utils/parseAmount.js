function parseAmount(input) {
    if (input == null) return NaN;
    let s = String(input).trim().toLowerCase().replace(/\s/g, '').replace(/,/g, '.');
    if (!s) return NaN;
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
module.exports = { parseAmount };
