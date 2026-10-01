const { PermissionFlagsBits } = require('discord.js');
function isMod(runtime) {
  const m = runtime.guild?.members?.cache?.get(runtime.userId);
  if (!m) return false;
  return m.permissions.has(PermissionFlagsBits.Administrator) || m.permissions.has(PermissionFlagsBits.ModerateMembers) || m.permissions.has(PermissionFlagsBits.BanMembers) || m.permissions.has(PermissionFlagsBits.KickMembers) || m.permissions.has(PermissionFlagsBits.ManageMessages);
}
function resolveMember(guild, query) {
  if (!guild || !query) return null;
  const q = String(query).replace(/[<@!>]/g, '').trim();
  return guild.members.cache.get(q) || guild.members.cache.find(m => m.user.username.toLowerCase().includes(q.toLowerCase()) || (m.displayName||'').toLowerCase().includes(q.toLowerCase()));
}
module.exports = function register({ registerTool }) {
  registerTool({ name: 'banir', description: 'Ban', async handler(args, runtime) {
    if (!isMod(runtime)) return { error: 'Sem permissao.' };
    const member = resolveMember(runtime.guild, args.usuario || args.target || args.query);
    if (!member) return { error: 'Usuario nao encontrado.' };
    try { await member.ban({ reason: 'JARVIS' }); return { ok: true, text: 'Banido: **'+member.user.tag+'**' }; } catch (e) { return { error: e.message }; }
  }});
  registerTool({ name: 'expulsar', description: 'Kick', async handler(args, runtime) {
    if (!isMod(runtime)) return { error: 'Sem permissao.' };
    const member = resolveMember(runtime.guild, args.usuario || args.target || args.query);
    if (!member) return { error: 'Usuario nao encontrado.' };
    try { await member.kick('JARVIS'); return { ok: true, text: 'Expulso: **'+member.user.tag+'**' }; } catch (e) { return { error: e.message }; }
  }});
  registerTool({ name: 'silenciar', description: 'Timeout', async handler(args, runtime) {
    if (!isMod(runtime)) return { error: 'Sem permissao.' };
    const member = resolveMember(runtime.guild, args.usuario || args.target || args.query);
    if (!member) return { error: 'Usuario nao encontrado.' };
    const min = Math.min(Math.max(parseInt(args.minutos||'10',10)||10,1), 10080);
    try { await member.timeout(min*60*1000, 'JARVIS'); return { ok: true, text: 'Timeout **'+min+'** min: **'+member.user.tag+'**' }; } catch (e) { return { error: e.message }; }
  }});
  registerTool({ name: 'limpar_chat', description: 'Purge', async handler(args, runtime) {
    if (!isMod(runtime)) return { error: 'Sem permissao.' };
    const n = Math.min(Math.max(parseInt(args.quantidade||args.count||'10',10)||10,1),100);
    try { const d = await runtime.channel.bulkDelete(n, true); return { ok: true, text: 'Removidas **'+d.size+'** msgs.' }; } catch (e) { return { error: e.message }; }
  }});
};
