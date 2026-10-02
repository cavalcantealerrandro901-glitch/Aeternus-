/**
 * aeternusCoreBoost — moderação + gerenciar servidor + memória
 * Edição de repo pelo Discord continua bloqueada (só Editor web).
 */
const core = require('./aeternusCore');
const { PermissionFlagsBits, ChannelType } = require('discord.js');

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
  if (!h) return null;
  const low = h.toLowerCase().replace(/^@/, '');
  return (
    guild.members.cache.find(
      (m) =>
        m.user.username.toLowerCase() === low ||
        m.displayName.toLowerCase() === low ||
        m.user.tag.toLowerCase() === low
    ) || null
  );
}

function resolveChannel(guild, message, hint) {
  if (!guild) return null;
  const h = String(hint || '').trim().replace(/^#/, '');
  if (!h) return message?.channel || null;
  if (message?.mentions?.channels?.size) {
    const c = message.mentions.channels.first();
    if (c) return c;
  }
  if (/^\d{15,22}$/.test(h)) return guild.channels.cache.get(h) || null;
  const low = h.toLowerCase();
  return (
    guild.channels.cache.find(
      (c) => c.name.toLowerCase() === low || c.name.toLowerCase().includes(low)
    ) || null
  );
}

function resolveRole(guild, hint) {
  if (!guild || !hint) return null;
  const h = String(hint).trim().replace(/^@/, '');
  if (/^\d{15,22}$/.test(h)) return guild.roles.cache.get(h) || null;
  const low = h.toLowerCase();
  return (
    guild.roles.cache.find((r) => r.name.toLowerCase() === low || r.name.toLowerCase().includes(low)) ||
    null
  );
}

function needPerm(guild, bit, label) {
  if (!guild?.members?.me?.permissions?.has(bit)) {
    return `Sem permissão **${label}**.`;
  }
  return null;
}

async function tryServerManage(command, message, client) {
  const t = String(command || '').trim();
  const low = t.toLowerCase();
  const guild = message.guild;

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
        'Use o **Editor** do site (`/editor.html`). Aqui: moderação + gerenciar servidor.'
    };
  }

  if (/\b(esquece|esquecer|limpa mem[oó]ria|clear memory)\b/i.test(low)) {
    memoryByUser.delete(String(message.author.id));
    return { handled: true, text: '🧠 Memória desta conversa limpa.' };
  }

  if (
    /^(ajuda|help)\s*(servidor|gerenciar|mod)?$/i.test(low) ||
    /\bo que (voc[eê]|tu) (pode|consegue) (fazer|gerenciar)\b/i.test(low)
  ) {
    return {
      handled: true,
      text:
        '**Gerenciar servidor / moderação** (me marque e peça):\n\n' +
        '**Canais:** criar/apagar texto·voz·categoria · renomear · tópico · trancar/destrancar · slowmode · mover pra categoria\n' +
        '**Cargos:** criar/apagar · dar/tirar · renomear\n' +
        '**Mods:** ban · kick · mute/timeout · unmute · limpar N msgs · nick\n' +
        '**Outros:** convite · listar canais/cargos/servidores · info servidor · renomear servidor\n' +
        '**Voz:** desconectar membro · mover pra canal de voz\n\n' +
        'Ex.: `criar canal avisos` · `trancar canal` · `dar cargo VIP @user` · `mute @user por 30m`'
    };
  }

  if (!guild) return { handled: false };

  if (/\b(tranca|trancar|lock)\b/i.test(low) && !/\bdestranc/i.test(low)) {
    const err = needPerm(guild, PermissionFlagsBits.ManageChannels, 'Gerenciar Canais');
    if (err) return { handled: true, text: err };
    const chHint = t.match(/(?:tranca|trancar|lock)\s+(?:o\s+)?(?:canal\s+)?(#?[\w-]+|\d{15,22})/i)?.[1];
    const ch = resolveChannel(guild, message, chHint) || message.channel;
    if (!ch?.permissionOverwrites) return { handled: true, text: 'Canal inválido.' };
    await ch.permissionOverwrites.edit(guild.roles.everyone, { SendMessages: false }, { reason: 'Aeternus lock' });
    return { handled: true, text: `🔒 Canal **#${ch.name}** trancado (everyone sem enviar).` };
  }

  if (/\b(destranca|destrancar|unlock)\b/i.test(low)) {
    const err = needPerm(guild, PermissionFlagsBits.ManageChannels, 'Gerenciar Canais');
    if (err) return { handled: true, text: err };
    const chHint = t.match(/(?:destranca|destrancar|unlock)\s+(?:o\s+)?(?:canal\s+)?(#?[\w-]+|\d{15,22})/i)?.[1];
    const ch = resolveChannel(guild, message, chHint) || message.channel;
    if (!ch?.permissionOverwrites) return { handled: true, text: 'Canal inválido.' };
    await ch.permissionOverwrites.edit(guild.roles.everyone, { SendMessages: null }, { reason: 'Aeternus unlock' });
    return { handled: true, text: `🔓 Canal **#${ch.name}** destrancado.` };
  }

  const renameCh =
    t.match(
      /(?:renomeia|renomear|renomeie)\s+(?:o\s+)?canal\s+(?:#)?([\w-]+|\d{15,22})\s+(?:para|pra)\s+["']?([^"'\n]+)["']?/i
    ) ||
    t.match(
      /(?:renomeia|renomear|renomeie)\s+(?:este|esse)\s+canal\s+(?:para|pra)\s+["']?([^"'\n]+)["']?/i
    );
  if (renameCh) {
    const err = needPerm(guild, PermissionFlagsBits.ManageChannels, 'Gerenciar Canais');
    if (err) return { handled: true, text: err };
    let ch, newName;
    if (renameCh.length >= 3 && renameCh[2]) {
      ch = resolveChannel(guild, message, renameCh[1]);
      newName = renameCh[2];
    } else {
      ch = message.channel;
      newName = renameCh[1];
    }
    if (!ch?.setName) return { handled: true, text: 'Canal não encontrado.' };
    const old = ch.name;
    await ch.setName(String(newName).replace(/\s+/g, '-').slice(0, 100), 'Aeternus');
    return { handled: true, text: `✅ Canal **#${old}** → **#${ch.name}**` };
  }

  const topicM = t.match(
    /(?:define|definir|seta|setar|muda|mudar)\s+(?:o\s+)?t[oó]pico\s+(?:para|pra|:)?\s*["']?([^"'\n]+)["']?/i
  );
  if (topicM) {
    const err = needPerm(guild, PermissionFlagsBits.ManageChannels, 'Gerenciar Canais');
    if (err) return { handled: true, text: err };
    const ch = message.channel;
    if (!ch?.setTopic) return { handled: true, text: 'Este canal não tem tópico.' };
    await ch.setTopic(topicM[1].slice(0, 1024), 'Aeternus');
    return { handled: true, text: `📌 Tópico de **#${ch.name}** atualizado.` };
  }

  const moveCh = t.match(
    /(?:move|mover)\s+(?:o\s+)?canal\s+(?:#)?([\w-]+|\d{15,22})\s+(?:para|pra)\s+(?:a\s+)?(?:categoria\s+)?["']?([^"'\n]+)["']?/i
  );
  if (moveCh) {
    const err = needPerm(guild, PermissionFlagsBits.ManageChannels, 'Gerenciar Canais');
    if (err) return { handled: true, text: err };
    const ch = resolveChannel(guild, message, moveCh[1]);
    const cat = guild.channels.cache.find(
      (c) =>
        c.type === ChannelType.GuildCategory &&
        (c.name.toLowerCase() === moveCh[2].toLowerCase() ||
          c.name.toLowerCase().includes(moveCh[2].toLowerCase()))
    );
    if (!ch) return { handled: true, text: 'Canal não encontrado.' };
    if (!cat) return { handled: true, text: `Categoria \`${moveCh[2]}\` não encontrada.` };
    await ch.setParent(cat.id, { reason: 'Aeternus' });
    return { handled: true, text: `📁 **#${ch.name}** movido para **${cat.name}**.` };
  }

  const takeRole =
    t.match(
      /(?:tira|tirar|remova|remover|remove)\s+(?:o\s+)?cargo\s+["']?([^"'\n]+?)["']?\s+(?:de|do|da)\s+<@!?(\d+)>/i
    ) ||
    t.match(
      /(?:tira|tirar|remova|remover)\s+(?:o\s+)?cargo\s+["']?([^"'\n]+?)["']?\s+(?:de|do)\s+(\d{15,22})/i
    );
  if (takeRole) {
    const err = needPerm(guild, PermissionFlagsBits.ManageRoles, 'Gerenciar Cargos');
    if (err) return { handled: true, text: err };
    const role = resolveRole(guild, takeRole[1]);
    const member = await resolveMember(guild, message, takeRole[2]);
    if (!role) return { handled: true, text: `Cargo \`${takeRole[1]}\` não encontrado.` };
    if (!member) return { handled: true, text: 'Membro não encontrado.' };
    await member.roles.remove(role, 'Aeternus');
    return { handled: true, text: `✅ Cargo **${role.name}** removido de **${member.user.tag}**.` };
  }

  const renameRole = t.match(
    /(?:renomeia|renomear|renomeie)\s+(?:o\s+)?cargo\s+["']?([^"'\n]+?)["']?\s+(?:para|pra)\s+["']?([^"'\n]+)["']?/i
  );
  if (renameRole) {
    const err = needPerm(guild, PermissionFlagsBits.ManageRoles, 'Gerenciar Cargos');
    if (err) return { handled: true, text: err };
    const role = resolveRole(guild, renameRole[1]);
    if (!role || role.id === guild.id) return { handled: true, text: 'Cargo não encontrado.' };
    const old = role.name;
    await role.setName(renameRole[2].trim().slice(0, 100), 'Aeternus');
    return { handled: true, text: `✅ Cargo **${old}** → **${role.name}**` };
  }

  const renameGuild = t.match(
    /(?:renomeia|renomear|renomeie)\s+(?:o\s+)?servidor\s+(?:para|pra)\s+["']?([^"'\n]+)["']?/i
  );
  if (renameGuild) {
    const err = needPerm(guild, PermissionFlagsBits.ManageGuild, 'Gerenciar Servidor');
    if (err) return { handled: true, text: err };
    const old = guild.name;
    await guild.setName(renameGuild[1].trim().slice(0, 100), 'Aeternus');
    return { handled: true, text: `✅ Servidor **${old}** → **${guild.name}**` };
  }

  const dcVoice = t.match(
    /(?:desconecta|desconectar|disconnect)\s+(?:o\s+)?(?:@)?(<@!?\d+>|\d{15,22})/i
  );
  if (dcVoice || (/\b(desconecta|disconnect)\b/i.test(low) && message.mentions?.users?.size)) {
    const err = needPerm(guild, PermissionFlagsBits.MoveMembers, 'Mover Membros');
    if (err) return { handled: true, text: err };
    const target = await resolveMember(guild, message, dcVoice?.[1]);
    if (!target) return { handled: true, text: 'Marca quem desconectar.' };
    if (!target.voice?.channel) return { handled: true, text: `**${target.user.tag}** não está em voz.` };
    await target.voice.disconnect('Aeternus');
    return { handled: true, text: `🔌 **${target.user.tag}** desconectado da call.` };
  }

  const moveVoice = t.match(
    /(?:move|mover)\s+(?:o\s+)?(?:@)?(<@!?\d+>|\d{15,22})\s+(?:para|pra)\s+(?:o\s+)?(?:canal\s+)?(?:de\s+)?voz\s+["']?([^"'\n]+)["']?/i
  );
  if (moveVoice) {
    const err = needPerm(guild, PermissionFlagsBits.MoveMembers, 'Mover Membros');
    if (err) return { handled: true, text: err };
    const target = await resolveMember(guild, message, moveVoice[1]);
    const voiceCh = guild.channels.cache.find(
      (c) =>
        (c.type === ChannelType.GuildVoice || c.type === ChannelType.GuildStageVoice) &&
        (c.name.toLowerCase() === moveVoice[2].toLowerCase() ||
          c.name.toLowerCase().includes(moveVoice[2].toLowerCase()))
    );
    if (!target) return { handled: true, text: 'Membro não encontrado.' };
    if (!voiceCh) return { handled: true, text: `Canal de voz \`${moveVoice[2]}\` não encontrado.` };
    await target.voice.setChannel(voiceCh, 'Aeternus');
    return { handled: true, text: `🔊 **${target.user.tag}** movido para **${voiceCh.name}**.` };
  }

  if (/\b(ativa|ativar|liga|ligar)\s+nsfw\b/i.test(low)) {
    const err = needPerm(guild, PermissionFlagsBits.ManageChannels, 'Gerenciar Canais');
    if (err) return { handled: true, text: err };
    if (!message.channel?.setNSFW) return { handled: true, text: 'Este canal não suporta NSFW.' };
    await message.channel.setNSFW(true, 'Aeternus');
    return { handled: true, text: `🔞 NSFW ativado em **#${message.channel.name}**.` };
  }
  if (/\b(desativa|desativar|desliga|desligar)\s+nsfw\b/i.test(low)) {
    const err = needPerm(guild, PermissionFlagsBits.ManageChannels, 'Gerenciar Canais');
    if (err) return { handled: true, text: err };
    if (!message.channel?.setNSFW) return { handled: true, text: 'Este canal não suporta NSFW.' };
    await message.channel.setNSFW(false, 'Aeternus');
    return { handled: true, text: `✅ NSFW desativado em **#${message.channel.name}**.` };
  }

  if (/\b(bane|banir|ban)\b/i.test(low)) {
    const err = needPerm(guild, PermissionFlagsBits.BanMembers, 'Banir Membros');
    if (err) return { handled: true, text: err };
    const m = t.match(/(?:bane|banir|ban)\s+(?:o\s+)?(?:@)?(<@!?\d+>|\d{15,22})/i);
    const target = await resolveMember(guild, message, m?.[1]);
    const reason = (t.match(/(?:por|motivo)\s+(.+)$/i)?.[1] || 'Banido via Aeternus').slice(0, 200);
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
    const err = needPerm(guild, PermissionFlagsBits.BanMembers, 'Banir Membros');
    if (err) return { handled: true, text: err };
    const m = t.match(/(\d{15,22})/);
    if (!m) return { handled: true, text: 'Passe o ID pra desbanir.' };
    await guild.members.unban(m[1], 'Aeternus');
    return { handled: true, text: `✅ Desbanido \`${m[1]}\`.` };
  }

  if (/\b(expulsa|expulsar|kick)\b/i.test(low)) {
    const err = needPerm(guild, PermissionFlagsBits.KickMembers, 'Expulsar Membros');
    if (err) return { handled: true, text: err };
    const m = t.match(/(?:expulsa|expulsar|kick)\s+(?:o\s+)?(?:@)?(<@!?\d+>|\d{15,22})/i);
    const target = await resolveMember(guild, message, m?.[1]);
    const reason = (t.match(/(?:por|motivo)\s+(.+)$/i)?.[1] || 'Expulso via Aeternus').slice(0, 200);
    if (!target) return { handled: true, text: 'Marca quem expulsar.' };
    if (!target.kickable) return { handled: true, text: `Não consigo expulsar **${target.user.tag}**.` };
    await target.kick(reason);
    return { handled: true, text: `👢 **${target.user.tag}** expulso — ${reason}` };
  }

  if (/\b(unmute|desmutar|desilencia|remover timeout)\b/i.test(low)) {
    const err = needPerm(guild, PermissionFlagsBits.ModerateMembers, 'Moderar Membros');
    if (err) return { handled: true, text: err };
    const m = t.match(
      /(?:unmute|desmutar|desilencia|remover timeout)\s+(?:o\s+)?(?:@)?(<@!?\d+>|\d{15,22})/i
    );
    const target = await resolveMember(guild, message, m?.[1]);
    if (!target) return { handled: true, text: 'Marca quem desmutar.' };
    await target.timeout(null, 'Aeternus unmute');
    return { handled: true, text: `🔊 Timeout removido de **${target.user.tag}**.` };
  }

  if (/\b(mute|mutar|silencia|silenciar|timeout|castigo)\b/i.test(low)) {
    const err = needPerm(guild, PermissionFlagsBits.ModerateMembers, 'Moderar Membros');
    if (err) return { handled: true, text: err };
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
    const err = needPerm(guild, PermissionFlagsBits.ManageMessages, 'Gerenciar Mensagens');
    if (err) return { handled: true, text: err };
    if (!message.channel?.bulkDelete) return { handled: true, text: 'Só em canal de texto.' };
    const n = Math.min(100, Math.max(1, Number(clearM[1]) || 10));
    const deleted = await message.channel.bulkDelete(n, true);
    return { handled: true, text: `🧹 Apaguei **${deleted.size}** mensagem(ns).` };
  }

  const slowM = t.match(/(?:slowmode|modo lento)\s+(\d+)\s*(s|sec|m|min)?/i);
  if (slowM) {
    const err = needPerm(guild, PermissionFlagsBits.ManageChannels, 'Gerenciar Canais');
    if (err) return { handled: true, text: err };
    let sec = Number(slowM[1]) || 0;
    if (/^m/.test(slowM[2] || '')) sec *= 60;
    sec = Math.min(21600, Math.max(0, sec));
    await message.channel.setRateLimitPerUser(sec, 'Aeternus');
    return {
      handled: true,
      text: sec ? `🐢 Slowmode **${sec}s**` : '🐢 Slowmode desligado'
    };
  }

  const nickM = t.match(
    /(?:nick|apelido|renomear membro)\s+(?:de\s+)?(?:@)?(<@!?\d+>|\d{15,22})\s+(?:para\s+)?["']?([^"'\n]+)["']?/i
  );
  if (nickM) {
    const err = needPerm(guild, PermissionFlagsBits.ManageNicknames, 'Gerenciar Apelidos');
    if (err) return { handled: true, text: err };
    const target = await resolveMember(guild, message, nickM[1]);
    if (!target) return { handled: true, text: 'Membro não encontrado.' };
    await target.setNickname(nickM[2].trim().slice(0, 32), 'Aeternus');
    return { handled: true, text: `✅ Apelido de **${target.user.tag}** → **${nickM[2].trim().slice(0, 32)}**` };
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
    const mgr = await tryServerManage(command, message, client);
    if (mgr.handled) {
      pushMem(message.author.id, 'user', command);
      pushMem(message.author.id, 'assistant', mgr.text);
      await message
        .reply({ content: mgr.text.slice(0, 1900) })
        .catch(() => message.channel.send(mgr.text.slice(0, 1900)).catch(() => {}));
      return true;
    }
  } catch (e) {
    await message.reply(`❌ Servidor/mod: ${e.message}`).catch(() => {});
    return true;
  }

  const mem = formatMem(message.author.id);
  const origChat = core.chatAI;
  if (typeof origChat === 'function') {
    core.chatAI = async (userMessage, contextBlock = '') => {
      const extra =
        mem +
        (contextBlock || '') +
        '\nVocê gerencia o servidor Discord do dono (canais, cargos, mods). NÃO edita GitHub daqui.\n';
      const r = await origChat(userMessage, extra);
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
    console.log('[aeternusCoreBoost] gerenciar servidor + mod + memória (sem write github)');
  },
  handleOwnerMessage
};
