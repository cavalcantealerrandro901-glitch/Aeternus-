const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');

/** Estado por usuário */
const sessions = new Map();

function getSession(userId) {
    if (!sessions.has(userId)) {
        sessions.set(userId, {
            display: '0',
            prev: null,
            op: null,
            fresh: true, // próximo dígito substitui o display
            error: null
        });
    }
    return sessions.get(userId);
}

function resetSession(userId) {
    sessions.set(userId, {
        display: '0',
        prev: null,
        op: null,
        fresh: true,
        error: null
    });
    return sessions.get(userId);
}

function formatDisplay(n) {
    if (n == null || Number.isNaN(n) || !Number.isFinite(n)) return 'Erro';
    // limita casas e notação científica se muito grande
    const abs = Math.abs(n);
    if (abs !== 0 && (abs >= 1e12 || abs < 1e-9)) {
        return n.toExponential(8).replace(/\.?0+e/, 'e');
    }
    let s = String(Number(n.toPrecision(12)));
    if (s.includes('e')) return s;
    if (s.includes('.')) s = s.replace(/\.?0+$/, '');
    return s || '0';
}

function applyOp(a, op, b) {
    switch (op) {
        case '+':
            return a + b;
        case '-':
            return a - b;
        case '*':
            return a * b;
        case '/':
            if (b === 0) return NaN;
            return a / b;
        default:
            return b;
    }
}

function press(session, key) {
    session.error = null;

    if (key === 'C') {
        session.display = '0';
        session.prev = null;
        session.op = null;
        session.fresh = true;
        return;
    }

    if (key === 'CE') {
        session.display = '0';
        session.fresh = true;
        return;
    }

    if (key === 'BK') {
        if (session.fresh || session.display === 'Erro') {
            session.display = '0';
            session.fresh = true;
            return;
        }
        if (session.display.length <= 1 || (session.display.length === 2 && session.display.startsWith('-'))) {
            session.display = '0';
            session.fresh = true;
        } else {
            session.display = session.display.slice(0, -1);
        }
        return;
    }

    if (key === '±') {
        if (session.display === '0' || session.display === 'Erro') return;
        if (session.display.startsWith('-')) session.display = session.display.slice(1);
        else session.display = '-' + session.display;
        return;
    }

    if (key === '%') {
        const cur = parseFloat(session.display);
        if (!Number.isFinite(cur)) {
            session.display = 'Erro';
            session.fresh = true;
            return;
        }
        if (session.prev != null && session.op) {
            // percentual relativo ao valor anterior (ex.: 200 + 10% = 220)
            const pct = session.prev * (cur / 100);
            session.display = formatDisplay(pct);
        } else {
            session.display = formatDisplay(cur / 100);
        }
        session.fresh = true;
        return;
    }

    if (['+', '-', '*', '/'].includes(key)) {
        const cur = parseFloat(session.display);
        if (!Number.isFinite(cur)) {
            session.display = 'Erro';
            session.fresh = true;
            return;
        }
        if (session.prev != null && session.op && !session.fresh) {
            const res = applyOp(session.prev, session.op, cur);
            if (!Number.isFinite(res)) {
                session.display = 'Erro';
                session.prev = null;
                session.op = null;
                session.fresh = true;
                return;
            }
            session.display = formatDisplay(res);
            session.prev = res;
        } else {
            session.prev = cur;
        }
        session.op = key;
        session.fresh = true;
        return;
    }

    if (key === '=') {
        const cur = parseFloat(session.display);
        if (session.prev == null || !session.op) {
            session.fresh = true;
            return;
        }
        if (!Number.isFinite(cur)) {
            session.display = 'Erro';
            session.fresh = true;
            return;
        }
        const res = applyOp(session.prev, session.op, cur);
        if (!Number.isFinite(res)) {
            session.display = 'Erro';
            session.prev = null;
            session.op = null;
            session.fresh = true;
            return;
        }
        session.display = formatDisplay(res);
        session.prev = null;
        session.op = null;
        session.fresh = true;
        return;
    }

    // dígito ou ponto
    if (key === '.') {
        if (session.fresh || session.display === 'Erro') {
            session.display = '0.';
            session.fresh = false;
            return;
        }
        if (!session.display.includes('.')) session.display += '.';
        return;
    }

    if (/^[0-9]$/.test(key)) {
        if (session.fresh || session.display === '0' || session.display === 'Erro') {
            session.display = key;
            session.fresh = false;
        } else if (session.display.length < 16) {
            session.display += key;
        }
    }
}

function opLabel(op) {
    if (op === '*') return '×';
    if (op === '/') return '÷';
    if (op === '-') return '−';
    if (op === '+') return '+';
    return '';
}

function buildEmbed(session, user) {
    const expr =
        session.prev != null && session.op
            ? `${formatDisplay(session.prev)} ${opLabel(session.op)}`
            : '\u200b';

    const screen = [
        '```',
        ' ┌─────────────────────┐',
        ` │ ${String(expr).padStart(19).slice(-19)} │`,
        ` │ ${String(session.display).padStart(19).slice(-19)} │`,
        ' └─────────────────────┘',
        '```'
    ].join('\n');

    return new EmbedBuilder()
        .setColor(0xf97316)
        .setAuthor({
            name: `Calculadora · ${user.username}`,
            iconURL: user.displayAvatarURL({ size: 64 })
        })
        .setDescription(screen)
        .setFooter({ text: 'Só você pode usar estes botões · O.calc' })
        .setTimestamp();
}

function btn(id, label, style = ButtonStyle.Secondary, userId) {
    return new ButtonBuilder()
        .setCustomId(`calc:${id}:${userId}`)
        .setLabel(label)
        .setStyle(style);
}

function buildRows(userId) {
    const P = ButtonStyle.Primary;
    const S = ButtonStyle.Secondary;
    const D = ButtonStyle.Danger;
    const G = ButtonStyle.Success;

    return [
        new ActionRowBuilder().addComponents(
            btn('C', 'C', D, userId),
            btn('BK', '⌫', S, userId),
            btn('%', '%', S, userId),
            btn('/', '÷', P, userId)
        ),
        new ActionRowBuilder().addComponents(
            btn('7', '7', S, userId),
            btn('8', '8', S, userId),
            btn('9', '9', S, userId),
            btn('*', '×', P, userId)
        ),
        new ActionRowBuilder().addComponents(
            btn('4', '4', S, userId),
            btn('5', '5', S, userId),
            btn('6', '6', S, userId),
            btn('-', '−', P, userId)
        ),
        new ActionRowBuilder().addComponents(
            btn('1', '1', S, userId),
            btn('2', '2', S, userId),
            btn('3', '3', S, userId),
            btn('+', '+', P, userId)
        ),
        new ActionRowBuilder().addComponents(
            btn('pm', '±', S, userId),
            btn('0', '0', S, userId),
            btn('dot', '.', S, userId),
            btn('eq', '=', G, userId)
        )
    ];
}

module.exports = {
    name: 'calc',
    aliases: ['calculadora', 'calculator', 'calcular'],
    description: 'Calculadora com botões',
    async execute(message) {
        const userId = message.author.id;
        const session = resetSession(userId);

        await message.reply({
            embeds: [buildEmbed(session, message.author)],
            components: buildRows(userId)
        });
    },

    async handleComponent(interaction) {
        const parts = (interaction.customId || '').split(':');
        // calc:KEY:userId
        const keyRaw = parts[1];
        const ownerId = parts[2];

        if (interaction.user.id !== ownerId) {
            return interaction.reply({
                content: 'Esta calculadora não é sua. Use `O.calc` para abrir a sua.',
                ephemeral: true
            });
        }

        const map = {
            pm: '±',
            dot: '.',
            eq: '='
        };
        const key = map[keyRaw] || keyRaw;

        const session = getSession(ownerId);
        press(session, key);

        await interaction.update({
            embeds: [buildEmbed(session, interaction.user)],
            components: buildRows(ownerId)
        });
    }
};
