const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const incidents = new Map();
function createActionRow(id, tested = false, closed = false) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('repair:test:' + id).setLabel('Testar').setEmoji('🧪').setStyle(ButtonStyle.Primary).setDisabled(closed),
    new ButtonBuilder().setCustomId('repair:approve:' + id).setLabel('Aprovar').setEmoji('✅').setStyle(ButtonStyle.Success).setDisabled(closed || !tested),
    new ButtonBuilder().setCustomId('repair:reject:' + id).setLabel('Recusar').setEmoji('❌').setStyle(ButtonStyle.Danger).setDisabled(closed)
  );
}
function registerIncident(data) { incidents.set(data.id, Object.assign({}, data, { status: 'pending', tested: false, candidate: null })); }
function canManage(i) {
  const owner = String(process.env.OWNER_ID || '');
  const role = String(process.env.AUTO_REPAIR_ROLE_ID || '');
  if (owner && i.user && i.user.id === owner) return true;
  const roles = i.member && i.member.roles;
  return !!(role && roles && roles.cache && roles.cache.has(role));
}
async function handleComponent(i) {
  if (!String(i.customId || '').startsWith('repair:')) return false;
  if (!canManage(i)) { await i.reply({ content: '⛔ Somente a equipe autorizada pode usar estes botões.', ephemeral: true }).catch(() => {}); return true; }
  const parts = i.customId.split(':');
  const action = parts[1], id = parts[2], item = incidents.get(id);
  if (!item) { await i.reply({ content: 'Incidente indisponível após reinicialização do bot.', ephemeral: true }).catch(() => {}); return true; }
  if (item.status !== 'pending') { await i.reply({ content: 'Este reparo já foi finalizado.', ephemeral: true }).catch(() => {}); return true; }
  await i.deferReply({ ephemeral: true }).catch(() => {});
  if (action === 'test') {
    await i.editReply({ content: '🧪 O incidente foi identificado, mas a geração/teste do código ainda precisa ser configurada.' }).catch(() => {});
    return true;
  }
  if (action === 'approve') {
    if (!item.tested || !item.candidate) { await i.editReply({ content: 'Teste a proposta antes de aprovar.' }).catch(() => {}); return true; }
    await i.editReply({ content: 'A proposta não contém uma correção validada para gravar.' }).catch(() => {});
    return true;
  }
  if (action === 'reject') {
    item.status = 'rejected'; item.candidate = null; item.tested = false;
    await i.editReply({ content: '❌ Proposta recusada. Nenhum código foi gravado.' }).catch(() => {});
    await i.message.edit({ components: [createActionRow(id, false, true)] }).catch(() => {});
    return true;
  }
  await i.editReply({ content: 'Ação desconhecida.' }).catch(() => {});
  return true;
}
module.exports = { registerIncident, createActionRow, handleComponent };
