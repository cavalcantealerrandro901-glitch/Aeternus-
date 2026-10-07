const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits
} = require('discord.js');

const PANEL_URL =
  process.env.PANEL_URL ||
  process.env.PUBLIC_URL ||
  process.env.RENDER_EXTERNAL_URL ||
  'https://aeternus-qsrc.onrender.com';

module.exports = {
  name: 'painel',
  aliases: [
    'config',
    'configuracao',
    'configurações',
    'configurar',
    'admin',
    'administracao',
    'dashboard',
    'dash',
    'settings',
    'setup',
    'paineladmin',
    'gerenciar',
    'gerenciamento',
    'suporte',
    'suport'
  ],
  description: 'Abre o painel de administração do servidor',

  data: new SlashCommandBuilder()
    .setName('painel')
    .setDescription('Abre o painel de administração do servidor')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async executeSlash(interaction) {
    if (!interaction.inGuild()) {
      return interaction.reply({
        content: '❌ Este comando só pode ser usado em um servidor.',
        ephemeral: true
      });
    }

    if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({
        content: '❌ Apenas administradores podem acessar o painel.',
        ephemeral: true
      });
    }

    return enviarPainel(interaction);
  },

  async executePrefix(message) {
    if (!message.guild) {
      return message.reply('❌ Este comando só pode ser usado em um servidor.');
    }

    if (!message.member?.permissions?.has(PermissionFlagsBits.Administrator)) {
      return message.reply('❌ Apenas administradores podem acessar o painel.');
    }

    return enviarPainel(message);
  },

  async execute(message) {
    return this.executePrefix(message);
  }
};

async function enviarPainel(context) {
  const guild = context.guild;
  const usuario = context.user || context.author;
  const baseUrl = PANEL_URL.replace(/\/$/, '');
  const painelUrl = `${baseUrl}/admin/${encodeURIComponent(guild.id)}`;

  const embed = new EmbedBuilder()
    .setTitle('✦ AETERNUS • PAINEL')
    .setDescription([
      `Servidor: **${guild.name}**`,
      '',
      '⚙️ **Central de administração**',
      '',
      'Configure os módulos do Aeternus para este servidor.',
      '',
      '• 🎁 Daily',
      '• 🏅 Cargos por mensagens',
      '• 🛒 Loja',
      '• 🛡️ Moderação',
      '• 📋 Outros módulos',
      '',
      'Clique no botão abaixo para abrir o painel web.'
    ].join('\n'))
    .setColor('#7c3aed')
    .setThumbnail(guild.iconURL({ dynamic: true }) || null)
    .setFooter({
      text: `Solicitado por ${usuario.tag}`,
      iconURL: usuario.displayAvatarURL()
    })
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setLabel('Abrir painel web')
      .setEmoji('⚙️')
      .setStyle(ButtonStyle.Link)
      .setURL(painelUrl)
  );

  return context.reply({
    embeds: [embed],
    components: [row]
  });
}
