/**
 * Aeternus Core — IA desativada (mantém exports para não quebrar loaders)
 */
const { ChannelType, PermissionFlagsBits } = require('discord.js');

const OWNER_ID = () => String(process.env.OWNER_ID || '').trim();
function env(n) { return String(process.env[n] || '').trim(); }
function isOwner(userId) { const oid = OWNER_ID(); return oid && String(userId) === oid; }

function isAdmin(member, userId) {
  if (isOwner(userId)) return true;
  if (!member) return false;
  try {
    const perms = member.permissions;
    if (!perms) return false;
    return (
      perms.has(PermissionFlagsBits.Administrator) ||
      perms.has(PermissionFlagsBits.ManageGuild)
    );
  } catch (_) {
    return false;
  }
}

function detectActivation() {
  return { activated: false, command: '' };
}

async function handleOwnerMessage(message, client) {
  // IA pública desativada
  return false;
}

module.exports = {
  name: 'aeternusCore',
  isOwner,
  isAdmin,
  detectActivation,
  handleOwnerMessage,
  start() {
    console.log('🧩 [SISTEMA] aeternusCore.js — IA desativada');
  },
  stop() {}
};
