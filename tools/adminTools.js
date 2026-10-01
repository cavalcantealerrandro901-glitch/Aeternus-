module.exports = function register({ registerTool }) {
  registerTool({
    name: 'listar_ferramentas',
    description: 'Lista tools do JARVIS',
    async handler() {
      return {
        ok: true,
        text:
          '**Ferramentas JARVIS**\n' +
          '• Servidor: criar_canal, criar_canal_voz, criar_categoria, criar_cargo, link_convite, listar_canais, listar_cargos, info_servidor\n' +
          '• Moderação: banir, expulsar, silenciar, limpar_chat\n' +
          '• Economia: saldo, daily, transferir, rank_economia\n' +
          '• RPG: criar_classe, ficha_rpg, rpg_treino, listar_classes\n' +
          '• Sistema: listar_comandos, mapear_comando\n\n' +
          'Ex.: `criar canal anuncios` · `link de convite` · `saldo` · `criar classe ninja`'
      };
    }
  });
  registerTool({
    name: 'recarregar_tools',
    description: 'Reinicie o bot para recarregar tools',
    ownerOnly: true,
    async handler() {
      return { ok: true, text: 'Reinicie o serviço no Render para recarregar as tools.' };
    }
  });
};
