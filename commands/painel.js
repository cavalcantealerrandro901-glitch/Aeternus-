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

const MANAGE_PERMISSIONS =
  PermissionFlagsBits.Administrator | PermissionFlagsBits.ManageGuild;

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
    'gerenciamento'
  ],

  description: 'Acessa o painel de administração do servidor',

  data: new SlashCommandBuilder()
    .setName('painel')
    .setDescription('Acessa o painel de administração do servidor')
    .setDefaultMemberPermissions(MANAGE_PERMISSIONS),

  async executeSlash(interaction) {
    if (!interaction.inGuild()) {
      return interaction.reply({
        content: '❌ O painel só pode ser acessado dentro de um servidor.',
        ephemeral: true
      });
    }

    if (!interaction.memberPermissions?.has(MANAGE_PERMISSIONS)) {
      return interaction.reply({
        content: '❌ Você precisa ter **Administrador** ou **Gerenciar Servidor** para acessar o painel.',
        ephemeral: true
      });
    }

    return enviarPainel(interaction, true);
  },

  async executePrefix(message) {
    if (!message.guild) {
      return message.reply(
        '❌ O painel só pode ser acessado dentro de um servidor.'
      );
    }

    if (!message.member?.permissions?.has(MANAGE_PERMISSIONS)) {
      return message.reply(
        '❌ Você precisa ter **Administrador** ou **Gerenciar Servidor** para acessar o painel.'
      );
    }

    return enviarPainel(message, false);
  },

  async execute(message) {
    return this.executePrefix(message);
  }
};

async function enviarPainel(context, isSlash) {
  const guild = context.guild;
  const usuario = context.user || context.author;

  const baseUrl = PANEL_URL.replace(/\/$/, '');
  const painelUrl =
    `${baseUrl}/admin/${encodeURIComponent(guild.id)}`;

  const embed = new EmbedBuilder()
    .setColor('#6D28D9')
    .setAuthor({
      name: 'AETERNUS • Central de Administração',
      iconURL: guild.client.user.displayAvatarURL()
    })
    .setTitle('⚙️ Painel do servidor')
    .setDescription([
      `Gerencie **${guild.name}** de forma rápida e centralizada.`,
      '',
      'O painel permite configurar os principais recursos do Aeternus, com alterações específicas para este servidor.',
      '',
      '**Módulos disponíveis**',
      '› 🎁 Economia e Daily',
      '› 🏅 Cargos por atividade',
      '› 🛒 Loja',
      '› 🛡️ Moderação',
      '› 📋 Configurações do servidor',
      '',
      '🔐 **Acesso protegido**',
      'Somente membros com **Administrador** ou **Gerenciar Servidor** podem administrar o servidor.'
    ].join('\n'))
    .setThumbnail(guild.iconURL({ size: 256 }) || guild.client.user.displayAvatarURL())
    .setFooter({
      text: `Aeternus • ${isSlash ? 'Painel administrativo' : 'Solicitado por ' + usuario.username}`,
      iconURL: guild.client.user.displayAvatarURL()
    })
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setLabel('Abrir painel')
      .setEmoji('⚙️')
      .setStyle(ButtonStyle.Link)
      .setURL(painelUrl)
  );

  return context.reply({
    embeds: [embed],
    components: [row]
  });
}
