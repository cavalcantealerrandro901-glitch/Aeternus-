const { 
  SlashCommandBuilder, 
  PermissionFlagsBits, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  ComponentType 
} = require('discord.js');

module.exports = {
  name: 'kick',
  aliases: ['expulsar', 'kickar'],
  description: 'Expulsa um membro do servidor',

  data: new SlashCommandBuilder()
    .setName('kick')
    .setNameLocalizations({
      'pt-BR': 'expulsar',
      'es-ES': 'expulsar',
      'en-US': 'kick'
    })
    .setDescription('Expulsa um membro do servidor')
    .setDescriptionLocalizations({
      'pt-BR': 'Expulsa um membro do servidor',
      'es-ES': 'Expulsa a un miembro del servidor',
      'en-US': 'Kicks a member from the server'
    })
    .addUserOption(option =>
      option.setName('usuario')
        .setNameLocalizations({
          'pt-BR': 'usuario',
          'es-ES': 'usuario',
          'en-US': 'user'
        })
        .setDescription('O usuário a ser expulso')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('motivo')
        .setNameLocalizations({
          'pt-BR': 'motivo',
          'es-ES': 'razon',
          'en-US': 'reason'
        })
        .setDescription('Motivo da expulsão')
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),

  async executeSlash(interaction) {
    const user = interaction.options.getUser('usuario') || interaction.options.getUser('user');
    const reason = interaction.options.getString('motivo') || interaction.options.getString('razon') || interaction.options.getString('reason') || 'Nenhum motivo informado.';
    
    await runKickProcess(interaction, user, reason, true);
  },

  async executePrefix(message, args, prefix = '!') {
    if (!message.member.permissions.has(PermissionFlagsBits.KickMembers)) {
      return message.reply('❌ Você não tem permissão para expulsar este membro. É necessário um cargo com permissão de expulsão.');
    }

    if (!args[0]) {
      return message.reply(`❌ Uso inválido! Utilize: \`${prefix}kick <@usuario> [motivo]\``);
    }

    const targetUser = message.mentions.users.first() || await message.client.users.fetch(args[0]).catch(() => null);
    
    if (!targetUser) {
      return message.reply('❌ Usuário não encontrado. Verifique se a pessoa realmente está no servidor.');
    }

    const reason = args.slice(1).join(' ') || 'Nenhum motivo informado.';
    await runKickProcess(message, targetUser, reason, false, prefix);
  }
};

async function runKickProcess(context, targetUser, reason, isSlash, prefix = '!') {
  const guild = context.guild;
  const author = isSlash ? context.user : context.author;
  const member = await guild.members.fetch(targetUser.id).catch(() => null);

  if (!member) {
    const msg = '❌ Usuário não encontrado. Verifique se a pessoa realmente está no servidor.';
    return isSlash ? context.reply({ content: msg, ephemeral: true }) : context.reply(msg);
  }

  if (isSlash && !context.member.permissions.has(PermissionFlagsBits.KickMembers)) {
    return context.reply({ content: '❌ Você não tem permissão para expulsar este membro. É necessário um cargo com permissão de expulsão.', ephemeral: true });
  }

  if (!member.kickable) {
    const msg = '❌ Não consigo expulsar este usuário. O cargo dele é igual ou superior ao meu.';
    return isSlash ? context.reply({ content: msg, ephemeral: true }) : context.reply(msg);
  }

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('confirm_kick')
      .setLabel('Aceitar expulsão')
      .setEmoji('✅')
      .setStyle(ButtonStyle.Danger)
  );

  const promptContent = `😳 Nossa, você <@${author.id}> vai expulsar <@${targetUser.id}> mesmo? Uh... Sendo assim, clique no botão ✅aceitar expulsão, você tem 6 minutos para decidir.`;

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
      return i.reply({ content: '❌ Apenas quem executou o comando pode interagir.', ephemeral: true });
    }

    try {
      if (i.customId === 'confirm_kick') {
        await member.kick(reason);
        await i.update({
          content: `👢 O usuário <@${targetUser.id}> foi expulso do servidor para sempre, mas quem manda quebrar as regras né!!.`,
          components: []
        });
      }
      collector.stop('handled');
    } catch (err) {
      console.error(err);
      await i.reply({ content: '❌ Ocorreu um erro interno ao tentar expulsar o membro.', ephemeral: true });
    }
  });

  collector.on('end', (collected, reasonEnd) => {
    if (reasonEnd === 'time') {
      const timeoutMsg = '⏱️ O tempo de 6 minutos esgotou e a expulsão foi cancelada automaticamente.';
      if (isSlash) {
        context.editReply({ content: timeoutMsg, components: [] }).catch(() => {});
      } else {
        response.edit({ content: timeoutMsg, components: [] }).catch(() => {});
      }
    }
  });
}
