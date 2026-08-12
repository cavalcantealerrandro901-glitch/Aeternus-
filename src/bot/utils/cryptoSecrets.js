const crypto = require('crypto');

const ALGO = 'aes-256-gcm';

function getKey() {
    const raw = process.env.EDITOR_SECRET_KEY || process.env.ENCRYPTION_KEY || process.env.TOKEN || 'aeternus-default-editor-key';
    return crypto.createHash('sha256').update(String(raw)).digest();
}

function encrypt(text) {
    if (text == null || text === '') return '';
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(ALGO, getKey(), iv);
    const enc = Buffer.concat([cipher.update(String(text), 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return Buffer.concat([iv, tag, enc]).toString('base64');
}

function decrypt(payload) {
    if (!payload) return '';
    try {
        const buf = Buffer.from(payload, 'base64');
        const iv = buf.subarray(0, 12);
        const tag = buf.subarray(12, 28);
        const data = buf.subarray(28);
        const decipher = crypto.createDecipheriv(ALGO, getKey(), iv);
        decipher.setAuthTag(tag);
        return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
    } catch {
        return '';
    }
}

function maskSecret(value) {
    if (!value) return '';
    if (value.length <= 8) return '••••••••';
    return value.slice(0, 4) + '••••' + value.slice(-4);
}

module.exports = { encrypt, decrypt, maskSecret };
