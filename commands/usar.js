const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const player = require('../utils/player');

const COLOR_OK = 0x34d399;
const COLOR_ERR = 0xf87171;
const COLOR_EQ = 0xa78bfa;

function invokedAlias(message) {
    const t0 = String(message.content || '')
        .trim()
        .split(/\s+/)[0]
        .toLowerCase();
    const body = t0.replace(/^[^a-z0-9]+/i, '');
    const parts = body.split(/[./]/).filter(Boolean);
    return (parts[parts.length - 1] || 'usar').toLowerCase();
}

function slotLabel(s) {
    return { arma: 'Arma', armadura: 'Armadura', acessorio: 'Acessório' }[s] || s;
}

function equipEmbed(userId, n) {
    const res = player.equipItem(userId, n);
    const emb = new EmbedBuilder().setColor(res.ok ? COLOR_EQ : COLOR_ERR);
    if (!res.ok) {
        emb.setTitle('Não foi possível equipar').setDescription(res.error);
        return emb;
    }
    const lines = [
        `${res.item.emoji || '🎁'} **${res.item.name}** equipado em **${slotLabel(res.slot)}**.`
    ];
    if (res.previous) {
        lines.push(
            `${res.previous.emoji || '🎁'} **${res.previous.name}** voltou para o inventário.`
        );
    }
    if (res.item.effects && Object.keys(res.item.effects).length) {
        const fx = Object.entries(res.item.effects)
            .filter(([, v]) => typeof v === 'number')
            .map(([k, v]) => `+${v} ${k}`)
            .join(' · ');
        if (fx) lines.push(`Bônus: ${fx}`);
    }
    emb.setTitle('⚔️ Item equipado').setDescription(lines.join('\n'));
    emb.setFooter({ text: 'O.desequipar arma|armadura|acessorio · O.inventario' });
    return emb;
}

function useEmbed(userId, n) {
    const res = player.useItem(userId, n);
    if (!res.ok && res.error === 'equip') {
        return equipEmbed(userId, n);
    }
    const emb = new EmbedBuilder().setColor(res.ok ? COLOR_OK : COLOR_ERR);
    if (!res.ok) {
        emb.setTitle('Não foi possível usar').setDescription(res.error);
        return emb;
    }
    const title =
        res.action === 'class'
            ? '📜 Classe alterada'
            : res.action === 'book'
              ? '📗 Livro usado'
              : '✨ Item usado';
    emb.setTitle(title).setDescription(
        [`${res.item.emoji || '🎁'} **${res.item.name}**`, '', ...(res.messages || [])].join(
            '\n'
        )
    );
    emb.setFooter({ text: 'O.inventario · O.j atributos' });
    return emb;
}

function unequipEmbed(userId, slot) {
    const res = player.unequipSlot(userId, slot);
    const emb = new EmbedBuilder().setColor(res.ok ? COLOR_OK : COLOR_ERR);
    if (!res.ok) {
        emb.setTitle('Desequipar').setDescription(res.error);
        return emb;
    }
    emb
        .setTitle('🎒 Item desequipado')
        .setDescription(
            `${res.item.emoji || '🎁'} **${res.item.name}** removido de **${slotLabel(
                res.slot
            )}** e voltou ao inventário.`
        );
    return emb;
}

function gearEmbed(userId, username) {
    const eq = player.getEquipped(userId);
    const bonus = player.getEquipmentBonuses(userId);
    return new EmbedBuilder()
        .setColor(COLOR_EQ)
        .setTitle(`⚔️ Equipamento · ${username}`)
        .setDescription(
            [
                `**Arma:** ${eq.arma ? `${eq.arma.emoji || ''} ${eq.arma.name}` : '_vazia_'}`,
                `**Armadura:** ${
                    eq.armadura ? `${eq.armadura.emoji || ''} ${eq.armadura.name}` : '_vazia_'
                }`,
                `**Acessório:** ${
                    eq.acessorio ? `${eq.acessorio.emoji || ''} ${eq.acessorio.name}` : '_vazio_'
                }`,
                '',
                `Bônus: FOR **${bonus.forca}** · DEF **${bonus.defesa}** · AGI **${bonus.agilidade}** · VIDA **${bonus.vida}**`
            ].join('\n')
        )
        .setFooter({ text: 'O.usar <n> · O.equipar <n> · O.desequipar <slot>' });
}

module.exports = {
    name: 'usar',
    aliases: ['use', 'equipar', 'equip', 'desequipar', 'unequip', 'equipment', 'equipamento'],
    description: 'Usar ou equipar item do inventário',
    data: new SlashCommandBuilder()
        .setName('usar')
        .setDescription('Usar ou equipar um item do inventário')
        .addIntegerOption((o) =>
            o
                .setName('numero')
                .setDescription('Número do item em /inventario')
                .setRequired(true)
                .setMinValue(1)
        ),

    async execute(message, args) {
        const alias = invokedAlias(message);

        if (alias === 'desequipar' || alias === 'unequip') {
            const slot = String(args[0] || '').toLowerCase();
            if (!slot) {
                return message.reply('Uso: `O.desequipar arma|armadura|acessorio`');
            }
            return message.reply({ embeds: [unequipEmbed(message.author.id, slot)] });
        }

        if (alias === 'equipamento' || alias === 'equipment') {
            return message.reply({
                embeds: [gearEmbed(message.author.id, message.author.username)]
            });
        }

        const n = parseInt(args[0], 10);
        if (!n) {
            return message.reply(
                [
                    'Uso:',
                    '• `O.usar <número>` — usa consumível/livro ou equipa peça',
                    '• `O.equipar <número>` — força equipar',
                    '• `O.desequipar arma|armadura|acessorio`',
                    '• `O.equipamento` — ver equipamentos',
                    '',
                    'Números em `O.inventario`.'
                ].join('\n')
            );
        }

        if (alias === 'equipar' || alias === 'equip') {
            return message.reply({ embeds: [equipEmbed(message.author.id, n)] });
        }

        return message.reply({ embeds: [useEmbed(message.author.id, n)] });
    },

    async executeSlash(i) {
        const n = i.options.getInteger('numero');
        return i.reply({ embeds: [useEmbed(i.user.id, n)] });
    }
};
