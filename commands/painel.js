const { 
  SlashCommandBuilder, 
  EmbedBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  PermissionFlagsBits 
} = require('discord.js');

module.exports = {
  name: 'painel',
  aliases: ['suport', 'suporte', 'suport painel', 'painel suport'],
  description: 'Acessa o gerenciador do servidor',

  data: new SlashCommandBuilder()
    .setName('painel')
    .setDescription('Acessa o gerenciador do servidor')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async executeSlash(interaction) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ 
        content: '❌ Apenas administradores podem acessar o gerenciador.', 
        ephemeral: true 
      });
    }
    await renderHome(interaction, true);
  },

  async executePrefix(message) {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return message.reply('❌ Apenas administradores podem acessar o gerenciador.');
    }
    await renderHome(message, false);
  },

  async execute(message, args) {
    return this.executePrefix(message);
  }
};

async function renderHome(context, isSlash) {
  const guild = context.guild;
  const author = isSlash ? context.user : context.author;

  // Texto formatado para ocupar pelo menos 7 linhas no Discord
  const textoDescricao = [
    '👑 **Central de Suporte e Controle do Servidor**',
    'Seja bem-vindo ao sistema principal de gerenciamento do Aeternus.',
    'Este painel permite ajustar módulos, preferências e permissões locais.',
    'Todas as alterações efetuadas por este painel impactam o bot em tempo real.',
    'Utilize os controles abaixo para avançar na configuração da sua guilda.',
    'Garantimos salvamento automático de dados diretamente no banco MongoDB.',
    '⚠️ *Atenção: Apenas membros com cargo de Administrador possuem acesso.*'
  ].join('\n');

  const homeEmbed = new EmbedBuilder()
    .setTitle(`Gerenciador do servidor ${guild.name}`)
    .setDescription(textoDescricao)
    .setColor('#7c3aed')
    .setThumbnail(guild.iconURL({ dynamic: true }) || null)
    .setFooter({ text: `Solicitado por ${author.tag}`, iconURL: author.displayAvatarURL() })
    .setTimestamp();

  // Botão que leva direto para a etapa de confirmação
  const rowButton = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('go_to_confirm')
      .setLabel('Ir para Confirmação')
      .setEmoji('➡️')
      .setStyle(ButtonStyle.Primary)
  );

  const payload = { embeds: [homeEmbed], components: [rowButton] };
  const response = isSlash 
    ? await context.reply({ ...payload, fetchReply: true }) 
    : await context.reply(payload);

  const collector = response.createMessageComponentCollector({ time: 300000 });

  collector.on('collect', async (i) => {
    if (i.user.id !== author.id) {
      return i.reply({ content: '❌ Apenas quem abriu o gerenciador pode interagir.', ephemeral: true });
    }

    if (i.customId === 'go_to_confirm') {
      // Tela de Confirmação
      const confirmEmbed = new EmbedBuilder()
        .setTitle('⚠️ Confirmação do Gerenciador')
        .setDescription(
          `Você está prestes a entrar no modo de edição do servidor **${guild.name}**.\n\n` +
          'Deseja confirmar o acesso e carregar todos os controles de sistema?'
        )
        .setColor('#eab308')
        .setTimestamp();

      const confirmRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('confirm_yes')
          .setLabel('Confirmar e Abrir')
          .setEmoji('✅')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId('confirm_no')
          .setLabel('Cancelar')
          .setEmoji('✖️')
          .setStyle(ButtonStyle.Danger)
      );

      await i.update({ embeds: [confirmEmbed], components: [confirmRow] });
    } else if (i.customId === 'confirm_yes') {
      await i.update({ 
        content: '✅ **Acesso confirmado com sucesso!** (Próxima etapa do painel...)', 
        embeds: [], 
        components: [] 
      });
      collector.stop();
    } else if (i.customId === 'confirm_no') {
      await i.update({ 
        content: '❌ **Ação cancelada.**', 
        embeds: [], 
        components: [] 
      });
      collector.stop();
    }
  });
}
