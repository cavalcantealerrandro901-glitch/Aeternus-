const { EmbedBuilder, AttachmentBuilder } = require('discord.js');

const VERDICTS = {
    divine: {
        min: 95,
        title: 'AURA DIVINA',
        line: 'Essa pessoa não tem aura… ela **é** a aura.',
        color: 0xfbbf24,
        glow: '#fbbf24',
        bg: '#1a1408'
    },
    high: {
        min: 75,
        title: 'AURA FORTE',
        line: 'Tem aura. O ambiente muda quando essa pessoa entra.',
        color: 0xa78bfa,
        glow: '#a78bfa',
        bg: '#12081f'
    },
    mid: {
        min: 45,
        title: 'AURA ESTÁVEL',
        line: 'Tem um pouco de aura. Nada absurdo, mas existe.',
        color: 0x38bdf8,
        glow: '#38bdf8',
        bg: '#0a1520'
    },
    low: {
        min: 20,
        title: 'AURA FRACA',
        line: 'Quase não tem aura. Tipo Wi-Fi no limiar.',
        color: 0x94a3b8,
        glow: '#64748b',
        bg: '#0f1419'
    },
    none: {
        min: 0,
        title: 'SEM AURA',
        line: 'Não tem aura. O sensor voltou zerado.',
        color: 0xf43f5e,
        glow: '#f43f5e',
        bg: '#1a0a0f'
    }
};

const PHRASES_YES = [
    'O scanner detectou presença magnética absurda.',
    'Até o bot sentiu o peso dessa entrada.',
    'Aura confirmada. Não é opinião — é leitura.',
    'O ar ficou mais caro depois dessa análise.',
    'Nível de presença acima da média global.'
];

const PHRASES_NO = [
    'O scanner ficou em silêncio constrangedor.',
    'Nada. Zero. O vazio respondeu primeiro.',
    'A leitura voltou como página em branco.',
    'Se tinha aura, ela saiu pra comprar pão.',
    'Resultado oficial: presença não detectada.'
];

function pickVerdict(score) {
    if (score >= 95) return VERDICTS.divine;
    if (score >= 75) return VERDICTS.high;
    if (score >= 45) return VERDICTS.mid;
    if (score >= 20) return VERDICTS.low;
    return VERDICTS.none;
}

/** Arte gerada pelo próprio bot (SVG → anexo) */
function buildAuraArt({ displayName, score, verdict, hasAura }) {
    const safe = String(displayName || 'Usuário')
        .replace(/[<>&'"]/g, '')
        .slice(0, 22);
    const barW = Math.max(8, Math.round((score / 100) * 520));
    const stamp = hasAura ? 'AURA DETECTADA' : 'SEM SINAL';
    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${verdict.bg}"/>
      <stop offset="100%" stop-color="#000000"/>
    </linearGradient>
    <radialGradient id="r" cx="50%" cy="40%" r="60%">
      <stop offset="0%" stop-color="${verdict.glow}" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="${verdict.glow}" stop-opacity="0"/>
    </radialGradient>
    <filter id="soft"><feGaussianBlur stdDeviation="12"/></filter>
  </defs>
  <rect width="640" height="360" fill="url(#g)"/>
  <circle cx="320" cy="140" r="120" fill="url(#r)"/>
  <circle cx="320" cy="150" r="70" fill="none" stroke="${verdict.glow}" stroke-width="2" opacity="0.7"/>
  <circle cx="320" cy="150" r="48" fill="none" stroke="${verdict.glow}" stroke-width="1.5" opacity="0.4"/>
  <text x="320" y="158" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="28" font-weight="700" fill="${verdict.glow}">${score}%</text>
  <text x="320" y="48" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="14" letter-spacing="6" fill="#94a3b8">AETERNUS · AURA SCAN</text>
  <text x="320" y="230" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="26" font-weight="700" fill="#f8fafc">${verdict.title}</text>
  <text x="320" y="258" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="16" fill="#cbd5e1">${safe}</text>
  <rect x="60" y="290" width="520" height="16" rx="8" fill="#1e293b"/>
  <rect x="60" y="290" width="${barW}" height="16" rx="8" fill="${verdict.glow}"/>
  <text x="320" y="335" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="12" letter-spacing="4" fill="${verdict.glow}">${stamp}</text>
</svg>`;
    return Buffer.from(svg, 'utf8');
}

function rollAura(userId) {
    // leve viés estável por usuário + aleatório (não 100% igual sempre)
    const seed = [...String(userId)].reduce((a, c) => a + c.charCodeAt(0), 0);
    const base = (seed * 17 + Date.now() % 97) % 101;
    const jitter = Math.floor(Math.random() * 21) - 10;
    const score = Math.max(0, Math.min(100, base + jitter));
    const verdict = pickVerdict(score);
    const hasAura = score >= 45;
    return { score, verdict, hasAura };
}

module.exports = {
    name: 'aura',
    aliases: ['auracheck', 'temaura', 'aura?'],
    description: 'Diz se a pessoa tem aura (com arte gerada pelo bot)',

    async execute(message) {
        const target = message.mentions.users.first() || message.author;
        const { score, verdict, hasAura } = rollAura(target.id);

        const phrase = hasAura
            ? PHRASES_YES[Math.floor(Math.random() * PHRASES_YES.length)]
            : PHRASES_NO[Math.floor(Math.random() * PHRASES_NO.length)];

        const art = buildAuraArt({
            displayName: target.username,
            score,
            verdict,
            hasAura
        });

        const file = new AttachmentBuilder(art, { name: 'aura-scan.svg' });

        const embed = new EmbedBuilder()
            .setColor(verdict.color)
            .setAuthor({
                name: 'Aeternus · Scanner de Aura',
                iconURL: message.client.user.displayAvatarURL({ size: 64 })
            })
            .setTitle(hasAura ? '✨  Tem aura' : '💨  Não tem aura')
            .setDescription(
                [
                    `**Alvo:** ${target}`,
                    `**Leitura:** **${score}%**`,
                    `**Veredito:** ${verdict.title}`,
                    '',
                    verdict.line,
                    '',
                    `_${phrase}_`
                ].join('\n')
            )
            .setImage('attachment://aura-scan.svg')
            .setThumbnail(target.displayAvatarURL({ size: 128 }))
            .setFooter({ text: 'Arte gerada pelo próprio bot · O.aura [@user]' })
            .setTimestamp();

        await message.reply({ embeds: [embed], files: [file] });
    }
};
