const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const reminders = require('../utils/reminders');

const COLOR = 0x38bdf8;

module.exports = {
    name: 'lembrete',
    aliases: ['lembrar', 'remind', 'reminder', 'lembretes'],
    description: 'Criar ou listar lembretes',
    data: new SlashCommandBuilder()
        .setName('lembrete')
        .setDescription('Criar um lembrete')
        .addStringOption((o) =>
            o
                .setName('quando')
                .setDescription('Quando lembrar — ex: 30m, 2h, 1d, 15:30')
                .setRequired(true)
        )
        .addStringOption((o) =>
            o.setName('texto').setDescription('O que lembrar').setRequired(true)
        ),

    async execute(message, args) {
        if (!args.length) {
            return message.reply(
                'Uso:\n' +
                    '`O.lembrete <quando> <texto>` — criar\n' +
                    '`O.lembrete listar` — seus lembretes\n' +
                    '`O.lembrete cancelar <id>` — cancelar\n' +
                    'Quando: `30m` `2h` `1d` `15:30` `2026-09-12 10:00`'
            );
        }

        const sub = String(args[0] || '').toLowerCase();
        if (sub === 'listar' || sub === 'lista' || sub === 'list') {
            const list = reminders.listUser(message.author.id, message.guild?.id);
            if (!list.length) {
                return message.reply('Você não tem lembretes pendentes.');
            }
            const lines = list.map(
                (r, i) =>
                    `**${i + 1}.** \`${r.id}\` — <t:${Math.floor(r.at / 1000)}:R> — ${r.text.slice(0, 80)}`
            );
            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(COLOR)
                        .setTitle('Seus lembretes')
                        .setDescription(lines.join('\n'))
                ]
            });
        }

        if (sub === 'cancelar' || sub === 'cancel' || sub === 'remover') {
            const id = args[1];
            if (!id) return message.reply('Uso: `O.lembrete cancelar <id>`');
            const rec = reminders.cancel(id, message.author.id);
            if (!rec) return message.reply('Lembrete não encontrado ou já enviado.');
            return message.reply(`Lembrete \`${rec.id}\` cancelado.`);
        }

        const quando = args[0];
        const texto = args.slice(1).join(' ').trim();
        if (!texto) {
            return message.reply('Informe o texto do lembrete. Ex: `O.lembrete 30m beber água`');
        }

        const at = reminders.parseWhen(quando);
        if (!at) {
            return message.reply(
                'Tempo inválido. Use `30m`, `2h`, `1d`, `15:30` ou `2026-09-12 10:00`.'
            );
        }

        const rec = reminders.add({
            guildId: message.guild.id,
            channelId: message.channel.id,
            userId: message.author.id,
            text: texto,
            at
        });

        await message.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(COLOR)
                    .setTitle('Lembrete criado')
                    .setDescription(texto)
                    .addFields(
                        {
                            name: 'Quando',
                            value: `<t:${Math.floor(at / 1000)}:F> (<t:${Math.floor(at / 1000)}:R>)`,
                            inline: false
                        },
                        { name: 'ID', value: `\`${rec.id}\``, inline: true },
                        { name: 'Canal', value: `${message.channel}`, inline: true }
                    )
                    .setFooter({ text: 'Será enviado neste canal e no seu DM' })
            ]
        });
    },

    async executeSlash(i) {
        const quando = i.options.getString('quando', true);
        const texto = i.options.getString('texto', true);
        const at = reminders.parseWhen(quando);
        if (!at) {
            return i.reply({
                content:
                    'Tempo inválido. Use `30m`, `2h`, `1d`, `15:30` ou `2026-09-12 10:00`.',
                flags: 64
            });
        }

        const rec = reminders.add({
            guildId: i.guild.id,
            channelId: i.channel.id,
            userId: i.user.id,
            text: texto,
            at
        });

        await i.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(COLOR)
                    .setTitle('Lembrete criado')
                    .setDescription(texto)
                    .addFields(
                        {
                            name: 'Quando',
                            value: `<t:${Math.floor(at / 1000)}:F> (<t:${Math.floor(at / 1000)}:R>)`,
                            inline: false
                        },
                        { name: 'ID', value: `\`${rec.id}\``, inline: true },
                        { name: 'Canal', value: `${i.channel}`, inline: true }
                    )
                    .setFooter({ text: 'Será enviado neste canal e no seu DM' })
            ]
        });
    }
};
