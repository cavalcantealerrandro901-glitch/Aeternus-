const i18n = {
    currentLang: localStorage.getItem('lang') || 'pt',
    translations: {},

    async loadLanguage(lang) {
        localStorage.setItem('lang', lang);
        this.currentLang = lang;
        
        if (lang === 'pt') {
            this.translations = {}; // Português usa o texto original do HTML
            this.translateElement(document.body);
            return;
        }

        try {
            const response = await fetch(`/locales/${lang}.json`);
            this.translations = await response.json();
            this.translateElement(document.body);
        } catch (e) { 
            console.warn("Idioma não carregado."); 
        }
    },

    translateElement(element) {
        if (element.nodeType === 3) {
            const text = element.nodeValue.trim();
            if (text && this.translations[text]) {
                element.nodeValue = element.nodeValue.replace(text, this.translations[text]);
            }
        } else if (element.childNodes) {
            element.childNodes.forEach(child => this.translateElement(child));
        }
    }
};
