const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags
} = require('discord.js');
const daily = require('../utils/daily');
const eter = require('../utils/eter');

// O Discord não renderiza SVG de forma consistente na galeria do Components V2.
// O wsrv converte os SVGs do repositório para PNG antes de entregá-los ao Discord.
const IMAGE_BASE = 'https://raw.githubusercontent.com/cavalcantealerrandro901-glitch/Aeternus-/main/public/images/';
function pngImage(path) {
  const source = encodeURIComponent(IMAGE_BASE + path);
  return `https://wsrv.nl/?url=${source}&output=png`;
}
const PARTNER_THANKS_IMAGE = pngImage('partner-thanks.svg');
const STREAK_IMAGES = Array.from({ length: 7 }, (_, i) => pngImage(`daily-streak-${i + 1}.svg`));

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
function buildComponents(user, st, result = null, already = false) {
  const streak = Math.max(1, result?.streak ?? (st?.claimed ? st.streak : st?.nextStreak ?? st?.streak ?? 1));
  const balance = result?.balance ?? st?.balance ?? eter.get(user.id);
  const description = result
    ? `Parabéns, <@${user.id}>! Sua recompensa diária foi creditada.`
    : already
      ? `Olá, <@${user.id}>! Você já resgatou sua recompensa de hoje.`
      : `Olá, <@${user.id}>! Resgate seu daily e continue sua sequência.`;

  const lines = [
    '# 🎁 AETERNUS • RECOMPENSA DIÁRIA',
    description,
    '',
    '**✨ Éter ganho**',
    result ? `**+${fmt(result.amount)} éter**` : 'Resgate para revelar sua recompensa.',
    '',
    `**🔥 Sequência:** ${streak} dia(s)`,
    `**💰 Saldo atual:** ${fmt(balance)} éter`
  ];

  if (result?.levelMultiplier && result.levelMultiplier !== 1) {
    lines.push('', `**⭐ Bônus de nível:** ×${Number(result.levelMultiplier).toFixed(2)}`);
  }
  if (result?.partner) {
    lines.push('', '**🤝 Bônus de parceria:** ×2 aplicado nesta recompensa!');
  } else if (!result && st?.partner && !already) {
    lines.push('', '**🤝 Servidor parceiro:** o bônus ×2 será aplicado à recompensa.');
  }

  lines.push(
    '',
    '**📅 Próximo resgate**',
    already ? 'Volte após a meia-noite de Brasília.' : 'Resgate uma vez por dia para manter sua sequência.'
  );

  const container = new ContainerBuilder()
    .setAccentColor(result ? 0x36d9ff : 0x2878ff)
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(lines.join('\n')))
    .addSeparatorComponents(new SeparatorBuilder())
    .addMediaGalleryComponents(
      new MediaGalleryBuilder().addItems(
        new MediaGalleryItemBuilder().setURL(PARTNER_THANKS_IMAGE),
        new MediaGalleryItemBuilder().setURL(STREAK_IMAGES[Math.min(streak, 7) - 1])
      )
    )
    .addActionRowComponents(row(Boolean(already || result)));

  return {
    flags: MessageFlags.IsComponentsV2,
    components: [container],
    allowedMentions: { users: [user.id] }
  };
}
async function run(user, guildId) {
  const st = daily.status(user.id, guildId);
  return buildComponents(user, st, null, st.claimed);
}
async function handleComponent(interaction) {
  if (interaction.customId !== 'daily:claim') return;
  const guildId = interaction.guild?.id;
  const st = daily.status(interaction.user.id, guildId);
  if (st.claimed) return interaction.update(buildComponents(interaction.user, st, null, true));
  const result = daily.claim(interaction.user.id, guildId);
  if (!result?.ok) {
    const again = daily.status(interaction.user.id, guildId);
    return interaction.update(buildComponents(interaction.user, again, null, true));
  }
  return interaction.update(buildComponents(interaction.user, result, result, false));
}
module.exports = {
  name: 'daily', aliases: ['diario'], description: 'Mostra e resgata a recompensa diária de éter',
  data: new (require('discord.js').SlashCommandBuilder)().setName('daily').setDescription('Mostra e resgata a recompensa diária de éter'),
  async execute(message) { return message.reply(await run(message.author, message.guild?.id)); },
  async executeSlash(interaction) { return interaction.reply(await run(interaction.user, interaction.guild?.id)); },
  handleComponent
};