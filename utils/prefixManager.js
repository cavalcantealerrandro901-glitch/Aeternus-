const settings = require('./settings');

/** Prefixo padrão do Aeternus */
const DEFAULT_PREFIX = 'O.';

/**
 * Prefixo do servidor.
 * Prioridade: settings.json (painel) → padrão O.
 */
function getPrefix(guildId) {
    if (!guildId) return DEFAULT_PREFIX;
    try {
        const g = settings.getGuild(guildId);
        if (g && typeof g.prefix === 'string' && g.prefix.length > 0) {
            return g.prefix;
        }
    } catch (_) {}
    return DEFAULT_PREFIX;
}

/**
 * Salva o prefixo (usado pela API do painel e comandos).
 * Aceita qualquer string de 1 a 10 caracteres.
 */
function setPrefix(guildId, newPrefix) {
    if (!guildId) return DEFAULT_PREFIX;
    let p = String(newPrefix ?? DEFAULT_PREFIX).trim();
    if (!p) p = DEFAULT_PREFIX;
    p = p.slice(0, 10);
    settings.setKey(guildId, 'prefix', p);
    return p;
}

module.exports = { getPrefix, setPrefix, DEFAULT_PREFIX };
