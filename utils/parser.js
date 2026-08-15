function parseAmount(input) {
    if (!input) return NaN;
    const clean = input.toLowerCase().trim().replace(/,/g, '');
    const match = clean.match(/^([\d.]+)([kmbt]?)$/);
    if (!match) return NaN;
    
    const num = parseFloat(match[1]);
    const suffix = match[2];
    
    const multipliers = {
        'k': 1e3,
        'm': 1e6,
        'b': 1e9,
        't': 1e12
    };
    
    return num * (multipliers[suffix] || 1);
}

module.exports = { parseAmount };
