const { EmbedBuilder, AttachmentBuilder } = require('discord.js');

const VERDICTS = {
    divine: {
        min: 95,
        title: 'AURA DIVINA',
        line: 'Essa pessoa não tem aura… ela **é** a aura.',
        color: 0xfbbf24,
        glow: 'golden luminous',
        tags: 'golden aura, divine light, celestial glow, epic portrait'
    },
    high: {
        min: 75,
        title: 'AURA FORTE',
        line: 'Tem aura. O ambiente muda quando essa pessoa entra.',
        color: 0xa78bfa,
        glow: 'violet powerful',
        tags: 'purple energy aura, mystical glow, powerful presence, cinematic'
    },
    mid: {
        min: 45,
        title: 'AURA ESTÁVEL',
        line: 'Tem um pouco de aura. Nada absurdo, mas existe.',
        color: 0x38bdf8,
        glow: 'soft blue',
        tags: 'soft blue aura, calm energy, subtle glow, aesthetic'
    },
    low: {
        min: 20,
        title: 'AURA FRACA',
        line: 'Quase não tem aura. Tipo Wi-Fi no limiar.',
        color: 0x94a3b8,
        glow: 'faint gray',
        tags: 'faint gray haze, weak energy, dim light, moody'
    },
    none: {
        min: 0,
        title: 'SEM AURA',
        line: 'Não tem aura. O sensor voltou zerado.',
        color: 0xf43f5e,
        glow: 'empty void',
        tags: 'empty void, no aura, blank silhouette, dark minimal'
    }
};

const PHRASES_YES = [
    'O scanner detectou presença magnética absurda.',
    'Até o bot sentiu o peso dessa entrada.',
    'Aura confirmada. Não é opinião — é leitura.',
    'O ar ficou mais caro depois dessa análise.',
    'Nível de presença acima da média global.',
    'As partículas ao redor bateram continência.',
    'Isso não é sorte. É campo de força social.',
    'O corredor ficou em câmera lenta só por causa dessa pessoa.',
    'Leitura limpa. Sinal alto. Interferência zero.',
    'Tem gente que entra na sala. Essa pessoa **abre** a sala.',
    'O algoritmo quase pediu autógrafo.',
    'Aura de protagonista em temporada final.',
    'Se aura fosse Wi-Fi, aqui seria fibra óptica.',
    'Detectamos brilho residual até depois que a pessoa saiu.',
    'Status: lendário. Reputação: silenciosa, mas pesada.'
];

const PHRASES_NO = [
    'O scanner ficou em silêncio constrangedor.',
    'Nada. Zero. O vazio respondeu primeiro.',
    'A leitura voltou como página em branco.',
    'Se tinha aura, ela saiu pra comprar pão.',
    'Resultado oficial: presença não detectada.',
    'O sensor pediu desculpas e desligou.',
    'Campo energético: erro 404.',
    'Nem eco. Nem sombra. Nem plot twist.',
    'A aura deve ter perdido o ônibus.',
    'Calibramos três vezes. Continua no zero.',
    'Isso aqui é anti-aura com diploma.',
    'O universo deu de ombros.',
    'Presença registrada… e imediatamente esquecida.',
    'Se fosse um jogo, o nick estaria cinza.',
    'Leitura concluída: modo fantasma sem os efeitos especiais.'
];

const PHRASES_DIVINE = [
    'O scanner overclockou de respeito.',
    'Isso passou de aura e foi pro território de mito.',
    'A leitura quase pediu permissão pra continuar.',
    'Nível: proibido em servidores comuns.'
];

function pickVerdict(score) {
    if (score >= 95) return VERDICTS.divine;
    if (score >= 75) return VERDICTS.high;
    if (score >= 45) return VERDICTS.mid;
    if (score >= 20) return VERDICTS.low;
    return VERDICTS.none;
}

function rollAura(userId) {
    const seed = [...String(userId)].reduce((a, c) => a + c.charCodeAt(0), 0);
    const base = (seed * 17 + Date.now() % 97) % 101;
    const jitter = Math.floor(Math.random() * 21) - 10;
    const score = Math.max(0, Math.min(100, base + jitter));
    const verdict = pickVerdict(score);
    const hasAura = score >= 45;
    return { score, verdict, hasAura, seed: (seed + Date.now()) % 999999 };
}

/** API grátis — Pollinations (sem chave) */
function pollinationsUrl({ username, verdict, score, seed }) {
    const prompt = [
        'cinematic digital art',
        verdict.tags,
        `${verdict.glow} aura around a mysterious silhouette`,
        `aura power level ${score} percent`,
        'dark aesthetic background, neon rim light',
        'high quality, dramatic lighting, no text, no watermark'
    ].join(', ');

    const q = encodeURIComponent(prompt);
    return `https://image.pollinations.ai/prompt/${q}?width=768&height=512&nologo=true&seed=${seed}&model=flux`;
}

/** GIF estético aleatório (Tenor public embed-style fallback via pollinations short anim feel = static ok) */
async function tryFetchImageBuffer(url) {
    try {
        const res = await fetch(url, {
            headers: { 'User-Agent': 'AeternusBot/2.0' },
            signal: AbortSignal.timeout(12000)
        });
        if (!res.ok) return null;
        const buf = Buffer.from(await res.arrayBuffer());
        if (buf.length < 1000) return null;
        return buf;
    } catch {
        return null;
    }
}

module.exports = {
    name: 'aura',
    aliases: ['auracheck', 'temaura', 'aura?'],
    description: 'Diz se a pessoa tem aura + imagem gerada',

    async execute(message) {
        const target = message.mentions.users.first() || message.author;
        const { score, verdict, hasAura, seed } = rollAura(target.id);

        let phrasePool = hasAura ? PHRASES_YES : PHRASES_NO;
        if (score >= 95) phrasePool = [...PHRASES_DIVINE, ...PHRASES_YES];
        const phrase = phrasePool[Math.floor(Math.random() * phrasePool.length)];

        const imageUrl = pollinationsUrl({
            username: target.username,
            verdict,
            score,
            seed
        });

        const waiting = await message.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(verdict.color)
                    .setDescription(`🔮 Escaneando a aura de **${target.username}**…`)
            ]
        });

        // tenta baixar a arte gerada; se falhar, usa URL direta no embed
        const buf = await tryFetchImageBuffer(imageUrl);
        const files = [];
        let embedImage = imageUrl;

        if (buf) {
            files.push(new AttachmentBuilder(buf, { name: 'aura.png' }));
            embedImage = 'attachment://aura.png';
        }

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
            .setImage(embedImage)
            .setThumbnail(target.displayAvatarURL({ size: 128 }))
            .setFooter({ text: 'Imagem gerada na hora · Pollinations · O.aura [@user]' })
            .setTimestamp();

        await waiting.edit({ embeds: [embed], files });
    }
};
