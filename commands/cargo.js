const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    EmbedBuilder
} = require('discord.js');
const tempRoles = require('../utils/tempRoles');

module.exports = {
    name: 'cargo',
    aliases: ['role', 'setcargo', 'togglecargo'],
    description: 'Dar ou remover cargo de um membro (opcional: temporário)',

    data: new SlashCommandBuilder()
        .setName('cargo-membro')
        .setDescription('Dar ou remover cargo de um membro (pode ser temporário)')
        .addUserOption((o) =>
            o.setName('membro').setDescription('Membro alvo').setRequired(true)
        )
        .addRoleOption((o) =>
            o.setName('cargo').setDescription('Cargo a alternar').setRequired(true)
        )
        .addStringOption((o) =>
            o
                .setName('duracao')
                .setDescription('Tempo do cargo (ex: 30m, 2h, 1d). Vazio = permanente/toggle')
                .setRequired(false)
                .setMaxLength(20)
        )
        .addBooleanOption((o) =>
            o
                .setName('notificar')
                .setDescription('Avisar o usuário no PV antes do cargo acabar')
                .setRequired(false)
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
                flags: 64
            });
        }

        await interaction.deferReply();

        const targetUser = interaction.options.getUser('membro', true);
        const role = interaction.options.getRole('cargo', true);
        const durRaw = interaction.options.getString('duracao');
        const notificar = interaction.options.getBoolean('notificar') ?? true;
        const reason =
            interaction.options.getString('motivo') || 'Alternância de cargo via /cargo-membro';

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
                embeds: [fail('Esse cargo está **acima ou igual** ao meu na hierarquia.')]
            });
        }

        if (
            interaction.guild.ownerId !== author.id &&
            role.position >= author.roles.highest.position
        ) {
            return interaction.editReply({
                embeds: [fail('Esse cargo está **acima ou igual** ao seu na hierarquia.')]
            });
        }

        const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
        if (!member) {
            return interaction.editReply({ embeds: [fail('Membro não encontrado no servidor.')] });
        }

        const durationMs = durRaw ? tempRoles.parseDuration(durRaw) : null;
        if (durRaw && !durationMs) {
            return interaction.editReply({
                embeds: [
                    fail(
                        'Duração inválida. Exemplos: `30m`, `2h`, `1d`, `1w` (mín. 1 min · máx. 90 dias).'
                    )
                ]
            });
        }

        if (durationMs) {
            try {
                if (!member.roles.cache.has(role.id)) {
                    await member.roles.add(role, `${interaction.user.tag}: ${reason} (temp)`);
                }
            } catch (e) {
                return interaction.editReply({
                    embeds: [fail(`Falha ao atribuir: ${e.message}`)]
                });
            }

            const entry = tempRoles.setTempRole(interaction.guild.id, {
                userId: member.id,
                roleId: role.id,
                durationMs,
                notify: !!notificar,
                by: interaction.user.id,
                reason
            });

            const emb = new EmbedBuilder()
                .setColor(0x22c55e)
                .setTitle('⏱️ Cargo TEMPORÁRIO concedido')
                .setDescription(
                    `**Membro:** ${member}\n` +
                        `**Cargo:** ${role}\n` +
                        `**Duração:** ${tempRoles.formatDuration(durationMs)}\n` +
                        `**Termina:** <t:${Math.floor(entry.endsAt / 1000)}:R>\n` +
                        `**Notificar:** ${notificar ? 'sim' : 'não'}\n` +
                        `**Staff:** ${interaction.user}`
                )
                .setFooter({
                    text: 'Mensagens: /configurar-mensagem-cargo'
                });

            return interaction.editReply({ embeds: [emb] });
        }

        const has = member.roles.cache.has(role.id);
        try {
            if (has) {
                await member.roles.remove(role, `${interaction.user.tag}: ${reason}`);
                tempRoles.clearTempRole(interaction.guild.id, member.id, role.id);
            } else {
                await member.roles.add(role, `${interaction.user.tag}: ${reason}`);
            }
        } catch (e) {
            return interaction.editReply({ embeds: [fail(`Falha: ${e.message}`)] });
        }

        return interaction.editReply({
            embeds: [
                new EmbedBuilder()
                    .setColor(has ? 0xf43f5e : 0x22c55e)
                    .setTitle(has ? '➖ Cargo RETIRADO' : '➕ Cargo CONCEDIDO')
                    .setDescription(
                        `**Membro:** ${member}\n**Cargo:** ${role}\n**Staff:** ${interaction.user}` +
                            (reason ? `\n**Motivo:** ${reason}` : '')
                    )
            ]
        });
    },

    async execute(message, args) {
        if (!message.guild) return;
        if (!message.member.permissions.has(PermissionFlagsBits.ManageRoles)) {
            return message.reply('❌ Você precisa da permissão **Gerenciar Cargos**.');
        }

        const member =
            message.mentions.members.first() ||
            (args[0] && (await message.guild.members.fetch(args[0]).catch(() => null)));
        const role =
            message.mentions.roles.first() ||
            (args[1] && message.guild.roles.cache.get(args[1]));

        if (!member || !role) {
            return message.reply(
                'Uso: `O.cargo @membro @cargo [duração] [motivo]`\n' +
                    'Ex.: `O.cargo @user @VIP 2h` · `O.cargo @user @VIP 1d boas-vindas`'
            );
        }

        const me = message.guild.members.me;
        if (!me.permissions.has(PermissionFlagsBits.ManageRoles)) {
            return message.reply('❌ Eu preciso da permissão **Gerenciar Cargos**.');
        }
        if (role.managed || role.id === message.guild.id) {
            return message.reply('❌ Cargo inválido.');
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

        const rest = args.filter((a) => !a.startsWith('<@') && !/^\d{17,20}$/.test(a));
        let durationMs = null;
        let reasonParts = rest.slice();
        if (rest[0] && tempRoles.parseDuration(rest[0])) {
            durationMs = tempRoles.parseDuration(rest[0]);
            reasonParts = rest.slice(1);
        }
        const reason = reasonParts.join(' ') || 'Toggle via prefixo';

        if (durationMs) {
            try {
                if (!member.roles.cache.has(role.id)) {
                    await member.roles.add(role, `${message.author.tag}: ${reason} (temp)`);
                }
            } catch (e) {
                return message.reply(`❌ Falha: ${e.message}`);
            }
            const entry = tempRoles.setTempRole(message.guild.id, {
                userId: member.id,
                roleId: role.id,
                durationMs,
                notify: true,
                by: message.author.id,
                reason
            });
            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0x22c55e)
                        .setTitle('⏱️ Cargo TEMPORÁRIO concedido')
                        .setDescription(
                            `**Membro:** ${member}\n**Cargo:** ${role}\n` +
                                `**Duração:** ${tempRoles.formatDuration(durationMs)}\n` +
                                `**Termina:** <t:${Math.floor(entry.endsAt / 1000)}:R>\n` +
                                `**Staff:** ${message.author}`
                        )
                ]
            });
        }

        const has = member.roles.cache.has(role.id);
        try {
            if (has) {
                await member.roles.remove(role, `${message.author.tag}: ${reason}`);
                tempRoles.clearTempRole(message.guild.id, member.id, role.id);
            } else {
                await member.roles.add(role, `${message.author.tag}: ${reason}`);
            }
        } catch (e) {
            return message.reply(`❌ Falha: ${e.message}`);
        }

        await message.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(has ? 0xf43f5e : 0x22c55e)
                    .setTitle(has ? '➖ Cargo RETIRADO' : '➕ Cargo CONCEDIDO')
                    .setDescription(
                        `**Membro:** ${member}\n**Cargo:** ${role}\n**Staff:** ${message.author}`
                    )
            ]
        });
    }
};

function fail(text) {
    return new EmbedBuilder()
        .setColor(0xef4444)
        .setTitle('❌ Não foi possível')
        .setDescription(text);
}
