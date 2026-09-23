const { 
  SlashCommandBuilder, 
  EmbedBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  ComponentType, 
  AttachmentBuilder 
} = require('discord.js');
const fs = require('fs');
const path = require('path');

let AdmZip;
try {
  AdmZip = require('adm-zip');
} catch (e) {
  AdmZip = null;
}

function getZipFiles() {
  const searchFolders = [
    path.join(__dirname, '../data'),
    path.join(__dirname, '..'),
    path.join(process.cwd(), 'data'),
    process.cwd()
  ];

  const foundFiles = [];

  for (const folder of searchFolders) {
    const estaticoPath = path.join(folder, 'emoji_estaticos.zip');
    const animadoPath = path.join(folder, 'emoji_animados.zip');
    const genericoPath = path.join(folder, 'emojis.zip');

    if (fs.existsSync(estaticoPath) && !foundFiles.some(f => f.type === 'estatico')) {
      foundFiles.push({ type: 'estatico', path: estaticoPath });
    }
    if (fs.existsSync(animadoPath) && !foundFiles.some(f => f.type === 'animado')) {
      foundFiles.push({ type: 'animado', path: animadoPath });
    }
    if (fs.existsSync(genericoPath) && foundFiles.length === 0) {
      foundFiles.push({ type: 'geral', path: genericoPath });
    }
  }

  return foundFiles;
}

module.exports = {
  name: 'emoji',
  aliases: ['emojis', 'pegaremoji'],
  description: 'Busca e envia emojis dos arquivos zip (estáticos e animados)',

  data: new SlashCommandBuilder()
    .setName('emoji')
    .setNameLocalizations({
      'pt-BR': 'emoji',
      'en-US': 'emoji'
    })
    .setDescription('Busca e envia emojis dos arquivos zip (estáticos e animados)')
    .setDescriptionLocalizations({
      'pt-BR': 'Busca e envia emojis dos arquivos zip (estáticos e animados)',
      'en-US': 'Fetches and sends emojis from zip files (static and animated)'
    })
    .addStringOption(option =>
      option.setName('tipo')
        .setNameLocalizations({ 'pt-BR': 'tipo', 'en-US': 'type' })
        .setDescription('Filtro: estatico, animado, lista ou nome da categoria')
        .setRequired(false)),

  async executeSlash(interaction) {
    const tipo = interaction.options.getString('tipo')?.trim() || null;
    await processEmojiCommand(interaction, tipo, true);
  },

  async executePrefix(message, args) {
    const tipo = args.length > 0 ? args.join(' ').trim() : null;
    await processEmojiCommand(message, tipo, false);
  },

  async execute(message, args) {
    return this.executePrefix(message, args);
  }
};

async function processEmojiCommand(context, rawTipo, isSlash) {
  const author = isSlash ? context.user : context.author;

  if (!AdmZip) {
    const noAdmZipMsg = '❌ A biblioteca `adm-zip` não está instalada no bot. Execute no Termux: `npm install adm-zip`';
    return isSlash ? context.reply({ content: noAdmZipMsg, ephemeral: true }) : context.reply(noAdmZipMsg);
  }

  const zipFiles = getZipFiles();
  if (zipFiles.length === 0) {
    const noZipMsg = '❌ Nenhum arquivo ZIP encontrado!\n\n📌 **Coloque os arquivos no Termux:**\n• `emoji_estaticos.zip` e/ou `emoji_animados.zip` na pasta raiz do bot ou em `data/`.';
    return isSlash ? context.reply({ content: noZipMsg, ephemeral: true }) : context.reply(noZipMsg);
  }

  const allEntries = [];

  for (const zipInfo of zipFiles) {
    try {
      const zip = new AdmZip(zipInfo.path);
      const entries = zip.getEntries().filter(e => {
        if (e.isDirectory) return false;
        const ext = path.extname(e.entryName).toLowerCase();
        return ['.png', '.jpg', '.jpeg', '.gif', '.webp'].includes(ext);
      });

      entries.forEach(entry => {
        allEntries.push({
          entry,
          zipType: zipInfo.type,
          entryName: entry.entryName
        });
      });
    } catch (err) {
      console.error(`Erro ao abrir o ZIP ${zipInfo.path}:`, err);
    }
  }

  if (allEntries.length === 0) {
    const emptyMsg = '❌ Os arquivos ZIP não contêm imagens válidas (.png, .jpg, .gif, .webp).';
    return isSlash ? context.reply({ content: emptyMsg, ephemeral: true }) : context.reply(emptyMsg);
  }

  const inputTipo = rawTipo ? rawTipo.toLowerCase() : null;

  if (inputTipo === 'lista' || inputTipo === 'listar' || inputTipo === 'categorias' || inputTipo === 'tipos') {
    const estatCount = allEntries.filter(e => e.zipType === 'estatico' || path.extname(e.entryName).toLowerCase() !== '.gif').length;
    const animCount = allEntries.filter(e => e.zipType === 'animado' || path.extname(e.entryName).toLowerCase() === '.gif').length;

    const listEmbed = new EmbedBuilder()
      .setTitle('🎨 Biblioteca de Emojis — Aeternus')
      .setDescription(
        [
          `🖼️ **Estáticos:** ${estatCount} emoji(s)`,
          `🎞️ **Animados:** ${animCount} emoji(s)`,
          '',
          '📌 **Como usar os comandos:**',
          '• `O.emoji estatico` — Busca apenas emojis estáticos',
          '• `O.emoji animado` — Busca apenas emojis animados/GIFs',
          '• `O.emoji <nome>` — Busca por nome ou categoria específica'
        ].join('\n')
      )
      .setColor('#a78bfa')
      .setFooter({ text: `Total de emojis disponíveis: ${allEntries.length}` })
      .setTimestamp();

    return isSlash ? context.reply({ embeds: [listEmbed] }) : context.reply({ embeds: [listEmbed] });
  }

  let targetEntries = allEntries;
  let labelTag = 'Aleatório';

  if (inputTipo) {
    if (['estatico', 'estaticos', 'static', 'imagem', 'foto'].includes(inputTipo)) {
      targetEntries = allEntries.filter(e => e.zipType === 'estatico' || path.extname(e.entryName).toLowerCase() !== '.gif');
      labelTag = 'Estático';
    } else if (['animado', 'animados', 'animated', 'gif'].includes(inputTipo)) {
      targetEntries = allEntries.filter(e => e.zipType === 'animado' || path.extname(e.entryName).toLowerCase() === '.gif');
      labelTag = 'Animado';
    } else {
      targetEntries = allEntries.filter(e => e.entryName.toLowerCase().includes(inputTipo));
      labelTag = rawTipo;
    }

    if (targetEntries.length === 0) {
      const notFoundMsg = `❌ Nenhum emoji encontrado para **"${rawTipo}"**.\n\nUse \`O.emoji estatico\`, \`O.emoji animado\` ou \`O.emoji lista\`.`;
      return isSlash ? context.reply({ content: notFoundMsg, ephemeral: true }) : context.reply(notFoundMsg);
    }
  }

  function getRandomEmojiPayload(tag, list) {
    const item = list[Math.floor(Math.random() * list.length)];
    const buffer = item.entry.getData();
    const cleanFileName = path.basename(item.entryName);
    const attachment = new AttachmentBuilder(buffer, { name: cleanFileName });

    const isGif = path.extname(cleanFileName).toLowerCase() === '.gif' || item.zipType === 'animado';
    const typeBadge = isGif ? '🎞️ ANIMADO' : '🖼️ ESTÁTICO';

    const embed = new EmbedBuilder()
      .setTitle(`✨ Emoji: ${tag.toUpperCase()} [${typeBadge}]`)
      .setDescription(`**Arquivo:** \`${cleanFileName}\`\n**Solicitado por:** <@${author.id}>`)
      .setImage(`attachment://${cleanFileName}`)
      .setColor('#a78bfa')
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('next_emoji')
        .setLabel('Outro Emoji')
        .setEmoji('🎲')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('delete_emoji')
        .setLabel('Deletar')
        .setEmoji('🗑️')
        .setStyle(ButtonStyle.Danger)
    );

    return { embed, attachment, row };
  }

  const payload = getRandomEmojiPayload(labelTag, targetEntries);

  let response;
  if (isSlash) {
    response = await context.reply({
      embeds: [payload.embed],
      files: [payload.attachment],
      components: [payload.row],
      fetchReply: true
    });
  } else {
    response = await context.reply({
      embeds: [payload.embed],
      files: [payload.attachment],
      components: [payload.row]
    });
  }

  const collector = response.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 360000
  });

  collector.on('collect', async (i) => {
    if (i.user.id !== author.id) {
      return i.reply({ content: '❌ Apenas quem usou o comando pode interagir com esses botões.', ephemeral: true });
    }

    try {
      if (i.customId === 'next_emoji') {
        const newPayload = getRandomEmojiPayload(labelTag, targetEntries);
        await i.update({
          embeds: [newPayload.embed],
          files: [newPayload.attachment],
          components: [newPayload.row]
        });
      } else if (i.customId === 'delete_emoji') {
        collector.stop('deleted');
        await response.delete().catch(() => {});
      }
    } catch (err) {
      console.error('Erro na interação do emoji:', err);
    }
  });

  collector.on('end', (collected, reasonEnd) => {
    if (reasonEnd !== 'deleted') {
      const disabledRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('next_emoji_disabled')
          .setLabel('Outro Emoji')
          .setEmoji('🎲')
          .setStyle(ButtonStyle.Primary)
          .setDisabled(true),
        new ButtonBuilder()
          .setCustomId('delete_emoji_disabled')
          .setLabel('Deletar')
          .setEmoji('🗑️')
          .setStyle(ButtonStyle.Danger)
          .setDisabled(true)
      );
      response.edit({ components: [disabledRow] }).catch(() => {});
    }
  });
}
