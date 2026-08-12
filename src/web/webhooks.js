/** Webhooks / deploy removidos — opcional.
 *  O Render já faz deploy automático ao dar push no GitHub.
 *  Este arquivo existe só para não quebrar imports antigos.
 */
function registerWebhooks() {}
async function triggerRenderDeploy() {
    return { ok: false, error: 'Deploy por webhook desativado' };
}
async function notifyDiscord() {
    return false;
}

module.exports = {
    registerWebhooks,
    triggerRenderDeploy,
    notifyDiscord
};
