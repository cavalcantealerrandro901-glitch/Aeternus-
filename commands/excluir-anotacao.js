const {
    EmbedBuilder,
    PermissionFlagsBits,
    SlashCommandBuilder
} = require('discord.js');
const vip = require('../utils/vip');

const COLOR = 0xf43f5e;

function isMod(member) {
    if (!member) return false;
    return (
        member.permissions.has(PermissionFlagsBits.ManageGuild) ||
        member.permissions.has(PermissionFlagsBits.Administrator)
    );
}

function parseNumbers(raw) {
    const text = String(raw || '');
    const found = text.match(/\d+/g) || [];
    return [...new Set(found.map((n) => parseInt(n, 10)).filter((n) => n >= 1))];
}

module.exports = {
    name: 'excluir-anotacao',
    aliases: ['excluir', 'delanotacao', 'removeranotacao', 'apagar-anotacao'],
    description: 'Excluir anotação pelo número da lista',
    data: (() => {
        const b = new SlashCommandBuilder()
            .setName('excluir-anotacao')
            .setDescription('Excluir anotação(ões) pelo número da lista')
            .addStringOption((o) =>
                o
                    .setName('numeros')
                    .setDescription('Número(s) da lista — ex: 1 ou 1,2,5')
                    .setRequired(true)
            )
            .addStringOption((o) => {
                o.setName('categoria')
                    .setDescription('Categoria da lista (mesma do ver-anotações)')
                    .setRequired(false);
                o.addChoices({ name: 'Todas', value: 'todas' });
                for (const c of vip.CATEGORIES) {
                    o.addChoices({ name: c.name, value: c.value });
                }
                return o;
            })
            .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);
        return b;
    })(),

    async execute(message, args) {
        if (!isMod(message.member)) {
            return message.reply('Sem permissão. Precisa de **Gerenciar Servidor**.');
        }
        if (!args.length) {
            return message.reply(
                'Uso: `O.excluir <número(s)> [categoria]`\n' +
                    'Ex: `O.excluir 1` · `O.excluir 1,3,5` · `O.excluir 2 compra_vip`\n' +
                    'Os números são os da lista em **`O.veranotacoes`**.'
            );
        }

        let category = 'todas';
        const last = String(args[args.length - 1] || '').toLowerCase();
        const known = vip.CATEGORIES.find(
            (c) => c.value === last || c.name.toLowerCase() === last
        );
        if (known) {
            category = known.value;
            args = args.slice(0, -1);
        } else if (last === 'todas') {
            category = 'todas';
            args = args.slice(0, -1);
        }

        const nums = parseNumbers(args.join(' '));
        if (!nums.length) {
            return message.reply('Informe pelo menos um número válido. Ex: `O.excluir 1`');
        }

        const res = vip.removeByNumbers(message.guild.id, nums, category);
        if (!res.ok || !res.removed.length) {
            return message.reply(
                res.error ||
                    'Nada foi removido. Confira os números em **`O.veranotacoes`** (mesma categoria).'
            );
        }

        const lines = res.removed.map((r) => {
            const label = vip.vipLabel(r);
            const cat = vip.categoryLabel(r.category);
            return `**#${r.number}** · **${label}** · <@${r.userId}> · ${cat}`;
        });

        await message.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(COLOR)
                    .setTitle('Anotação(ões) excluída(s)')
                    .setDescription(lines.join('\n'))
                    .setFooter({ text: `${res.removed.length} removida(s) da lista` })
                    .setTimestamp()
            ]
        });
    },

    async executeSlash(i) {
        if (!isMod(i.member)) {
            return i.reply({
                content: 'Sem permissão. Precisa de **Gerenciar Servidor**.',
                flags: 64
            });
        }

        const nums = parseNumbers(i.options.getString('numeros', true));
        const category = i.options.getString('categoria') || 'todas';

        if (!nums.length) {
            return i.reply({
                content: 'Informe pelo menos um número válido. Ex: `1` ou `1,2,5`.',
                flags: 64
            });
        }

        const res = vip.removeByNumbers(i.guild.id, nums, category);
        if (!res.ok || !res.removed.length) {
            return i.reply({
                content:
                    res.error ||
                    'Nada foi removido. Confira os números em **/ver-anotacoes** (mesma categoria).',
                flags: 64
            });
        }

        const lines = res.removed.map((r) => {
            const label = vip.vipLabel(r);
            const cat = vip.categoryLabel(r.category);
            return `**#${r.number}** · **${label}** · <@${r.userId}> · ${cat}`;
        });

        await i.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(COLOR)
                    .setTitle('Anotação(ões) excluída(s)')
                    .setDescription(lines.join('\n'))
                    .setFooter({ text: `${res.removed.length} removida(s) da lista` })
                    .setTimestamp()
            ]
        });
    }
};
