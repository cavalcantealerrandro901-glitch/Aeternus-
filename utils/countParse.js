/**
 * Parser da contagem: dígitos, palavras, romano, bases, expressões (π, e…)
 * e texto misto (ex.: "11 oi" → 11).
 */
const DIGIT_MAP = {
    '0': 0, '1': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9,
    '０': 0, '１': 1, '２': 2, '３': 3, '４': 4, '５': 5, '６': 6, '７': 7, '８': 8, '９': 9
};

const WORD_NUMBERS = {
    zero: 0, um: 1, uma: 1, dois: 2, duas: 2, tres: 3, três: 3, quatro: 4, cinco: 5,
    seis: 6, sete: 7, oito: 8, nove: 9, dez: 10, onze: 11, doze: 12, treze: 13,
    quatorze: 14, catorze: 14, quinze: 15, dezesseis: 16, dezessete: 17,
    dezoito: 18, dezenove: 19, vinte: 20, trinta: 30, quarenta: 40, cinquenta: 50,
    sessenta: 60, setenta: 70, oitenta: 80, noventa: 90, cem: 100, cento: 100,
    mil: 1000, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7,
    eight: 8, nine: 9, ten: 10, twenty: 20, hundred: 100, thousand: 1000
};

const MATH_CONST = {
    pi: Math.PI, 'π': Math.PI, e: Math.E, tau: Math.PI * 2, 'τ': Math.PI * 2,
    phi: (1 + Math.sqrt(5)) / 2, 'φ': (1 + Math.sqrt(5)) / 2
};

const ROMAN = { m: 1000, d: 500, c: 100, l: 50, x: 10, v: 5, i: 1 };

function digitsToInt(str) {
    let out = '';
    for (const ch of str) {
        if (DIGIT_MAP[ch] === undefined) return null;
        out += String(DIGIT_MAP[ch]);
    }
    if (!out.length) return null;
    const n = Number(out);
    if (!Number.isSafeInteger(n) || n < 0) return null;
    return n;
}

function parseRoman(str) {
    const s = String(str || '').trim().toLowerCase();
    if (!s || !/^[mdclxvi]+$/i.test(s)) return null;
    let total = 0;
    let prev = 0;
    for (let i = s.length - 1; i >= 0; i--) {
        const v = ROMAN[s[i]];
        if (!v) return null;
        if (v < prev) total -= v;
        else {
            total += v;
            prev = v;
        }
    }
    if (!Number.isSafeInteger(total) || total < 1) return null;
    return total;
}

function parsePrefixed(raw) {
    const s = String(raw || '').trim().toLowerCase();
    const m = s.match(/^(0x|0b|0o)([0-9a-f]+)$/i);
    if (!m) return null;
    try {
        const n =
            m[1] === '0x'
                ? parseInt(m[2], 16)
                : m[1] === '0b'
                  ? parseInt(m[2], 2)
                  : parseInt(m[2], 8);
        if (!Number.isSafeInteger(n) || n < 0) return null;
        return n;
    } catch (_) {
        return null;
    }
}

function toIntegerResult(val) {
    if (!Number.isFinite(val)) return null;
    const rounded = Math.round(val);
    if (!Number.isSafeInteger(rounded) || rounded < 0) return null;
    return rounded;
}

function evalExpression(input) {
    let s = String(input || '').trim();
    if (!s || s.length > 120) return null;
    s = s.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-').replace(/\^/g, '**');
    s = s.replace(/π/g, 'pi').replace(/τ/g, 'tau').replace(/φ|ϕ/g, 'phi');
    let i = 0;
    const peek = () => s[i];
    const eat = () => s[i++];
    function skipSpace() {
        while (peek() === ' ' || peek() === '\t') eat();
    }
    function parseExpr() {
        skipSpace();
        let left = parseTerm();
        skipSpace();
        while (peek() === '+' || peek() === '-') {
            const op = eat();
            skipSpace();
            const right = parseTerm();
            left = op === '+' ? left + right : left - right;
            skipSpace();
        }
        return left;
    }
    function parseTerm() {
        skipSpace();
        let left = parsePower();
        skipSpace();
        while (peek() === '*' || peek() === '/' || peek() === '%') {
            const op = eat();
            skipSpace();
            const right = parsePower();
            if (op === '*') left *= right;
            else if (op === '/') left /= right;
            else left %= right;
            skipSpace();
        }
        return left;
    }
    function parsePower() {
        skipSpace();
        let base = parseUnary();
        skipSpace();
        if (s.slice(i, i + 2) === '**') {
            i += 2;
            skipSpace();
            const exp = parseUnary();
            if (exp > 12 || exp < 0) throw new Error('pow');
            base = Math.pow(base, exp);
        }
        return base;
    }
    function parseUnary() {
        skipSpace();
        if (peek() === '+') {
            eat();
            return parseUnary();
        }
        if (peek() === '-') {
            eat();
            return -parseUnary();
        }
        return parsePrimary();
    }
    function parsePrimary() {
        skipSpace();
        if (peek() === '(') {
            eat();
            const v = parseExpr();
            skipSpace();
            if (peek() !== ')') throw new Error('paren');
            eat();
            return v;
        }
        if (/[a-zA-Z]/.test(peek() || '')) {
            const start = i;
            while (/[a-zA-Z]/.test(peek() || '')) eat();
            const name = s.slice(start, i).toLowerCase();
            if (MATH_CONST[name] !== undefined) return MATH_CONST[name];
            throw new Error('id');
        }
        const start = i;
        if (!/[0-9.]/.test(peek() || '')) throw new Error('num');
        while (/[0-9.]/.test(peek() || '')) eat();
        const n = Number(s.slice(start, i));
        if (!Number.isFinite(n)) throw new Error('num');
        return n;
    }
    try {
        const val = parseExpr();
        skipSpace();
        if (i !== s.length) return null;
        return toIntegerResult(val);
    } catch (_) {
        return null;
    }
}

function parseWordPhrase(raw) {
    const key = raw
        .toLowerCase()
        .normalize('NFD')
        .replace(/\p{M}/gu, '')
        .replace(/-/g, ' ')
        .replace(/[^\p{L}\p{N}\s]/gu, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    if (!key) return null;
    if (WORD_NUMBERS[key] !== undefined) return WORD_NUMBERS[key];
    const parts = key.split(' ').filter((p) => p && p !== 'e' && p !== 'and');
    if (parts.length < 2 || parts.length > 6) return null;
    let total = 0;
    let current = 0;
    for (const p of parts) {
        const v = WORD_NUMBERS[p];
        if (v === undefined) return null;
        if (v === 1000) {
            current = (current || 1) * 1000;
            total += current;
            current = 0;
        } else if (v === 100) {
            current = (current || 1) * 100;
        } else if (v >= 20 && v % 10 === 0) {
            current += v;
        } else {
            current += v;
        }
    }
    total += current;
    if (!Number.isSafeInteger(total) || total < 0) return null;
    return total;
}

function extractNumberFromMixed(raw) {
    const s = String(raw || '');
    let best = null;
    let buf = '';
    const flush = () => {
        if (!buf) return;
        const n = digitsToInt(buf);
        if (n !== null && best === null) best = n;
        buf = '';
    };
    for (const ch of s) {
        if (DIGIT_MAP[ch] !== undefined || /[0-9]/.test(ch)) buf += ch;
        else {
            flush();
            if (best !== null) break;
        }
    }
    flush();
    return best;
}

function evalExpressionLoose(raw) {
    const s = String(raw || '').trim();
    if (!s) return null;
    let v = evalExpression(s);
    if (v !== null) return v;
    const tokens = s.split(/\s+/);
    for (let len = tokens.length; len >= 1; len--) {
        const part = tokens.slice(0, len).join(' ');
        v = evalExpression(part);
        if (v !== null) return v;
    }
    return null;
}

function parseMathConstantAlone(raw) {
    const key = String(raw || '')
        .trim()
        .toLowerCase()
        .replace(/π/g, 'pi')
        .replace(/τ/g, 'tau')
        .replace(/φ|ϕ/g, 'phi');
    if (MATH_CONST[key] === undefined) return null;
    return toIntegerResult(MATH_CONST[key]);
}

function parseCountMessage(content) {
    const raw = String(content || '').trim();
    if (!raw) return null;

    const pureDigits = raw.replace(/[\s_,.]/g, '');
    if (pureDigits && [...pureDigits].every((ch) => DIGIT_MAP[ch] !== undefined)) {
        const n = digitsToInt(pureDigits);
        if (n !== null) return n;
    }

    const pref = parsePrefixed(raw.replace(/\s/g, ''));
    if (pref !== null) return pref;

    const roman = parseRoman(raw);
    if (roman !== null) return roman;

    const alone = parseMathConstantAlone(raw);
    if (alone !== null) return alone;

    const key = raw
        .toLowerCase()
        .normalize('NFD')
        .replace(/\p{M}/gu, '')
        .replace(/[^\p{L}\p{N}]/gu, '');
    if (WORD_NUMBERS[raw] !== undefined) return WORD_NUMBERS[raw];
    if (WORD_NUMBERS[key] !== undefined) return WORD_NUMBERS[key];

    const phrase = parseWordPhrase(raw);
    if (phrase !== null) return phrase;

    if (
        /[+\-*/%^\u00d7\u00f7()]/.test(raw) ||
        /\*\*/.test(raw) ||
        /π|pi\b|tau\b|phi\b|\be\b/i.test(raw)
    ) {
        const expr = evalExpressionLoose(raw);
        if (expr !== null) return expr;
    }

    const compact = raw.replace(/[_\s.]/g, '');
    if (/^\d+$/.test(compact)) {
        const n = Number(compact);
        if (Number.isSafeInteger(n) && n >= 0) return n;
    }

    const looksMath =
        /[+\-*/%^=()]/.test(raw) ||
        /π|\bpi\b|\btau\b|\bphi\b/i.test(raw);
    if (!looksMath) {
        const mixed = extractNumberFromMixed(raw);
        if (mixed !== null) return mixed;
    }

    return null;
}

module.exports = { parseCountMessage, evalExpression, extractNumberFromMixed };
