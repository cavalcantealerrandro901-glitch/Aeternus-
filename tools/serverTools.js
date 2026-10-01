const { ChannelType, PermissionFlagsBits } = require('discord.js');
function requireStaff(runtime) {
  const member = runtime.guild?.members?.cache?.get(runtime.userId);
  if (!member) return 'Membro nao encontrado.';
  const ok = member.permissions.has(PermissionFlagsBits.Administrator) || member.permissions.has(PermissionFlagsBits.ManageGuild) || member.permissions.has(PermissionFlagsBits.ManageChannels) || member.permissions.has(PermissionFlagsBits.ManageRoles);
  if (!ok) return 'Precisa permissao de gerenciar canais/cargos.';
  return null;
}
module.exports = function register({ registerTool }) {
  registerTool({ name: 'criar_canal', description: 'Cria canal texto', async handler(args, runtime) {
    const err = requireStaff(runtime); if (err) return { error: err }; if (!runtime.guild) return { error: 'So em servidor.' };
    let rawName = args.nome || args.name;
    if (!rawName && args.query) { const m = String(args.query).match(/(?:criar|crie|canal(?: de texto)?(?: chamado)?)\s+([\w\-\s]{2,40})/i); if (m) rawName = m[1].replace(/\b(categoria|na|no|de|texto|voz)\b/gi,'').trim(); }
    const nome = String(rawName || 'novo-canal').toLowerCase().replace(/\s+/g,'-').replace(/[^a-z0-9-_]/g,'').slice(0,90);
    try { const ch = await runtime.guild.channels.create({ name: nome, type: ChannelType.GuildText, reason: 'JARVIS' }); return { ok: true, text: 'Canal criado: ' + ch.toString() }; } catch (e) { return { error: e.message }; }
  }});
  registerTool({ name: 'criar_canal_voz', description: 'Canal voz', async handler(args, runtime) {
    const err = requireStaff(runtime); if (err) return { error: err }; if (!runtime.guild) return { error: 'So em servidor.' };
    try { const ch = await runtime.guild.channels.create({ name: String(args.nome||args.name||'voz').slice(0,90), type: ChannelType.GuildVoice, reason: 'JARVIS' }); return { ok: true, text: 'Voz: **'+ch.name+'**' }; } catch (e) { return { error: e.message }; }
  }});
  registerTool({ name: 'criar_categoria', description: 'Categoria', async handler(args, runtime) {
    const err = requireStaff(runtime); if (err) return { error: err }; if (!runtime.guild) return { error: 'So em servidor.' };
    try { const ch = await runtime.guild.channels.create({ name: String(args.nome||args.name||'Nova categoria').slice(0,90), type: ChannelType.GuildCategory, reason: 'JARVIS' }); return { ok: true, text: 'Categoria: **'+ch.name+'**' }; } catch (e) { return { error: e.message }; }
  }});
  registerTool({ name: 'criar_cargo', description: 'Cargo', async handler(args, runtime) {
    const err = requireStaff(runtime); if (err) return { error: err }; if (!runtime.guild) return { error: 'So em servidor.' };
    let nome = args.nome || args.name; if (!nome && args.query) { const m = String(args.query).match(/(?:criar|crie)\s+(?:um\s+)?cargo(?:\s+chamado)?\s+([\w\-\s]{2,40})/i); if (m) nome = m[1].trim(); }
    try { const role = await runtime.guild.roles.create({ name: String(nome||'Novo cargo').slice(0,90), reason: 'JARVIS' }); return { ok: true, text: 'Cargo: '+role.toString() }; } catch (e) { return { error: e.message }; }
  }});
  registerTool({ name: 'link_convite', description: 'Link convite', async handler(args, runtime) {
    const guild = runtime.guild; if (!guild) return { error: 'So em servidor.' };
    const me = guild.members.me;
    const channel = guild.channels.cache.find(c => c.isTextBased?.() && c.permissionsFor?.(me)?.has?.(PermissionFlagsBits.CreateInstantInvite));
    if (!channel) return { error: 'Sem permissao de convite.' };
    try { const invite = await channel.createInvite({ maxAge: 604800, maxUses: 0, reason: 'JARVIS' }); return { ok: true, text: '**'+guild.name+'**\nhttps://discord.gg/'+invite.code }; } catch (e) { return { error: e.message }; }
  }});
  registerTool({ name: 'listar_canais', description: 'Lista canais', async handler(_a, runtime) {
    if (!runtime.guild) return { error: 'So em servidor.' };
    const texts = runtime.guild.channels.cache.filter(c => c.type === ChannelType.GuildText).map(c => '#'+c.name).slice(0,30);
    return { ok: true, text: 'Canais: '+(texts.join(', ')||'—') };
  }});
  registerTool({ name: 'listar_cargos', description: 'Lista cargos', async handler(_a, runtime) {
    if (!runtime.guild) return { error: 'So em servidor.' };
    const roles = runtime.guild.roles.cache.filter(r => r.name !== '@everyone').map(r => r.name).slice(0,40);
    return { ok: true, text: 'Cargos: '+(roles.join(', ')||'—') };
  }});
  registerTool({ name: 'info_servidor', description: 'Info servidor', async handler(_a, runtime) {
    const g = runtime.guild; if (!g) return { error: 'So em servidor.' };
    return { ok: true, text: '**'+g.name+'**\nID `'+g.id+'`\nMembros **'+g.memberCount+'**\nCanais **'+g.channels.cache.size+'**\nDono <@'+g.ownerId+'>' };
  }});
};
