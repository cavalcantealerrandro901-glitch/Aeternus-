/**
 * i18n Aeternus — data-i18n="chave" + dicionário /locales/{code}.json
 */
const i18n = {
    currentLang: localStorage.getItem('lang') || 'pt',
    translations: {},

    async loadLanguage(lang) {
        this.currentLang = lang || 'pt';
        localStorage.setItem('lang', this.currentLang);

        if (this.currentLang === 'pt') {
            this.translations = window.__I18N_PT__ || {};
        } else {
            try {
                const res = await fetch(`/locales/${this.currentLang}.json`);
                this.translations = res.ok ? await res.json() : {};
            } catch {
                this.translations = {};
            }
        }
        this.apply();
        document.documentElement.setAttribute('lang', this.currentLang);
        return this.translations;
    },

    t(key, fallback) {
        if (this.currentLang === 'pt' && window.__I18N_PT__ && window.__I18N_PT__[key]) {
            return window.__I18N_PT__[key];
        }
        return this.translations[key] || fallback || key;
    },

    apply() {
        document.querySelectorAll('[data-i18n]').forEach((el) => {
            const key = el.getAttribute('data-i18n');
            const fallback = el.getAttribute('data-i18n-fallback') || el.textContent;
            el.textContent = this.t(key, fallback);
        });
        document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
            const key = el.getAttribute('data-i18n-placeholder');
            el.setAttribute('placeholder', this.t(key, el.getAttribute('placeholder') || ''));
        });
    }
};

// Base PT (fallback)
window.__I18N_PT__ = {
    title: 'Aeternus',
    login: 'Login',
    menu: 'Menu',
    add_server: 'Adicionar ao Servidor',
    support: 'Suporte',
    commands: 'Comandos',
    panel: 'Painel',
    language: 'Idioma',
    theme: 'Tema claro / escuro',
    logout: 'Sair',
    store: 'Loja',
    gaming: 'Gaming',
    wiki: 'Wiki',
    api_premium: 'API Premium',
    daily: 'Recompensa diária',
    daily_title: 'Pegue sua recompensa diária',
    daily_sub: '5.000 — 50.000 almas · 1x por dia',
    hero_sub: 'Uma nova era de experiências e conexões.',
    search_lang: 'Pesquisar idioma...',
    search_cmd: 'Pesquisar comando...',
    claim: 'Resgatar',
    continue: 'Continuar',
    reward: 'Recompensa diária'
};

// auto-load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => i18n.loadLanguage(i18n.currentLang));
} else {
    i18n.loadLanguage(i18n.currentLang);
}
