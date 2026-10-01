module.exports = function register({ registerTool }) {
  const MAP = [
    { keys: ['minas', 'mines'], cmd: 'comando de minas do servidor' },
    { keys: ['saldo', 'balance'], cmd: 'tool **saldo**' },
    { keys: ['daily'], cmd: 'tool **daily**' },
    { keys: ['convite', 'invite'], cmd: 'tool **link_convite**' },
    { keys: ['canal'], cmd: 'tool **criar_canal** (staff)' },
    { keys: ['cargo', 'role'], cmd: 'tool **criar_cargo** (staff)' }
  ];
  registerTool({
    name: 'listar_comandos',
    description: 'Sugere comandos',
    async handler() {
      return {
        ok: true,
        text: '**Pedidos ao JARVIS**\n' + MAP.map((m) => '• ' + m.keys[0] + ' → ' + m.cmd).join('\n')
      };
    }
  });
  registerTool({
    name: 'mapear_comando',
    description: 'Mapeia pedido. Args: pedido',
    async handler(args) {
      const q = String(args.pedido || args.query || '').toLowerCase();
      const hit = MAP.find((m) => m.keys.some((k) => q.includes(k)));
      if (hit) return { ok: true, text: 'Sugestão: ' + hit.cmd };
      return { ok: true, text: 'Tente listar_ferramentas.' };
    }
  });
};
