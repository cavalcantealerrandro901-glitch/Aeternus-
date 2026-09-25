const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType
} = require('discord.js');

module.exports = {
  name: 'ban',
  aliases: ['banir', 'banear', 'punir'],
  description: 'Bane um membro do servidor',

  data: new SlashCommandBuilder()
    .setName('banir')
    .setNameLocalizations({
      'pt-BR': 'banir',
      'es-ES': 'banear',
      'en-US': 'ban'
    })
    .setDescription('Bane um membro do servidor')
    .setDescriptionLocalizations({
      'pt-BR': 'Bane um membro do servidor',
      'es-ES': 'Banea a un miembro del servidor',
      'en-US': 'Bans a member from the server'
    })
    .addUserOption(option =>
      option.setName('usuario')
        .setNameLocalizations({
          'pt-BR': 'usuario',
          'es-ES': 'usuario',
          'en-US': 'user'
        })
        .setDescription('O usuário a ser banido')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('motivo')
        .setNameLocalizations({
          'pt-BR': 'motivo',
          'es-ES': 'razon',
          'en-US': 'reason'
        })
        .setDescription('Motivo do banimento')
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

  async executeSlash(interaction) {
    const user = interaction.options.getUser('usuario') || interaction.options.getUser('user');
    const reason = interaction.options.getString('motivo') || interaction.options.getString('razon') || interaction.options.getString('reason') || 'Nenhum motivo informado.';

    await runBanProcess(interaction, user, reason, true);
  },

  async executePrefix(message, args, prefix = '!') {
    if (!message.member.permissions.has(PermissionFlagsBits.BanMembers)) {
      return message.reply('❌ você não tem permissão para banir esse membro. Você precisa de um cargo de banimento para conseguir.');
    }

    if (!args[0]) {
      return message.reply(`❌ Comando invalido, use ${prefix}ban <usuario> motivo.`);
    }

    const targetUser = message.mentions.users.first() || await message.client.users.fetch(args[0]).catch(() => null);

    if (!targetUser) {
      return message.reply('❌ Usuário não encontrado. Verifique se ele esta no servidor.');
    }

    const reason = args.slice(1).join(' ') || 'Nenhum motivo informado.';
    await runBanProcess(message, targetUser, reason, false, prefix);
  }
};

async function runBanProcess(context, targetUser, reason, isSlash, prefix = '!') {
  const guild = context.guild;
  const author = isSlash ? context.user : context.author;
  const member = await guild.members.fetch(targetUser.id).catch(() => null);

  if (!member) {
    const msg = '❌ Usuário não encontrado. Verifique se ele esta no servidor.';
    return isSlash ? context.reply({ content: msg, ephemeral: true }) : context.reply(msg);
  }

  if (isSlash && !context.member.permissions.has(PermissionFlagsBits.BanMembers)) {
    return context.reply({ content: '❌ você não tem permissão para banir esse membro. Você precisa de um cargo de banimento para conseguir.', ephemeral: true });
  }

  if (!member.bannable) {
    const msg = '❌ Infelizmente eu não consigo banir esse membro. Ele tem o cargo acima ou igual ao meu.';
    return isSlash ? context.reply({ content: msg, ephemeral: true }) : context.reply(msg);
  }

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('confirm_ban')
      .setLabel('Aceitar')
      .setEmoji('✅')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId('silent_ban')
      .setLabel('Banimento Silencioso')
      .setEmoji('🤫')
      .setStyle(ButtonStyle.Secondary)
  );

  const promptContent = `<@${author.id}> você esta tem certeza que quer banir <@${targetUser.id}> do servidor? Basta clicar no botão de ✅aceitar ou no 🤫banimento silencioso.\nVocê tem 6 minutos para decidir.`;

  let response;
  if (isSlash) {
    response = await context.reply({ content: promptContent, components: [row], fetchReply: true });
  } else {
    response = await context.reply({ content: promptContent, components: [row] });
  }

  const collector = response.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 360000
  });

  collector.on('collect', async (i) => {
    if (i.user.id !== author.id) {
      return i.reply({ content: '❌ Apenas quem solicitou o banimento pode usar estes botões.', ephemeral: true });
    }

    try {
      if (i.customId === 'confirm_ban') {
        await guild.members.ban(targetUser.id, { reason });
        await i.update({
          content: `👮‍♂️ o usuário <@${targetUser.id}> foi banido. Ninguém mandou não cumprir as regras do servidor. Agora se deu mau.`,
          components: []
        });
      } else if (i.customId === 'silent_ban') {
        await guild.members.ban(targetUser.id, { reason, deleteMessageSeconds: 604800 });
        await i.update({
          content: `Banimento silêncio. O usuário <@${targetUser.id}> levou um banimento silêncio, ninguém mais se lembra dele.`,
          components: []
        });
      }
      collector.stop('handled');
    } catch (err) {
      console.error(err);
      await i.reply({ content: '❌ Ocorreu um erro ao tentar banir o membro.', ephemeral: true });
    }
  });

  collector.on('end', (collected, reasonEnd) => {
    if (reasonEnd === 'time') {
      const timeoutMsg = '⏱️ O tempo de 6 minutos esgotou e o banimento foi cancelado.';
      if (isSlash) {
        context.editReply({ content: timeoutMsg, components: [] }).catch(() => {});
      } else {
        response.edit({ content: timeoutMsg, components: [] }).catch(() => {});
      }
    }
  });
}
