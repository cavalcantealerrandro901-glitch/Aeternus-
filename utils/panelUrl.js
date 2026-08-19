/** URL base do painel web (Render ou local) */
function getPanelBase() {
    const fromEnv =
        process.env.PANEL_URL ||
        process.env.RENDER_EXTERNAL_URL ||
        (process.env.RENDER_EXTERNAL_HOSTNAME
            ? `https://${process.env.RENDER_EXTERNAL_HOSTNAME}`
            : null);
    if (fromEnv) return String(fromEnv).replace(/\/$/, '');
    return 'http://localhost:3000';
}

function getDailyPageUrl() {
    return `${getPanelBase()}/daily.html`;
}

module.exports = { getPanelBase, getDailyPageUrl };
