/**
 * Força tom casual do JARVIS em runtime (gírias / palavrão liberados).
 */
module.exports = {
    setup() {
        try {
            const ai = require('../utils/aeternusAI');
            const orig = ai.fetchJarvisReply;
            if (typeof orig === 'function' && !ai.__casualPatched) {
                ai.__casualPatched = true;
                ai.fetchJarvisReply = async function (userText, persona, history) {
                    const prefix =
                        '[Tom: informal brasileiro, gírias e palavrão liberados, conversa normal — não seja formal]\n';
                    return orig.call(this, prefix + String(userText || ''), persona, history);
                };
                console.log('[JARVIS] tom casual ativo');
            }
        } catch (e) {
            console.warn('[jarvisCasual]', e.message);
        }
    }
};
