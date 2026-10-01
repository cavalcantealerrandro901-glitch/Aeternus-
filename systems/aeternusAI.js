/**
 * Aeternus System Engine — JARVIS + tools de servidor
 */

const ai = require('../utils/aeternusAI');

module.exports = {
    configured: () => (typeof ai.configured === 'function' ? ai.configured() : true),
    listContexts: () => (typeof ai.listContexts === 'function' ? ai.listContexts() : []),
    listTools: () => (typeof ai.listTools === 'function' ? ai.listTools() : []),
    chat: async (params) => await ai.chat(params),
    clearHistory: (userId) => (typeof ai.clearHistory === 'function' ? ai.clearHistory(userId) : undefined),
    isOwner: (userId) => (typeof ai.isOwner === 'function' ? ai.isOwner(userId) : false),
    activeProviders: () => (typeof ai.activeProviders === 'function' ? ai.activeProviders() : []),
    model: () => (typeof ai.model === 'function' ? ai.model() : 'aeternus-jarvis'),
    baseUrl: () => (typeof ai.baseUrl === 'function' ? ai.baseUrl() : 'multi-provider')
};
