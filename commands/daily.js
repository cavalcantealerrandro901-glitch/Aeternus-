const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const daily = require('../utils/daily');
const eter = require('../utils/eter');
const DAILY_IMAGE = 'https://images.weserv.nl/?url=raw.githubusercontent.com/cavalcantealerrandro901-glitch/Aeternus-/main/public/images/daily-reward.svg&output=png';

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
function render(user, st, result = null, already = false) {
  const streak = result?.streak ?? (st?.claimed ? st.streak : st?.nextStreak ?? st?.streak ?? 0);
  const balance = result?.balance ?? st?.balance ?? eter.get(user.id);
  const lines = [
    DAILY_IMAGE, '',
    '✦ **AETERNUS • RECOMPENSA DIÁRIA**',
    result ? `🎉 Você recebeu **✨ ${fmt(result.amount)} éter**!`
      : already ? '⏳ Você já resgatou sua recompensa de hoje.'
      : '🎁 Clique no botão abaixo para resgatar sua recompensa diária.',
    `🔥 **Sequência:** ${streak} dia(s)`,
    `✨ **Saldo:** ${fmt(balance)} éter`
  ];
  if (result?.levelMultiplier && result.levelMultiplier !== 1)
    lines.push(`⭐ Bônus de nível: ×${Number(result.levelMultiplier).toFixed(2)}`);
  if (result?.partner) lines.push('🤝 Bônus de servidor parceiro ×2 aplicado!');
  else if (!result && st?.partner && !already) lines.push('🤝 Este servidor oferece bônus de parceria ×2.');
  lines.push('', 'Resgate novamente amanhã, após a meia-noite de Brasília, para manter a sequência.');
  return { content: lines.join('\n'), components: [row(Boolean(already || result))] };
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