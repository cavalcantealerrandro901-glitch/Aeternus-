const { EmbedBuilder, SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const daily = require('../utils/daily');
const eter = require('../utils/eter');

const IMAGE_BASE = 'https://raw.githubusercontent.com/cavalcantealerrandro901-glitch/Aeternus-/main/public/images/';
const PARTNER_THANKS_IMAGE = IMAGE_BASE + 'partner-thanks.svg';
const STREAK_IMAGES = Array.from({ length: 7 }, (_, i) => IMAGE_BASE + `daily-streak-${i + 1}.svg`);

function fmt(n) {
  if (typeof eter.formatPlain === 'function') return eter.formatPlain(n);
  return Number(n || 0).toLocaleString('pt-BR');
}
function row(disabled = false) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('daily:claim').setLabel('RESGATAR DAILY')
      .setEmoji('🎁').setStyle(ButtonStyle.Primary).setDisabled(disabled)
  );
}
function buildEmbed(user, st, result = null, already = false) {
  const streak = Math.max(1, result?.streak ?? (st?.claimed ? st.streak : st?.nextStreak ?? st?.streak ?? 1));
  const balance = result?.balance ?? st?.balance ?? eter.get(user.id);
  const embed = new EmbedBuilder()
    .setColor(result ? 0x36d9ff : 0x2878ff)
    .setAuthor({ name: 'AETERNUS • ECONOMY', iconURL: 'https://cdn.discordapp.com/embed/avatars/5.png' })
    .setTitle('🎁 Recompensa diária')
    .setDescription(result
      ? `Parabéns, <@${user.id}>! Sua recompensa diária foi creditada.`
      : already
        ? `Olá, <@${user.id}>! Você já resgatou sua recompensa de hoje.`
        : `Olá, <@${user.id}>! Resgate seu daily e continue sua sequência.`)
    .addFields(
      { name: '✨ Éter ganho', value: result ? `**+${fmt(result.amount)} éter**` : 'Resgate para revelar sua recompensa.', inline: true },
      { name: '🔥 Sequência', value: `**${streak} dia(s)**`, inline: true },
      { name: '💰 Saldo atual', value: `**${fmt(balance)} éter**`, inline: true }
    )
    .setImage(PARTNER_THANKS_IMAGE)
    .setThumbnail(STREAK_IMAGES[Math.min(streak, 7) - 1])
    .setFooter({ text: 'Obrigado aos servidores parceiros por fortalecerem a comunidade Aeternus.' })
    .setTimestamp();

  if (result?.levelMultiplier && result.levelMultiplier !== 1)
    embed.addFields({ name: '⭐ Bônus de nível', value: `×${Number(result.levelMultiplier).toFixed(2)}`, inline: true });
  if (result?.partner)
    embed.addFields({ name: '🤝 Bônus de parceria', value: '**×2 aplicado nesta recompensa!**', inline: true });
  else if (!result && st?.partner && !already)
    embed.addFields({ name: '🤝 Servidor parceiro', value: 'O bônus ×2 será aplicado à recompensa.', inline: true });

  embed.addFields({
    name: '📅 Próximo resgate',
    value: already ? 'Volte após a meia-noite de Brasília.' : 'Resgate uma vez por dia para manter sua sequência.'
  });
  return embed;
}
function render(user, st, result = null, already = false) {
  return { embeds: [buildEmbed(user, st, result, already)], components: [row(Boolean(already || result))] };
}
async function run(user, guildId) {
  const st = daily.status(user.id, guildId);
  return render(user, st, null, st.claimed);
}
async function handleComponent(interaction) {
  if (interaction.customId !== 'daily:claim') return;
  const guildId = interaction.guild?.id;
  const st = daily.status(interaction.user.id, guildId);
  if (st.claimed) return interaction.update(render(interaction.user, st, null, true));
  const result = daily.claim(interaction.user.id, guildId);
  if (!result?.ok) {
    const again = daily.status(interaction.user.id, guildId);
    return interaction.update(render(interaction.user, again, null, true));
  }
  return interaction.update(render(interaction.user, result, result, false));
}
module.exports = {
  name: 'daily', aliases: ['diario'], description: 'Mostra e resgata a recompensa diária de éter',
  data: new SlashCommandBuilder().setName('daily').setDescription('Mostra e resgata a recompensa diária de éter'),
  async execute(message) { return message.reply(await run(message.author, message.guild?.id)); },
  async executeSlash(interaction) { return interaction.reply(await run(interaction.user, interaction.guild?.id)); },
  handleComponent
};