/**
 * Welcome no Discord = systems/welcome.js
 * Configuração no painel = routes/panel.js (/api/set-setting)
 * Este arquivo só evita conflito com o loader.
 */
function register() {
    /* no-op */
}

module.exports = register;
module.exports.register = register;
