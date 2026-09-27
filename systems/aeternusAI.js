/**
 * Aeternus System Engine v7.3 (Compatibilidade Total)
 */

const ai = require('../utils/aeternusAI');

module.exports = {
    configured: () => typeof ai.configured === 'function' ? ai.configured() : true,
    listContexts: () => typeof ai.listContexts === 'function' ? ai.listContexts() : [],
    listTools: () => typeof ai.listTools === 'function' ? ai.listTools() : [],
    chat: async (params) => await ai.chat(params),
    isOwner: (userId) => typeof ai.isOwner === 'function' ? ai.isOwner(userId) : false,
    model: () => typeof ai.model === 'function' ? ai.model() : 'aeternus-v7',
    baseUrl: () => typeof ai.baseUrl === 'function' ? ai.baseUrl() : 'local'
};
