const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuBuilder
} = require('discord.js');
const classes = require('../utils/classes');
const player = require('../utils/player');
const store = require('../utils/store');

function truncField(s, max = 1020) {
    const t = String(s || '');
    return t.length > max ? t.slice(0, max - 1) + '…' : t;
}

function classEmbed(cls) {
    const exclusive =
        cls.exclusive || cls.maxHolders === 1 || cls.rarity === 'unica' || cls.rarity === 'mitica';
    const emb = new EmbedBuilder()
        .setColor(cls.color || 0xc9a227)
        .setTitle(`${cls.emoji || '✨'} ${cls.name}`)
        .setDescription(truncField(cls.desc || '_Sem descrição_', 4000))
        .addFields(
            {
                name: 'Tipo / Raridade',
                value: `**${cls.rarityName || cls.rarity || 'Comum'}** · ${cls.type || 'melee'}${
                    exclusive ? '\n🔒 **Exclusiva** — só 1 jogador' : ''
                }`,
                inline: true
            },
            {
                name: 'ID',
                value: `\`${cls.id}\``,
                inline: true
            }
        );
    const ua = (cls.uniqueAbilities || []).filter((x) => x && x !== '—');
    const aa = (cls.activeAbilities || cls.powers || []).filter((x) => x && x !== '—');
    const up = (cls.uniquePassives || []).filter((x) => x && x !== '—');
    const pa = (cls.passives || []).filter((x) => x && x !== '—');
    if (ua.length)
        emb.addFields({
            name: '👁️ Habilidades únicas (2)',
            value: truncField(ua.map((x, i) => `${i + 1}. ${x}`).join('\n'))
        });
    if (aa.length)
        emb.addFields({
            name: '⚔️ Ativas (4)',
            value: truncField(aa.map((x, i) => `${i + 1}. ${x}`).join('\n'))
        });
    if (up.length)
        emb.addFields({
            name: '🔮 Passivas únicas (3)',
            value: truncField(up.map((x, i) => `${i + 1}. ${x}`).join('\n'))
        });
    if (pa.length)
        emb.addFields({
            name: '🧠 Passivas (5)',
            value: truncField(pa.map((x, i) => `${i + 1}. ${x}`).join('\n'))
        });
    if (cls.disadvantages?.length) {
        emb.addFields({ name: '⚠️ Desvantagens', value: truncField(cls.disadvantages.join(' · ')) });
    }
    if (cls.classGear) {
        const g = cls.classGear;
        emb.addFields({
            name: '🎒 Equipamento de classe',
            value: truncField(
                [
                    g.arma ? `Arma: \`${g.arma}\`` : null,
                    g.armadura ? `Armadura: \`${g.armadura}\`` : null,
                    g.acessorio ? `Acessório: \`${g.acessorio}\`` : null
                ]
                    .filter(Boolean)
                    .join(' · ')
            )
        });
    }
    if (cls.boundUserId) {
        emb.addFields({
            name: '🔗 Vinculada',
            value: `Somente <@${cls.boundUserId}> pode usar esta classe.`
        });
    }
    return emb;
}

function pickButtons(classId) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`classe:pick:${classId}`)
            .setLabel('Escolher esta classe')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('⚔️'),
        new ButtonBuilder()
            .setCustomId('classe:lista')
            .setLabel('Ver todas')
            .setStyle(ButtonStyle.Secondary)
    );
}

async function dmAllPlayers(client, cls) {
    const all = player.all();
    const ids = Object.keys(all).filter((id) => player.has(id));
    const emb = classEmbed(cls).setFooter({
        text: 'Nova classe · quem tinha classe antiga também pode trocar'
    });
    const row = pickButtons(cls.id);
    let ok = 0;
    let fail = 0;
    for (const id of ids) {
        try {
            const user = await client.users.fetch(id);
            await user.send({
                content: [
                    `📜 **Nova classe criada:** ${cls.emoji} **${cls.name}** (${cls.rarityName || cls.rarity})`,
                    '',
                    'Clique em **Escolher esta classe** para equipá-la agora.',
                    'Se você ainda usa uma **classe antiga**, pode trocar sem perder o perfil.',
                    'Também pode ver todas com `/classe escolher` ou o botão **Ver todas**.'
                ].join('\n'),
                embeds: [emb],
                components: [row]
            });
            ok++;
        } catch (_) {
            fail++;
        }
        await new Promise((r) => setTimeout(r, 350));
    }
    return { ok, fail, total: ids.length };
}

const data = new SlashCommandBuilder()
    .setName('classe')
    .setDescription('Gerenciar e escolher classes Aeternus')
    .addSubcommand((s) =>
        s
            .setName('criar')
            .setDescription('Admin: criar nova classe (enviada no PV dos jogadores)')
            .addStringOption((o) => o.setName('nome').setDescription('Nome da classe').setRequired(true))
            .addStringOption((o) => o.setName('descricao').setDescription('Descrição de como funciona').setRequired(true))
            .addStringOption((o) =>
                o
                    .setName('raridade')
                    .setDescription('Tipo/raridade')
                    .setRequired(true)
                    .addChoices(
                        { name: 'Comum', value: 'comum' },
                        { name: 'Incomum', value: 'incomum' },
                        { name: 'Rara', value: 'rara' },
                        { name: 'Épica', value: 'epica' },
                        { name: 'Lendária', value: 'lendaria' },
                        { name: 'Única', value: 'unica' },
                        { name: 'Mítica', value: 'mitica' }
                    )
            )
            .addStringOption((o) =>
                o
                    .setName('tipo')
                    .setDescription('Estilo de combate')
                    .setRequired(true)
                    .addChoices(
                        { name: 'Corpo a corpo', value: 'melee' },
                        { name: 'Magia', value: 'magic' },
                        { name: 'Longo alcance', value: 'ranged' },
                        { name: 'Suporte', value: 'support' },
                        { name: 'Tank', value: 'tank' }
                    )
            )
            .addStringOption((o) =>
                o
                    .setName('unicas')
                    .setDescription('2 habilidades únicas (separe com | )')
                    .setRequired(true)
            )
            .addStringOption((o) =>
                o
                    .setName('ativas')
                    .setDescription('4 habilidades ativas (separe com | )')
                    .setRequired(true)
            )
            .addStringOption((o) =>
                o
                    .setName('passivas_unicas')
                    .setDescription('3 passivas únicas (separe com | )')
                    .setRequired(true)
            )
            .addStringOption((o) =>
                o
                    .setName('passivas')
                    .setDescription('5 passivas (separe com | )')
                    .setRequired(true)
            )
            .addStringOption((o) => o.setName('emoji').setDescription('Emoji da classe').setRequired(false))
            .addStringOption((o) =>
                o.setName('desvantagens').setDescription('Desvantagens (separe com | )').setRequired(false)
            )
            .addBooleanOption((o) =>
                o.setName('avisar').setDescription('Enviar no PV de todos os jogadores?').setRequired(false)
            )
    )
    .addSubcommand((s) => s.setName('lista').setDescription('Lista todas as classes'))
    .addSubcommand((s) =>
        s
            .setName('escolher')
            .setDescription('Escolher ou trocar sua classe (também para classes antigas)')
    )
    .addSubcommand((s) =>
        s
            .setName('ver')
            .setDescription('Ver detalhes de uma classe')
            .addStringOption((o) => o.setName('id').setDescription('ID ou nome da classe').setRequired(true))
    )
    .addSubcommand((s) =>
        s
            .setName('remover')
            .setDescription('Admin: remove classe custom')
            .addStringOption((o) => o.setName('id').setDescription('ID da classe').setRequired(true))
    );

module.exports = {
    name: 'classe',
    aliases: ['classes', 'classeadmin', 'criarclasse'],
    description: 'Classes: criar (slash), listar e escolher',
    data,

    async executeSlash(interaction) {
        const sub = interaction.options.getSubcommand();

        if (sub === 'criar') {
            if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
                return interaction.reply({ content: 'Apenas administradores.', ephemeral: true });
            }
            await interaction.deferReply({ ephemeral: true });
            try {
                const cls = classes.createClass({
                    name: interaction.options.getString('nome'),
                    desc: interaction.options.getString('descricao'),
                    rarity: interaction.options.getString('raridade'),
                    type: interaction.options.getString('tipo'),
                    uniqueAbilities: interaction.options.getString('unicas'),
                    activeAbilities: interaction.options.getString('ativas'),
                    uniquePassives: interaction.options.getString('passivas_unicas'),
                    passives: interaction.options.getString('passivas'),
                    emoji: interaction.options.getString('emoji') || '✨',
                    disadvantages: interaction.options.getString('desvantagens') || ''
                });
                const avisar = interaction.options.getBoolean('avisar');
                let dmInfo = '';
                if (avisar !== false) {
                    const r = await dmAllPlayers(interaction.client, cls);
                    dmInfo = `\n📬 PV enviado: **${r.ok}** · falhou: **${r.fail}**`;
                }
                return interaction.editReply({
                    content: `✅ Classe **${cls.emoji} ${cls.name}** (\`${cls.id}\`) criada.${dmInfo}`,
                    embeds: [classEmbed(cls)],
                    components: [pickButtons(cls.id)]
                });
            } catch (e) {
                return interaction.editReply({ content: '❌ ' + e.message });
            }
        }

        if (sub === 'lista') {
            const list = classes.listSelectableClasses();
            const lines = list
                .map(
                    (c) =>
                        `${c.emoji || '✨'} **${c.name}** · ${c.rarityName || c.rarity || 'Comum'} · \`${c.id}\`${c.custom ? ' · custom' : ''}`
                )
                .join('\n')
                .slice(0, 3900);
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0xc9a227)
                        .setTitle('📜 Classes Aeternus')
                        .setDescription(lines || '_Nenhuma_')
                        .setFooter({ text: 'Use /classe escolher para trocar' })
                ],
                ephemeral: true
            });
        }

        if (sub === 'ver') {
            const q = interaction.options.getString('id').toLowerCase();
            const list = classes.listSelectableClasses();
            const cls =
                classes.getClass(q) ||
                list.find((c) => c.id === q || c.name.toLowerCase() === q || c.name.toLowerCase().includes(q));
            if (!cls) return interaction.reply({ content: 'Classe não encontrada.', ephemeral: true });
            return interaction.reply({ embeds: [classEmbed(cls)], components: [pickButtons(cls.id)], ephemeral: true });
        }

        if (sub === 'escolher') {
            return showChooseMenu(interaction);
        }

        if (sub === 'remover') {
            if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
                return interaction.reply({ content: 'Apenas administradores.', ephemeral: true });
            }
            const id = interaction.options.getString('id');
            if (!classes.deleteCustomClass(id)) {
                return interaction.reply({ content: 'Classe custom não encontrada.', ephemeral: true });
            }
            return interaction.reply({ content: `Removida \`${id}\`.`, ephemeral: true });
        }
    },

    async execute(message, args) {
        const sub = String(args[0] || 'lista').toLowerCase();
        if (sub === 'lista' || sub === 'list') {
            const list = classes.listSelectableClasses();
            const lines = list
                .map((c) => `${c.emoji} **${c.name}** · ${c.rarityName || 'Comum'} · \`${c.id}\``)
                .join('\n')
                .slice(0, 1900);
            return message.reply({ embeds: [new EmbedBuilder().setColor(0xc9a227).setTitle('📜 Classes').setDescription(lines)] });
        }
        return message.reply('Use o slash **`/classe criar`** (admin) ou **`/classe escolher`**.');
    },

    async handleComponent(interaction) {
        const id = interaction.customId || '';
        if (id === 'classe:lista') {
            return showChooseMenu(interaction, true);
        }
        if (id.startsWith('classe:pick:')) {
            const classId = id.slice('classe:pick:'.length);
            if (!classes.getClass(classId)) {
                return interaction.reply({ content: 'Classe inválida.', ephemeral: true });
            }
            if (!player.has(interaction.user.id)) {
                return interaction.reply({
                    content: 'Você ainda não tem perfil. Use `O.j criar` primeiro.',
                    ephemeral: true
                });
            }
            const resolved = classes.resolveClassId(classId);
            const claim = classes.canClaim(resolved, interaction.user.id, player.all());
            if (!claim.ok) {
                return interaction.reply({ content: '🔒 ' + claim.reason, ephemeral: true });
            }
            player.update(interaction.user.id, { classId: resolved });
            const c = classes.getClass(resolved);
            return interaction.reply({
                content: `✅ Classe definida: **${c.emoji} ${c.name}** (${c.rarityName || c.rarity || 'Comum'})${
                    c.exclusive || c.maxHolders === 1 ? '\n🔒 Classe **exclusiva** — só você pode usá-la.' : ''
                }`,
                embeds: [classEmbed(c)],
                ephemeral: true
            });
        }
        if (id.startsWith('classe:sel:')) {
            const classId = interaction.values[0];
            if (!player.has(interaction.user.id)) {
                return interaction.reply({ content: 'Crie o perfil com `O.j criar`.', ephemeral: true });
            }
            const resolved = classes.resolveClassId(classId);
            const claim = classes.canClaim(resolved, interaction.user.id, player.all());
            if (!claim.ok) {
                return interaction.reply({ content: '🔒 ' + claim.reason, ephemeral: true });
            }
            player.update(interaction.user.id, { classId: resolved });
            const c = classes.getClass(resolved);
            return interaction.update({
                content: `✅ Classe definida: **${c.emoji} ${c.name}**${
                    c.exclusive || c.maxHolders === 1 ? ' · 🔒 exclusiva' : ''
                }`,
                embeds: [classEmbed(c)],
                components: []
            });
        }
    }
};

async function showChooseMenu(interaction, isUpdate = false) {
    const list = classes.listSelectableClasses().slice(0, 25);
    const menu = new StringSelectMenuBuilder()
        .setCustomId('classe:sel:pick')
        .setPlaceholder('Escolha sua classe')
        .addOptions(
            list.map((c) => ({
                label: c.name.slice(0, 100),
                value: c.id,
                description: `${c.rarityName || c.rarity || 'Comum'} · ${(c.desc || '').slice(0, 40)}`,
                emoji: c.emoji && c.emoji.length <= 2 ? c.emoji : undefined
            }))
        );
    const payload = {
        content: 'Escolha sua classe (quem tinha classe antiga também pode trocar):',
        components: [new ActionRowBuilder().addComponents(menu)],
        ephemeral: true
    };
    if (isUpdate && interaction.isMessageComponent()) return interaction.update(payload);
    if (interaction.replied || interaction.deferred) return interaction.followUp(payload);
    return interaction.reply(payload);
}
