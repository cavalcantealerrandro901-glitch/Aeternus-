const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const eter = require('../utils/eter');
const store = require('../utils/store');

const CD_MS = 5 * 60 * 1000;

/**
 * Tabela de drops estilo Minecraft (peso → chance relativa).
 * rewardMin/Max em éter.
 */
const ORES = [
    {
        id: 'nada',
        name: 'Cascalho',
        emoji: '🪨',
        weight: 12,
        min: 0,
        max: 0,
        color: 0x6b7280,
        lines: [
            'Você picou... e só saiu **cascalho**.',
            'A veia era falsa. Nada de valor desta vez.',
            'Só eco e pedra solta. Tente mais fundo depois.'
        ]
    },
    {
        id: 'carvao',
        name: 'Carvão',
        emoji: '⬛',
        weight: 22,
        min: 8_000,
        max: 25_000,
        color: 0x374151,
        lines: [
            'Uma veia de **carvão**! Bom para o forno.',
            'Carvão puro. A base de todo minerador.',
            'Você encheu o inventário de carvão.'
        ]
    },
    {
        id: 'cobre',
        name: 'Cobre',
        emoji: '🟠',
        weight: 16,
        min: 12_000,
        max: 35_000,
        color: 0xea580c,
        lines: [
            'Minério de **cobre** brilhando na parede.',
            'Cobre o suficiente para umas lanternas.',
            'A picareta cantou em cima do cobre.'
        ]
    },
    {
        id: 'ferro',
        name: 'Ferro',
        emoji: '⚙️',
        weight: 18,
        min: 20_000,
        max: 55_000,
        color: 0x9ca3af,
        lines: [
            'Veia de **ferro**! Isso sim é progresso.',
            'Ferro bruto saindo da pedra.',
            'Com esse ferro dá pra reforjar a picareta.'
        ]
    },
    {
        id: 'ouro',
        name: 'Ouro',
        emoji: '🟨',
        weight: 12,
        min: 40_000,
        max: 90_000,
        color: 0xfbbf24,
        lines: [
            '**Ouro**! O brilho iluminou a caverna.',
            'Você achou ouro nas profundezas.',
            'Pepitas de ouro caindo no inventário.'
        ]
    },
    {
        id: 'redstone',
        name: 'Redstone',
        emoji: '🔴',
        weight: 8,
        min: 35_000,
        max: 80_000,
        color: 0xdc2626,
        lines: [
            'Pó de **redstone** por todo lado.',
            'Redstone pura — engenharia subterrânea.',
            'O minério vermelho respondeu ao toque da picareta.'
        ]
    },
    {
        id: 'lapis',
        name: 'Lápis-lazúli',
        emoji: '🔵',
        weight: 7,
        min: 45_000,
        max: 100_000,
        color: 0x2563eb,
        lines: [
            '**Lápis-lazúli** reluzindo na pedra.',
            'Azul profundo — ótimo para encantamentos.',
            'Você minerou uma bela veia de lápis.'
        ]
    },
    {
        id: 'diamante',
        name: 'Diamante',
        emoji: '💎',
        weight: 4,
        min: 80_000,
        max: 180_000,
        color: 0x22d3ee,
        lines: [
            '**DIAMANTE!** O som da picareta nunca foi tão doce.',
            'Um diamante perfeito saiu da rocha.',
            'Brilho azul — você encontrou diamante.'
        ]
    },
    {
        id: 'esmeralda',
        name: 'Esmeralda',
        emoji: '💚',
        weight: 2,
        min: 120_000,
        max: 250_000,
        color: 0x22c55e,
        lines: [
            '**Esmeralda** rara nas profundezas!',
            'Os aldeões pagariam bem por essa esmeralda.',
            'Verde intenso — esmeralda pura.'
        ]
    },
    {
        id: 'netherite',
        name: 'Fragmento de Netherita',
        emoji: '<:netherite:0>'.replace('<:netherite:0>', '🌑'),
        weight: 1,
        min: 200_000,
        max: 400_000,
        color: 0x44403c,
        lines: [
            '**Netherita**?! Algo ancestral veio com a picareta.',
            'Um fragmento de netherita — lendário.',
            'O minério mais raro. Você está com sorte hoje.'
        ]
    }
];

// Corrige emoji netherite (sem custom emoji inválido)
ORES.forEach((o) => {
    if (o.id === 'netherite') o.emoji = '🌑';
});

const BIOMES = [
    'caverna de ardósia',
    'mina abandonada',
    'ravina profunda',
    'geodo de ametista',
    'túnel de dripstone',
    'camadas de deepslate',
    'fortaleza antiga'
];

function fmt(n) {
    return Number(n || 0).toLocaleString('pt-BR');
}

function cdLeft(userId) {
    const cds = store.load('minecd.json', {});
    const last = Number(cds[userId] || 0);
    const left = CD_MS - (Date.now() - last);
    return left > 0 ? left : 0;
}

function setCd(userId) {
    const cds = store.load('minecd.json', {});
    cds[userId] = Date.now();
    store.save('minecd.json', cds);
}

function formatCd(ms) {
    const s = Math.ceil(ms / 1000);
    const m = Math.floor(s / 60);
    const r = s % 60;
    if (m <= 0) return `**${r}s**`;
    return `**${m}m ${String(r).padStart(2, '0')}s**`;
}

function pickWeighted(list) {
    const total = list.reduce((a, x) => a + (x.weight || 0), 0);
    let roll = Math.random() * total;
    for (const item of list) {
        roll -= item.weight;
        if (roll <= 0) return item;
    }
    return list[list.length - 1];
}

function rollAmount(ore) {
    if (!ore.max && !ore.min) return 0;
    const a = Number(ore.min) || 0;
    const b = Number(ore.max) || a;
    return a + Math.floor(Math.random() * (b - a + 1));
}

function pickLine(ore) {
    const arr = ore.lines || ['Você minerou algo.'];
    return arr[Math.floor(Math.random() * arr.length)];
}

function pickBiome() {
    return BIOMES[Math.floor(Math.random() * BIOMES.length)];
}

function waitEmbed(user, left) {
    return new EmbedBuilder()
        .setColor(0xf59e0b)
        .setAuthor({
            name: user.username,
            iconURL: user.displayAvatarURL({ size: 64 })
        })
        .setTitle('⛏️ Picareta descansando')
        .setDescription(
            [
                'Sua picareta ainda está esquentando do último turno.',
                `Aguarde ${formatCd(left)} para minerar de novo.`,
                '',
                '_Cooldown: 5 minutos._'
            ].join('\n')
        );
}

function resultEmbed(user, ore, amount, balance, biome) {
    const line = pickLine(ore);
    const got =
        amount > 0
            ? `Você vendeu o minério por **✨ ${fmt(amount)}**.`
            : 'Nenhum éter desta vez.';

    return new EmbedBuilder()
        .setColor(ore.color || 0x5865f2)
        .setAuthor({
            name: `${user.username} · Mineração`,
            iconURL: user.displayAvatarURL({ size: 64 })
        })
        .setTitle(`${ore.emoji} ${ore.name}`)
        .setDescription(
            [
                `📍 **Local:** ${biome}`,
                '',
                line,
                '',
                got,
                `**Saldo:** ✨ **${fmt(balance)}**`,
                '',
                '_Próxima mineração em 5 minutos._'
            ].join('\n')
        )
        .setFooter({ text: 'Aeternus · Mundo de mineração' });
}

async function run(user, reply) {
    const left = cdLeft(user.id);
    if (left > 0) {
        return reply({ embeds: [waitEmbed(user, left)] });
    }

    setCd(user.id);
    const ore = pickWeighted(ORES);
    const amount = rollAmount(ore);
    if (amount > 0) {
        eter.add(user.id, amount, { reason: 'minerar', ore: ore.id });
    }
    const balance = eter.get(user.id);
    const biome = pickBiome();

    return reply({ embeds: [resultEmbed(user, ore, amount, balance, biome)] });
}

module.exports = {
    name: 'minerar',
    aliases: ['mine', 'mineracao', 'mineração', 'picareta'],
    description: 'Minera no estilo Minecraft e ganha éter',
    category: 'economia',
    CD_MS,
    data: new SlashCommandBuilder()
        .setName('minerar')
        .setDescription('Minera minérios (estilo Minecraft) e ganha éter'),

    async execute(message) {
        await run(message.author, (p) => message.reply(p));
    },

    async executeSlash(i) {
        await run(i.user, (p) => {
            if (typeof p === 'string') {
                return i.reply({ content: p, flags: 64 });
            }
            return i.reply(p);
        });
    }
};
