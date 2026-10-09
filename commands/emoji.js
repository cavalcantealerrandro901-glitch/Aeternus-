const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const media = require('../utils/avatarMedia');

function isOwner(user, client) {
  const ids = String(process.env.OWNER_ID || process.env.EDITOR_OWNER_ID || '').split(',').map(x => x.trim()).filter(Boolean);
  return ids.includes(user.id) || user.id === client.application?.owner?.id;
}

module.exports = {
  name: 'emojis', aliases: ['emoji', 'figurinhas', 'stickers'],
  description: 'Cria e sincroniza emojis, figurinhas e GIFs com a foto atual do Aeternus.',
  data: new SlashCommandBuilder().setName('emoji').setDescription('Gerencia emojis e figurinhas do Aeternus')
    .addStringOption(o => o.setName('acao').setDescription('Ação').setRequired(false).addChoices(
      { name: 'ajuda', value: 'ajuda' }, { name: 'listar', value: 'listar' },
      { name: 'criar', value: 'criar' }, { name: 'atualizar', value: 'atualizar' })),
  async executeSlash(i) { await run(i, i.options.getString('acao') || 'ajuda', true); },
  async executePrefix(m, args) { await run(m, args[0] || 'ajuda', false); },
  async execute(m, args) { return this.executePrefix(m, args); }
};

async function run(ctx, action, slash) {
  const client = ctx.client, user = slash ? ctx.user : ctx.author;
  const reply = p => ctx.reply(p);
  if (!isOwner(user, client)) return reply({ content: '🔒 Apenas o proprietário do Aeternus pode usar este sistema.', ephemeral: slash });
  if (['ajuda', 'help'].includes(action)) {
    const e = new EmbedBuilder().setColor(0x38bdf8).setTitle('✦ AETERNUS • CENTRAL DE EMOJIS')
      .setDescription(['`O.emojis criar` — cria 3 emojis estáticos, 1 GIF animado e tenta criar uma figurinha.',
        '`O.emojis listar` — lista os emojis gerados no servidor atual.',
        '`O.emojis atualizar` — atualiza os emojis existentes com a foto atual do bot.', '',
        'Ao detectar mudança de avatar, o sistema sincroniza os emojis gerados em servidores onde eles já existem.',
        'Requer permissão **Gerenciar Expressões** e espaço disponível no servidor.'].join('\n'))
      .setFooter({ text: 'Aeternus • Avatar Media System' });
    return reply({ embeds: [e], ephemeral: slash });
  }
  if (!ctx.guild) return reply({ content: 'Use este comando dentro de um servidor.', ephemeral: slash });
  if (!ctx.guild.members.me?.permissions.has(PermissionFlagsBits.ManageGuildExpressions))
    return reply({ content: '❌ Preciso da permissão **Gerenciar Expressões**.', ephemeral: slash });
  if (slash) await ctx.deferReply({ ephemeral: true });
  const send = p => slash ? ctx.editReply(p) : ctx.channel.send(p);
  try {
    const guild = ctx.guild;
    const owned = guild.emojis.cache.filter(e => /^aet_(avatar|glow|purple|pulse)$/.test(e.name));
    if (['listar', 'lista'].includes(action)) {
      const list = owned.size ? owned.map(e => (e.animated ? '🎞️ ' : '🖼️ ') + e.toString() + ' — `' + e.name + '`').join('\n') : '_Nenhum emoji criado. Use `O.emojis criar`._';
      return send({ embeds: [new EmbedBuilder().setColor(0x38bdf8).setTitle('✦ Biblioteca Aeternus').setDescription(list)] });
    }
    if (!['criar', 'atualizar', 'update'].includes(action)) return send({ content: 'Ação desconhecida. Use `O.emojis ajuda`.' });
    const items = [
      { name: 'aet_avatar', data: await media.staticEmoji(client, 'normal') },
      { name: 'aet_glow', data: await media.staticEmoji(client, 'glow') },
      { name: 'aet_purple', data: await media.staticEmoji(client, 'purple') },
      { name: 'aet_pulse', data: await media.animatedEmoji(client) }
    ];
    const results = [];
    for (const item of items) {
      const old = guild.emojis.cache.find(e => e.name === item.name);
      if (old) { await guild.emojis.edit(old.id, { name: item.name, image: item.data, reason: 'Sincronização do avatar do Aeternus' }); results.push('♻️ Atualizado :' + item.name + ':'); }
      else { const created = await guild.emojis.create({ attachment: item.data, name: item.name, reason: 'Avatar Media System Aeternus' }); results.push('✅ Criado ' + created.toString()); }
    }
    let stickerNote = '';
    if (!guild.stickers.cache.some(s => s.name === 'Aeternus Avatar')) {
      try { await guild.stickers.create({ file: await media.stickerPng(client), name: 'Aeternus Avatar', tags: '✨', description: 'Avatar atual do Aeternus' }); stickerNote = '\n✅ Figurinha criada.'; }
      catch (e) { stickerNote = '\n⚠️ Figurinha não criada: ' + String(e.message || e).slice(0, 160); }
    } else stickerNote = '\nℹ️ A figurinha já existe. O Discord não permite trocar a imagem dela diretamente; remova e recrie para mudar a arte.';
    return send({ embeds: [new EmbedBuilder().setColor(0x22c55e).setTitle('✦ AETERNUS • CONTEÚDOS SINCRONIZADOS')
      .setDescription(results.join('\n') + stickerNote).setFooter({ text: 'Emojis vinculados ao avatar atual do bot.' }).setTimestamp()] });
  } catch (e) {
    console.error('[emojis]', e);
    return send({ content: '❌ Não foi possível concluir: ' + String(e.message || e).slice(0, 220) });
  }
}
