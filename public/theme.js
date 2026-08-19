function getTheme() {
    return localStorage.getItem('theme') || 'dark';
}

function applyTheme(theme) {
    const t = theme === 'light' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', t);
    localStorage.setItem('theme', t);
    const label = document.getElementById('themeLabel');
    if (label) {
        label.textContent = t === 'dark' ? '🌙 Escuro' : '☀️ Claro';
    }
}

function toggleTheme() {
    applyTheme(getTheme() === 'dark' ? 'light' : 'dark');
}

(function () {
    applyTheme(getTheme());
})();
