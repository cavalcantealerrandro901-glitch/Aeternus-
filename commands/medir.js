const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');

/** Níveis de aura (do pior ao melhor) */
const TIERS = [
    { min: 0, max: 9, name: 'Aura Selada', emoji: '🕳️', color: 0x1f2937, phrases: [
        'O universo pediu silêncio… e você atendeu demais.',
        'Sua presença é quase um eco invertido.',
        'Hoje a aura está em modo economia de energia.'
    ]},
    { min: 10, max: 24, name: 'Aura Fraca', emoji: '🌫️', color: 0x6b7280, phrases: [
        'Tem potencial, mas ainda está aquecendo os motores.',
        'Uma brisa leve — nada de tempestade ainda.',
        'Você existe. Isso já é um começo.'
    ]},
    { min: 25, max: 39, name: 'Aura Comum', emoji: '✨', color: 0x94a3b8, phrases: [
        'Estável, equilibrada, sem drama cósmico.',
        'Aura de quem paga as contas e ainda tem estilo.',
        'Nada demais… e nada de menos.'
    ]},
    { min: 40, max: 54, name: 'Aura Brilhante', emoji: '🌟', color: 0x38bdf8, phrases: [
        'Dá pra sentir o brilho de longe.',
        'As pessoas notam quando você entra na call.',
        'Sua vibe está em alta frequência hoje.'
    ]},
    { min: 55, max: 69, name: 'Aura Radiante', emoji: '🔮', color: 0xa78bfa, phrases: [
        'Energia de protagonista em arco de evolução.',
        'O chat fica mais interessante quando você aparece.',
        'Aura de quem carrega o servidor nas costas (com estilo).'
    ]},
    { min: 70, max: 84, name: 'Aura Lendária', emoji: '👑', color: 0xfbbf24, phrases: [
        'Rara. Intensa. Impossível de ignorar.',
        'Até o Wi-Fi parece mais estável perto de você.',
        'O destino deu um join na sua call.'
    ]},
    { min: 85, max: 94, name: 'Aura Mítica', emoji: '☄️', color: 0xf472b6, phrases: [
        'Nível de anime final season.',
        'Sua aura pediu DLC e veio com efeitos especiais.',
        'Os deuses do Discord tomaram nota.'
    ]},
    { min: 95, max: 100, name: 'Aura Divina', emoji: '🌌', color: 0x22d3ee, phrases: [
        'Além do mensurável. Quase ilegal de tão alta.',
        'O servidor inteiro ganhou +10 de carisma por associação.',
        'Você não tem aura — você é o evento.'
    ]}
];

function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function rollAura(seedStr) {
    let h = 0;
    const day = new Date().toISOString().slice(0, 10);
    const s = `${seedStr}:${day}`;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    const noise = Math.floor(Math.random() * 7) - 3;
    let value = (h % 101) + noise;
    if (value < 0) value = 0;
    if (value > 100) value = 100;
    return value;
}

function tierFor(value) {
    return TIERS.find((t) => value >= t.min && value <= t.max) || TIERS[0];
}

function bar(value) {
    const filled = Math.round(value / 10);
    const empty = 10 - filled;
    return '▰'.repeat(filled) + '▱'.repeat(empty);
}

function buildEmbed(target, requester) {
    const value = rollAura(target.id);
    const tier = tierFor(value);
    const phrase = pick(tier.phrases);
    const self = target.id === requester.id;

    return new EmbedBuilder()
        .setColor(tier.color)
        .setAuthor({
            name: self ? 'Medição da sua aura' : `Medição de aura · ${target.username}`,
            iconURL: target.displayAvatarURL?.({ size: 64 }) || undefined
        })
        .setThumbnail(target.displayAvatarURL?.({ size: 256 }) || null)
        .setDescription(
            `${tier.emoji} **${tier.name}**\n` +
                `\`${bar(value)}\` **${value}/100**\n\n` +
                `_${phrase}_`
        )
        .addFields(
            { name: 'Alvo', value: `${target}`, inline: true },
            { name: 'Medido por', value: `${requester}`, inline: true }
        )
        .setFooter({ text: 'Aeternus · o resultado muda um pouco a cada dia' })
        .setTimestamp();
}

async function resolveTarget(guild, user, mentionOrId) {
    if (!mentionOrId) return user;
    const id = String(mentionOrId).replace(/[<@!>]/g, '');
    if (!/^\d{17,20}$/.test(id)) return user;
    try {
        if (guild) {
            const m = await guild.members.fetch(id).catch(() => null);
            if (m) return m.user;
        }
        return await user.client.users.fetch(id);
    } catch {
        return user;
    }
}

module.exports = {
    name: 'medir',
    aliases: ['aura', 'mediraura', 'aura-check'],
    description: 'Mede a aura de um usuário (ou a sua)',
    category: 'diversao',

    data: new SlashCommandBuilder()
        .setName('medir')
        .setDescription('Mede a aura de um usuário ou a sua')
        .addUserOption((o) =>
            o
                .setName('usuario')
                .setDescription('Quem medir (vazio = você)')
                .setRequired(false)
        ),

    async execute(message, args) {
        const target =
            message.mentions.users.first() ||
            (args[0]
                ? await resolveTarget(message.guild, message.author, args[0])
                : message.author);
        const emb = buildEmbed(target, message.author);
        return message.reply({ embeds: [emb] });
    },

    async executeSlash(i) {
        const target = i.options.getUser('usuario') || i.user;
        const emb = buildEmbed(target, i.user);
        return i.reply({ embeds: [emb] });
    }
};
