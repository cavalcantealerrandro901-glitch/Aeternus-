/**
 * Carregado pelo loaders — reforça moderação, memória e bloqueia write no GitHub via Discord.
 * Não remove o aeternusCore original; envelopa handleOwnerMessage.
 */
const core = require('./aeternusCore');
const { PermissionFlagsBits } = require('discord.js');

const memoryByUser = new Map();
const MEMORY_LIMIT = 24;

function pushMem(uid, role, text) {
  const id = String(uid);
  const arr = memoryByUser.get(id) || [];
  arr.push({ role, text: String(text || '').slice(0, 1500), at: Date.now() });
  while (arr.length > MEMORY_LIMIT) arr.shift();
  memoryByUser.set(id, arr);
}
function formatMem(uid) {
  const arr = memoryByUser.get(String(uid)) || [];
  if (!arr.length) return '';
  return (
    'Histórico recente (continue o assunto):\n' +
    arr.map((h) => (h.role === 'user' ? 'Usuário: ' : 'Aeternus: ') + h.text).join('\n') +
    '\n'
  );
}

function parseDurationMs(raw) {
  if (!raw) return 10 * 60 * 1000;
  const m = String(raw)
    .toLowerCase()
    .match(/^(\d+)\s*(s|sec|segs?|m|min|mins?|h|hora|horas|d|dia|dias)?$/i);
  if (!m) return 10 * 60 * 1000;
  const n = Number(m[1]);
  const u = (m[2] || 'm')[0];
  if (u === 's') return Math.min(n * 1000, 28 * 24 * 3600 * 1000);
  if (u === 'h') return Math.min(n * 3600 * 1000, 28 * 24 * 3600 * 1000);
  if (u === 'd') return Math.min(n * 24 * 3600 * 1000, 28 * 24 * 3600 * 1000);
  return Math.min(n * 60 * 1000, 28 * 24 * 3600 * 1000);
}

async function resolveMember(guild, message, hint) {
  const h = String(hint || '').trim();
  let id = null;
  const mm = h.match(/^<@!?(\d+)>$/);
  if (mm) id = mm[1];
  else if (/^\d{15,22}$/.test(h)) id = h;
  else if (message?.mentions?.users?.size) id = [...message.mentions.users.keys()][0];
  if (id) return guild.members.fetch(id).catch(() => null);
  return null;
}

async function tryModeration(command, message, client) {
  const t = String(command || '').trim();
  const low = t.toLowerCase();
  const guild = message.guild;
  if (!guild) return { handled: false };

  if (
    /\b(escreva|escrever|salve|salvar|crie arquivo|criar arquivo|update arquivo|atualize arquivo|commit|push|edite o (?:repo|arquivo)|modifique o arquivo)\b/i.test(
      t
    ) ||
    /\b(crie|criar)\s+(?:um\s+)?(?:repo|reposit)/i.test(t)
  ) {
    return {
      handled: true,
      text:
        '🛑 **Edição de código/repo pelo Discord está desligada.**\n' +
        'Use o **Editor** do site (`/editor.html`). Aqui só moderação, servidor e conversa.'
    };
  }

  if (/\b(esquece|esquecer|limpa mem[oó]ria|clear memory)\b/i.test(low)) {
    memoryByUser.delete(String(message.author.id));
    return { handled: true, text: '🧠 Memória desta conversa limpa.' };
  }

  if (/\b(bane|banir|ban)\b/i.test(low)) {
    if (!guild.members.me?.permissions?.has(PermissionFlagsBits.BanMembers)) {
      return { handled: true, text: 'Sem permissão **Banir Membros**.' };
    }
    const m = t.match(/(?:bane|banir|ban)\s+(?:o\s+)?(?:@)?(<@!?\d+>|\d{15,22})/i);
    const target = await resolveMember(guild, message, m?.[1]);
    const reasonMatch = t.match(/(?:por|motivo)\s+(.+)$/i);
    const reason = (reasonMatch?.[1] || 'Banido via Aeternus').slice(0, 200);
    if (!target && m?.[1]) {
      const id = String(m[1]).replace(/\D/g, '');
      if (/^\d{15,22}$/.test(id)) {
        await guild.members.ban(id, { reason });
        return { handled: true, text: `🔨 Banido \`${id}\` — ${reason}` };
      }
    }
    if (!target) return { handled: true, text: 'Marca quem banir ou passa o ID.' };
    if (!target.bannable) return { handled: true, text: `Não consigo banir **${target.user.tag}**.` };
    await target.ban({ reason });
    return { handled: true, text: `🔨 **${target.user.tag}** banido — ${reason}` };
  }

  if (/\b(desbane|desbanir|unban)\b/i.test(low)) {
    if (!guild.members.me?.permissions?.has(PermissionFlagsBits.BanMembers)) {
      return { handled: true, text: 'Sem permissão **Banir Membros**.' };
    }
    const m = t.match(/(\d{15,22})/);
    if (!m) return { handled: true, text: 'Passe o ID pra desbanir.' };
    await guild.members.unban(m[1], 'Aeternus');
    return { handled: true, text: `✅ Desbanido \`${m[1]}\`.` };
  }

  if (/\b(expulsa|expulsar|kick)\b/i.test(low)) {
    if (!guild.members.me?.permissions?.has(PermissionFlagsBits.KickMembers)) {
      return { handled: true, text: 'Sem permissão **Expulsar Membros**.' };
    }
    const m = t.match(/(?:expulsa|expulsar|kick)\s+(?:o\s+)?(?:@)?(<@!?\d+>|\d{15,22})/i);
    const target = await resolveMember(guild, message, m?.[1]);
    const reason = (t.match(/(?:por|motivo)\s+(.+)$/i)?.[1] || 'Expulso via Aeternus').slice(0, 200);
    if (!target) return { handled: true, text: 'Marca quem expulsar.' };
    if (!target.kickable) return { handled: true, text: `Não consigo expulsar **${target.user.tag}**.` };
    await target.kick(reason);
    return { handled: true, text: `👢 **${target.user.tag}** expulso — ${reason}` };
  }

  if (/\b(unmute|desmutar|desilencia|remover timeout)\b/i.test(low)) {
    if (!guild.members.me?.permissions?.has(PermissionFlagsBits.ModerateMembers)) {
      return { handled: true, text: 'Sem permissão **Moderar Membros**.' };
    }
    const m = t.match(
      /(?:unmute|desmutar|desilencia|remover timeout)\s+(?:o\s+)?(?:@)?(<@!?\d+>|\d{15,22})/i
    );
    const target = await resolveMember(guild, message, m?.[1]);
    if (!target) return { handled: true, text: 'Marca quem desmutar.' };
    await target.timeout(null, 'Aeternus unmute');
    return { handled: true, text: `🔊 Timeout removido de **${target.user.tag}**.` };
  }

  if (/\b(mute|mutar|silencia|silenciar|timeout|castigo)\b/i.test(low)) {
    if (!guild.members.me?.permissions?.has(PermissionFlagsBits.ModerateMembers)) {
      return { handled: true, text: 'Sem permissão **Moderar Membros** (timeout).' };
    }
    const m = t.match(
      /(?:mute|mutar|silencia|silenciar|timeout|castigo)\s+(?:o\s+)?(?:@)?(<@!?\d+>|\d{15,22})(?:\s+por\s+(\d+\s*\w+))?/i
    );
    const target = await resolveMember(guild, message, m?.[1]);
    const ms = parseDurationMs(m?.[2] || '10m');
    const reason = (t.match(/(?:motivo)\s+(.+)$/i)?.[1] || 'Timeout via Aeternus').slice(0, 200);
    if (!target) return { handled: true, text: 'Marca quem silenciar.' };
    if (!target.moderatable)
      return { handled: true, text: `Não consigo timeout em **${target.user.tag}**.` };
    await target.timeout(ms, reason);
    return {
      handled: true,
      text: `🔇 **${target.user.tag}** em timeout por **${Math.round(ms / 60000)} min** — ${reason}`
    };
  }

  const clearM = t.match(
    /(?:limpa|limpar|clear|purge)\s+(?:as\s+)?(?:últimas\s+)?(\d{1,3})\s*(?:mensagens?)?/i
  );
  if (clearM) {
    if (!guild.members.me?.permissions?.has(PermissionFlagsBits.ManageMessages)) {
      return { handled: true, text: 'Sem permissão **Gerenciar Mensagens**.' };
    }
    if (!message.channel?.bulkDelete) return { handled: true, text: 'Só em canal de texto.' };
    const n = Math.min(100, Math.max(1, Number(clearM[1]) || 10));
    const deleted = await message.channel.bulkDelete(n, true);
    return { handled: true, text: `🧹 Apaguei **${deleted.size}** mensagem(ns).` };
  }

  const slowM = t.match(/(?:slowmode|modo lento)\s+(\d+)\s*(s|sec|m|min)?/i);
  if (slowM) {
    if (!guild.members.me?.permissions?.has(PermissionFlagsBits.ManageChannels)) {
      return { handled: true, text: 'Sem permissão **Gerenciar Canais**.' };
    }
    let sec = Number(slowM[1]) || 0;
    if (/^m/.test(slowM[2] || '')) sec *= 60;
    sec = Math.min(21600, Math.max(0, sec));
    await message.channel.setRateLimitPerUser(sec, 'Aeternus');
    return {
      handled: true,
      text: sec ? `🐢 Slowmode **${sec}s**` : '🐢 Slowmode desligado'
    };
  }

  return { handled: false };
}

const origHandle = core.handleOwnerMessage.bind(core);

async function handleOwnerMessage(message, client) {
  if (!core.isOwner(message.author.id)) return false;

  const content = String(message.content || '');
  const isDm = !message.guild;
  let activated = false;
  let command = content;
  if (isDm) {
    activated = true;
    const det = core.detectActivation(content, client, message);
    if (det.activated && det.command) command = det.command;
  } else {
    const det = core.detectActivation(content, client, message);
    activated = det.activated;
    command = det.command || '';
    if (!activated && message.reference?.messageId) {
      try {
        const ref = await message.channel.messages
          .fetch(message.reference.messageId)
          .catch(() => null);
        if (ref?.author?.id === client.user?.id) {
          activated = true;
          command = content.trim();
        }
      } catch (_) {}
    }
  }
  if (!activated) return false;
  if (!command || !String(command).trim()) {
    return origHandle(message, client);
  }

  try {
    const mod = await tryModeration(command, message, client);
    if (mod.handled) {
      pushMem(message.author.id, 'user', command);
      pushMem(message.author.id, 'assistant', mod.text);
      await message
        .reply({ content: mod.text.slice(0, 1900) })
        .catch(() => message.channel.send(mod.text.slice(0, 1900)).catch(() => {}));
      return true;
    }
  } catch (e) {
    await message.reply(`❌ Moderação: ${e.message}`).catch(() => {});
    return true;
  }

  const mem = formatMem(message.author.id);
  const origChat = core.chatAI;
  if (typeof origChat === 'function') {
    core.chatAI = async (userMessage, contextBlock = '') => {
      const r = await origChat(userMessage, mem + (contextBlock || ''));
      if (r?.text) pushMem(message.author.id, 'assistant', r.text);
      return r;
    };
  }
  pushMem(message.author.id, 'user', command);
  try {
    return await origHandle(message, client);
  } finally {
    if (typeof origChat === 'function') core.chatAI = origChat;
  }
}

core.handleOwnerMessage = handleOwnerMessage;
core.putFile = async () => {
  throw new Error('Edição de repo pelo Discord desativada. Use o Editor web.');
};
core.createRepo = async () => {
  throw new Error('Criar repo pelo Discord desativado.');
};

module.exports = {
  setup(client) {
    if (typeof core.setup === 'function') core.setup(client);
    if (client.aeternusCore) {
      client.aeternusCore.handleOwnerMessage = handleOwnerMessage;
      client.aeternusCore.putFile = core.putFile;
      client.aeternusCore.createRepo = core.createRepo;
    }
    console.log('[aeternusCoreBoost] mod+memória+sem-write-github no Discord');
  },
  handleOwnerMessage
};
