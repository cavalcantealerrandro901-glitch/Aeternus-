/**
 * Parser da contagem: dígitos, palavras, romano, bases e expressões.
 */
const DIGIT_MAP = {
    '0': 0, '1': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9,
    '０': 0, '１': 1, '２': 2, '３': 3, '４': 4, '５': 5, '６': 6, '７': 7, '８': 8, '９': 9,
    '٠': 0, '١': 1, '٢': 2, '٣': 3, '٤': 4, '٥': 5, '٦': 6, '٧': 7, '٨': 8, '٩': 9,
    '۰': 0, '۱': 1, '۲': 2, '۳': 3, '۴': 4, '۵': 5, '۶': 6, '۷': 7, '۸': 8, '۹': 9,
    '०': 0, '१': 1, '२': 2, '३': 3, '४': 4, '५': 5, '६': 6, '७': 7, '८': 8, '९': 9,
    '০': 0, '১': 1, '২': 2, '৩': 3, '৪': 4, '৫': 5, '৬': 6, '৭': 7, '৮': 8, '৯': 9,
    '๐': 0, '๑': 1, '๒': 2, '๓': 3, '๔': 4, '๕': 5, '๖': 6, '๗': 7, '๘': 8, '๙': 9,
    '၀': 0, '၁': 1, '၂': 2, '၃': 3, '၄': 4, '၅': 5, '၆': 6, '၇': 7, '၈': 8, '၉': 9
};

const WORD_NUMBERS = {
    zero: 0, um: 1, uma: 1, dois: 2, duas: 2, tres: 3, três: 3, quatro: 4, cinco: 5,
    seis: 6, sete: 7, oito: 8, nove: 9, dez: 10, onze: 11, doze: 12, treze: 13,
    quatorze: 14, catorze: 14, quinze: 15, dezesseis: 16, dezasseis: 16, dezessete: 17,
    dezoito: 18, dezenove: 19, vinte: 20, trinta: 30, quarenta: 40, cinquenta: 50,
    sessenta: 60, setenta: 70, oitenta: 80, noventa: 90, cem: 100, cento: 100,
    duzentos: 200, trezentos: 300, quatrocentos: 400, quinhentos: 500,
    seiscentos: 600, setecentos: 700, oitocentos: 800, novecentos: 900,
    mil: 1000, milhao: 1000000, milhão: 1000000,
    one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
    eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16,
    seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20, thirty: 30, forty: 40,
    fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90, hundred: 100, thousand: 1000,
    uno: 1, dos: 2, cuatro: 4, siete: 7, ocho: 8, nueve: 9, diez: 10,
    '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '七': 7, '八': 8, '九': 9, '十': 10,
    '零': 0
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
    if (!Number.isSafeInteger(total) || total < 0) return null;
    return total;
}

function parsePrefixed(str) {
    const s = String(str || '').trim().toLowerCase().replace(/_/g, '');
    try {
        if (/^0b[01]+$/.test(s)) {
            const n = parseInt(s.slice(2), 2);
            return Number.isSafeInteger(n) && n >= 0 ? n : null;
        }
        if (/^0o[0-7]+$/.test(s)) {
            const n = parseInt(s.slice(2), 8);
            return Number.isSafeInteger(n) && n >= 0 ? n : null;
        }
        if (/^0x[0-9a-f]+$/.test(s)) {
            const n = parseInt(s.slice(2), 16);
            return Number.isSafeInteger(n) && n >= 0 ? n : null;
        }
    } catch (_) {
        return null;
    }
    return null;
}

function evalExpression(input) {
    let s = String(input || '').trim();
    if (!s) return null;
    s = s
        .replace(/×/g, '*')
        .replace(/÷/g, '/')
        .replace(/−/g, '-')
        .replace(/\^/g, '**')
        .replace(/\s+/g, '');

    if (/[a-zA-Z_]/.test(s)) return null;
    if (s.length > 80) return null;
    const cleaned = s.replace(/\*\*/g, '');
    if (!/^[0-9+\-*/%().]+$/.test(cleaned)) return null;

    let i = 0;
    const peek = () => s[i];
    const eat = () => s[i++];

    function parseExpr() {
        let left = parseTerm();
        while (peek() === '+' || peek() === '-') {
            const op = eat();
            const right = parseTerm();
            left = op === '+' ? left + right : left - right;
        }
        return left;
    }
    function parseTerm() {
        let left = parsePower();
        while (peek() === '*' || peek() === '/' || peek() === '%') {
            const op = eat();
            const right = parsePower();
            if (op === '*') left *= right;
            else if (op === '/') left /= right;
            else left %= right;
        }
        return left;
    }
    function parsePower() {
        let base = parseUnary();
        if (s.slice(i, i + 2) === '**') {
            i += 2;
            const exp = parseUnary();
            if (exp > 12 || exp < 0) throw new Error('pow');
            base = Math.pow(base, exp);
        }
        return base;
    }
    function parseUnary() {
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
        if (peek() === '(') {
            eat();
            const v = parseExpr();
            if (peek() !== ')') throw new Error('paren');
            eat();
            return v;
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
        if (i !== s.length) return null;
        if (!Number.isFinite(val)) return null;
        const rounded = Math.round(val);
        if (Math.abs(val - rounded) > 1e-9) return null;
        if (!Number.isSafeInteger(rounded) || rounded < 0) return null;
        return rounded;
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

    const key = raw
        .toLowerCase()
        .normalize('NFD')
        .replace(/\p{M}/gu, '')
        .replace(/[^\p{L}\p{N}]/gu, '');
    if (WORD_NUMBERS[raw] !== undefined) return WORD_NUMBERS[raw];
    if (WORD_NUMBERS[key] !== undefined) return WORD_NUMBERS[key];

    const phrase = parseWordPhrase(raw);
    if (phrase !== null) return phrase;

    if (/[+\-*/%^\u00d7\u00f7()]/.test(raw) || /\*\*/.test(raw)) {
        const expr = evalExpression(raw);
        if (expr !== null) return expr;
    }

    const compact = raw.replace(/[_\s.]/g, '');
    if (/^\d+$/.test(compact)) {
        const n = Number(compact);
        if (Number.isSafeInteger(n) && n >= 0) return n;
    }

    return null;
}

module.exports = { parseCountMessage };
