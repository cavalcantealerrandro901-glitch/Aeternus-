const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const player = require('../utils/player');
const store = require('../utils/store');

module.exports = {
  name: 'anunciar',
  aliases: ['broadcast', 'avisar'],
  description: 'Admin: anuncia no PV o retorno do bot e avisos',

  data: new SlashCommandBuilder()
    .setName('anunciar')
    .setNameLocalizations({
      'pt-BR': 'anunciar',
      'en-US': 'announce'
    })
    .setDescription('Admin: anuncia no PV o retorno do bot e avisos')
    .setDescriptionLocalizations({
      'pt-BR': 'Admin: anuncia no PV o retorno do bot e avisos',
      'en-US': 'Admin: announces bot back online via DM'
    })
    .addStringOption(option =>
      option.setName('mensagem')
        .setNameLocalizations({ 'pt-BR': 'mensagem', 'en-US': 'message' })
        .setDescription('Mensagem customizada para o anúncio (opcional)')
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async executeSlash(interaction) {
    if (!interaction.member?.permissions?.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ content: '❌ Apenas administradores podem usar este comando.', ephemeral: true });
    }

    const custom = interaction.options.getString('mensagem')?.trim();
    await runBroadcastProcess(interaction, custom, true);
  },

  async executePrefix(message, args) {
    if (!message.member?.permissions?.has(PermissionFlagsBits.Administrator)) {
      return message.reply('❌ Apenas administradores.');
    }

    const custom = args.join(' ').trim();
    await runBroadcastProcess(message, custom, false);
  },

  async execute(message, args) {
    return this.executePrefix(message, args);
  }
};

async function runBroadcastProcess(context, customText, isSlash) {
  const embed = new EmbedBuilder()
    .setColor(0xa78bfa)
    .setTitle('🟢 Aeternus — Online novamente')
    .setDescription(
      customText ||
        [
          'O Aeternus está online de novo.',
          '',
          'A migração de hospedagem foi concluída e o bot já está funcionando normalmente.',
          '',
          'Você pode voltar a usar os comandos, perfil, arena e o restante do sistema como antes.',
          '',
          'Mas infelizmente aqueles que tinham éter no comando banco não pode resgatar, por que ele não estava sendo salvo no banco de éter.',
          '',
          'Obrigado pela paciência.',
          '',
          '— Equipe Aeternus'
        ].join('\n')
    )
    .setFooter({ text: 'Mensagem no privado · Aeternus' })
    .setTimestamp();

  const all = player && typeof player.all === 'function' ? player.all() : {};
  const ids = Object.keys(all).filter((id) => player.has && player.has(id));

  const startContent = `Enviando anúncio de retorno para **${ids.length}** jogadores...`;
  
  let statusMsg;
  if (isSlash) {
    await context.reply({ content: startContent, fetchReply: true });
  } else {
    statusMsg = await context.reply(startContent);
  }

  let ok = 0;
  let fail = 0;
  const client = context.client;

  for (const id of ids) {
    try {
      const user = await client.users.fetch(id).catch(() => null);
      if (!user) {
        fail++;
        continue;
      }

      const sent = await user.send({ embeds: [embed] }).catch(() => null);

      if (sent) {
        ok++;
      } else {
        fail++;
      }
    } catch (_) {
      fail++;
    }

    await new Promise((r) => setTimeout(r, 350));
  }

  if (store && typeof store.save === 'function') {
    store.save('last_broadcast.json', {
      at: Date.now(),
      ok,
      fail,
      total: ids.length,
      type: 'online_novamente'
    });
  }

  const finalContent = `✅ PV enviado: **${ok}** · DMs fechadas/ignoradas: **${fail}** · Total: **${ids.length}**`;

  if (isSlash) {
    await context.editReply(finalContent);
  } else {
    await statusMsg.edit(finalContent);
  }
}
