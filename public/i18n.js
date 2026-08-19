class I18n {
    constructor() {
        this.currentLang = localStorage.getItem('lang') || 'pt';
        this.translations = {};
        this.init();
    }

    async init() {
        await this.loadLanguage(this.currentLang);
    }

    async loadLanguage(lang) {
        try {
            const response = await fetch(`/locales/${lang}.json`);
            if (!response.ok) throw new Error('Erro ao carregar o arquivo de idioma');
            this.translations = await response.json();
            this.currentLang = lang;
            localStorage.setItem('lang', lang);
            this.applyTranslations();
        } catch (error) {
            console.error('Falha ao alternar idioma:', error);
        }
    }

    translate(key) {
        return this.translations[key] || key;
    }

    applyTranslations() {
        // Traduz elementos por atributo data-i18n
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (this.translations[key]) {
                el.textContent = this.translations[key];
            }
        });

        // Traduz placeholders de inputs por atributo data-i18n-placeholder
        document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            const key = el.getAttribute('data-i18n-placeholder');
            if (this.translations[key]) {
                el.placeholder = this.translations[key];
            }
        });
    }
}

window.i18n = new I18n();
