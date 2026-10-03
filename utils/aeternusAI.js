/** IA removida — stubs para não quebrar requires legados */
module.exports = {
    configured: () => false,
    chat: async () => ({ ok: false, error: 'IA desativada.' }),
    clearHistory() {},
    listContexts: () => [],
    listTools: () => [],
    isOwner: () => false,
    activeProviders: () => [],
    model: () => 'off',
    baseUrl: () => 'off',
    fetchJarvisReply: async () => null
};
