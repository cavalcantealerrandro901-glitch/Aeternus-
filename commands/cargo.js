const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    EmbedBuilder
} = require('discord.js');

module.exports = {
    name: 'cargo',
    aliases: ['role', 'setcargo', 'togglecargo'],
    description: 'Dá ou remove um cargo (toggle) — slash',

    data: new SlashCommandBuilder()
        .setName('cargo')
        .setDescription('Dá o cargo se o membro não tiver · remove se já tiver')
        .addUserOption((o) =>
            o.setName('membro').setDescription('Membro alvo').setRequired(true)
        )
        .addRoleOption((o) =>
            o.setName('cargo').setDescription('Cargo a alternar').setRequired(true)
        )
        .addStringOption((o) =>
            o
                .setName('motivo')
                .setDescription('Motivo (opcional)')
                .setRequired(false)
                .setMaxLength(200)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
        .setDMPermission(false),

    async executeSlash(interaction) {
        if (!interaction.inGuild()) {
            return interaction.reply({
                content: 'Este comando só funciona em servidores.',
                ephemeral: true
            });
        }

        await interaction.deferReply();

        const targetUser = interaction.options.getUser('membro', true);
        const role = interaction.options.getRole('cargo', true);
        const reason =
            interaction.options.getString('motivo') || 'Alternância de cargo via /cargo';

        const me = interaction.guild.members.me;
        const author = interaction.member;

        if (!author.permissions.has(PermissionFlagsBits.ManageRoles)) {
            return interaction.editReply({
                embeds: [fail('Você precisa da permissão **Gerenciar Cargos**.')]
            });
        }

        if (!me.permissions.has(PermissionFlagsBits.ManageRoles)) {
            return interaction.editReply({
                embeds: [fail('Eu preciso da permissão **Gerenciar Cargos**.')]
            });
        }

        if (role.managed) {
            return interaction.editReply({
                embeds: [fail('Não posso gerenciar cargos de **integração** (bots / boost).')]
            });
        }

        if (role.id === interaction.guild.id) {
            return interaction.editReply({
                embeds: [fail('Não é possível alterar o cargo **@everyone**.')]
            });
        }

        if (role.position >= me.roles.highest.position) {
            return interaction.editReply({
                embeds: [
                    fail(
                        `O cargo ${role} está **acima ou igual** ao meu cargo mais alto.\nSuba o cargo do bot na lista de cargos.`
                    )
                ]
            });
        }

        if (
            interaction.guild.ownerId !== author.id &&
            role.position >= author.roles.highest.position
        ) {
            return interaction.editReply({
                embeds: [
                    fail(`O cargo ${role} está **acima ou igual** ao seu cargo mais alto.`)
                ]
            });
        }

        let member;
        try {
            member = await interaction.guild.members.fetch(targetUser.id);
        } catch (_) {
            return interaction.editReply({
                embeds: [fail('Membro não encontrado neste servidor.')]
            });
        }

        if (member.id === me.id) {
            return interaction.editReply({
                embeds: [fail('Não posso alterar cargos em mim mesmo por este comando.')]
            });
        }

        if (
            interaction.guild.ownerId !== author.id &&
            member.roles.highest.position >= author.roles.highest.position &&
            member.id !== author.id
        ) {
            return interaction.editReply({
                embeds: [
                    fail(
                        'Você não pode gerenciar cargos de alguém com **cargo igual ou superior** ao seu.'
                    )
                ]
            });
        }

        const has = member.roles.cache.has(role.id);
        const audit = `${interaction.user.tag}: ${reason}`.slice(0, 512);

        try {
            if (has) await member.roles.remove(role, audit);
            else await member.roles.add(role, audit);
        } catch (e) {
            console.error('[cargo]', e);
            return interaction.editReply({
                embeds: [
                    fail(
                        `Falha ao ${has ? 'remover' : 'adicionar'} o cargo.\nVerifique hierarquia e permissões.\n\`${String(e.message || e).slice(0, 120)}\``
                    )
                ]
            });
        }

        const color = has ? 0xf43f5e : 0x22c55e;
        const emoji = has ? '➖' : '➕';
        const verb = has ? 'RETIRADO' : 'CONCEDIDO';

        const embed = new EmbedBuilder()
            .setColor(color)
            .setAuthor({
                name: 'Aeternus · Gestão de Cargos',
                iconURL: interaction.client.user.displayAvatarURL({ size: 64 })
            })
            .setTitle(`${emoji}  Cargo ${verb}`)
            .setDescription(
                [
                    '```',
                    has
                        ? '  ║   ROLE  ·  REMOVED       ║'
                        : '  ║   ROLE  ·  GRANTED       ║',
                    '```',
                    `**Membro:** ${member} \`${member.user.tag}\``,
                    `**Cargo:** ${role} \`${role.name}\``,
                    `**Ação:** ${has ? 'removido' : 'concedido'}`,
                    `**Staff:** ${interaction.user}`,
                    reason !== 'Alternância de cargo via /cargo'
                        ? `**Motivo:** ${reason}`
                        : null
                ]
                    .filter(Boolean)
                    .join('\n')
            )
            .addFields(
                {
                    name: '🆔 IDs',
                    value: [
                        `Membro \`${member.id}\``,
                        `Cargo \`${role.id}\``,
                        `Staff \`${interaction.user.id}\``
                    ].join('\n')
                },
                {
                    name: '📌 Estado atual',
                    value: has
                        ? 'O membro **não possui** mais este cargo.'
                        : 'O membro **possui** este cargo agora.'
                }
            )
            .setThumbnail(member.user.displayAvatarURL({ size: 128 }))
            .setFooter({ text: 'Toggle automático · /cargo membro:@user cargo:@role' })
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    },

    async execute(message, args) {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageRoles)) {
            return message.reply('❌ Sem permissão **Gerenciar Cargos**.');
        }
        const member = message.mentions.members.first();
        const role =
            message.mentions.roles.first() ||
            message.guild.roles.cache.get(args.find((a) => /^\d{17,20}$/.test(a)) || '');

        if (!member || !role) {
            return message.reply(
                'Uso: `/cargo membro:@user cargo:@role`\nPrefixo: `O.cargo @membro @cargo [motivo]`'
            );
        }

        const me = message.guild.members.me;
        if (!me.permissions.has(PermissionFlagsBits.ManageRoles)) {
            return message.reply('❌ Eu preciso de **Gerenciar Cargos**.');
        }
        if (role.managed || role.id === message.guild.id) {
            return message.reply('❌ Cargo inválido (integração ou @everyone).');
        }
        if (role.position >= me.roles.highest.position) {
            return message.reply('❌ Cargo acima do meu na hierarquia.');
        }
        if (
            message.guild.ownerId !== message.author.id &&
            role.position >= message.member.roles.highest.position
        ) {
            return message.reply('❌ Cargo acima do seu na hierarquia.');
        }

        const has = member.roles.cache.has(role.id);
        const reason =
            args.filter((a) => !a.startsWith('<@') && !/^\d{17,20}$/.test(a)).join(' ') ||
            'Toggle via prefixo';

        try {
            if (has) await member.roles.remove(role, `${message.author.tag}: ${reason}`);
            else await member.roles.add(role, `${message.author.tag}: ${reason}`);
        } catch (e) {
            return message.reply(`❌ Falha: ${e.message}`);
        }

        await message.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(has ? 0xf43f5e : 0x22c55e)
                    .setTitle(has ? '➖  Cargo RETIRADO' : '➕  Cargo CONCEDIDO')
                    .setDescription(
                        `**Membro:** ${member}\n**Cargo:** ${role}\n**Staff:** ${message.author}`
                    )
                    .setTimestamp()
            ]
        });
    }
};

function fail(text) {
    return new EmbedBuilder()
        .setColor(0xef4444)
        .setTitle('❌  Não foi possível')
        .setDescription(text)
        .setTimestamp();
}
