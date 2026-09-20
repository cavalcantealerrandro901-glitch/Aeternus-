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

function classEmbed(cls) {
    const emb = new EmbedBuilder()
        .setColor(cls.color || 0xc9a227)
        .setTitle(`${cls.emoji || '✨'} ${cls.name}`)
        .setDescription(cls.desc || '_Sem descrição_')
        .addFields(
            { name: 'Tipo / Raridade', value: `**${cls.rarityName || cls.rarity || 'Comum'}** · ${cls.type || 'melee'}`, inline: true },
            { name: 'ID', value: `\`${cls.id}\``, inline: true }
        );
    const ua = (cls.uniqueAbilities || []).filter((x) => x && x !== '—');
    const aa = (cls.activeAbilities || cls.powers || []).filter((x) => x && x !== '—');
    const up = (cls.uniquePassives || []).filter((x) => x && x !== '—');
    const pa = (cls.passives || []).filter((x) => x && x !== '—');
    if (ua.length) emb.addFields({ name: '⭐ Habilidades únicas (2)', value: ua.map((x, i) => `${i + 1}. ${x}`).join('\n') });
    if (aa.length) emb.addFields({ name: '🔥 Ativas (4)', value: aa.map((x, i) => `${i + 1}. ${x}`).join('\n') });
    if (up.length) emb.addFields({ name: '💎 Passivas únicas (3)', value: up.map((x, i) => `${i + 1}. ${x}`).join('\n') });
    if (pa.length) emb.addFields({ name: '✨ Passivas (5)', value: pa.map((x, i) => `${i + 1}. ${x}`).join('\n') });
    if (cls.disadvantages?.length) emb.addFields({ name: '⚠️ Desvantagens', value: cls.disadvantages.join(' · ') });
    return emb;
}

function pickButtons(classId) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`classe:pick:${classId}`).setLabel('Escolher esta classe').setStyle(ButtonStyle.Primary).setEmoji('⚔️'),
        new ButtonBuilder().setCustomId('classe:lista').setLabel('Ver todas').setStyle(ButtonStyle.Secondary)
    );
}

async function dmAllPlayers(client, cls) {
    const all = player.all();
    const ids = Object.keys(all).filter((id) => player.has(id));
    const emb = classEmbed(cls).setFooter({ text: 'Nova classe — escolha no botão abaixo' });
    const row = pickButtons(cls.id);
    let ok = 0, fail = 0;
    for (const id of ids) {
        try {
            const user = await client.users.fetch(id);
            await user.send({
                content: `📜 **Nova classe:** ${cls.emoji} **${cls.name}** (${cls.rarityName || cls.rarity})`,
                embeds: [emb],
                components: [row]
            });
            ok++;
        } catch (_) { fail++; }
        await new Promise((r) => setTimeout(r, 350));
    }
    return { ok, fail, total: ids.length };
}

const data = new SlashCommandBuilder()
    .setName('classe')
    .setDescription('Gerenciar e escolher classes Aeternus')
    .addSubcommand((s) =>
        s.setName('criar').setDescription('Admin: criar classe (enviada no PV dos jogadores)')
            .addStringOption((o) => o.setName('nome').setDescription('Nome da classe').setRequired(true))
            .addStringOption((o) => o.setName('descricao').setDescription('Descrição').setRequired(true))
            .addStringOption((o) => o.setName('raridade').setDescription('Raridade').setRequired(true)
                .addChoices(
                    { name: 'Comum', value: 'comum' }, { name: 'Incomum', value: 'incomum' },
                    { name: 'Rara', value: 'rara' }, { name: 'Épica', value: 'epica' },
                    { name: 'Lendária', value: 'lendaria' }, { name: 'Única', value: 'unica' },
                    { name: 'Mítica', value: 'mitica' }
                ))
            .addStringOption((o) => o.setName('tipo').setDescription('Estilo de combate').setRequired(true)
                .addChoices(
                    { name: 'Corpo a corpo', value: 'melee' }, { name: 'Magia', value: 'magic' },
                    { name: 'Longo alcance', value: 'ranged' }, { name: 'Suporte', value: 'support' },
                    { name: 'Tank', value: 'tank' }
                ))
            .addStringOption((o) => o.setName('unicas').setDescription('2 habilidades únicas (separe com |)').setRequired(true))
            .addStringOption((o) => o.setName('ativas').setDescription('4 ativas (separe com |)').setRequired(true))
            .addStringOption((o) => o.setName('passivas_unicas').setDescription('3 passivas únicas (separe com |)').setRequired(true))
            .addStringOption((o) => o.setName('passivas').setDescription('5 passivas (separe com |)').setRequired(true))
            .addStringOption((o) => o.setName('emoji').setDescription('Emoji').setRequired(false))
            .addStringOption((o) => o.setName('desvantagens').setDescription('Desvantagens (|)').setRequired(false))
            .addBooleanOption((o) => o.setName('avisar').setDescription('Enviar no PV de todos?').setRequired(false))
    )
    .addSubcommand((s) => s.setName('lista').setDescription('Lista todas as classes'))
    .addSubcommand((s) => s.setName('escolher').setDescription('Escolher ou trocar classe (inclui quem tinha classe antiga)'))
    .addSubcommand((s) => s.setName('ver').setDescription('Ver detalhes').addStringOption((o) => o.setName('id').setDescription('ID ou nome').setRequired(true)))
    .addSubcommand((s) => s.setName('remover').setDescription('Admin: remove classe custom').addStringOption((o) => o.setName('id').setDescription('ID').setRequired(true)));

async function showChooseMenu(interaction, isUpdate = false) {
    const list = classes.listClasses().slice(0, 25);
    const menu = new StringSelectMenuBuilder()
        .setCustomId('classe:sel:pick')
        .setPlaceholder('Escolha sua classe')
        .addOptions(list.map((c) => ({
            label: c.name.slice(0, 100),
            value: c.id,
            description: `${c.rarityName || c.rarity || 'Comum'} · ${(c.desc || '').slice(0, 40)}`.slice(0, 100),
            emoji: c.emoji && String(c.emoji).length <= 2 ? c.emoji : undefined
        })));
    const payload = {
        content: 'Escolha sua classe (quem tinha classe antiga também pode trocar):',
        components: [new ActionRowBuilder().addComponents(menu)],
        ephemeral: true
    };
    if (isUpdate && interaction.isMessageComponent()) return interaction.update(payload);
    if (interaction.replied || interaction.deferred) return interaction.followUp(payload);
    return interaction.reply(payload);
}

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
                    dmInfo = `\n📬 PV: **${r.ok}** · falhou: **${r.fail}**`;
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
            const list = classes.listClasses();
            const lines = list.map((c) => `${c.emoji || '✨'} **${c.name}** · ${c.rarityName || 'Comum'} · \`${c.id}\`${c.custom ? ' · custom' : ''}`).join('\n').slice(0, 3900);
            return interaction.reply({ embeds: [new EmbedBuilder().setColor(0xc9a227).setTitle('📜 Classes Aeternus').setDescription(lines || '_Nenhuma_').setFooter({ text: '/classe escolher para trocar' })], ephemeral: true });
        }
        if (sub === 'ver') {
            const q = interaction.options.getString('id').toLowerCase();
            const list = classes.listClasses();
            const cls = classes.getClass(q) || list.find((c) => c.id === q || c.name.toLowerCase().includes(q));
            if (!cls) return interaction.reply({ content: 'Classe não encontrada.', ephemeral: true });
            return interaction.reply({ embeds: [classEmbed(cls)], components: [pickButtons(cls.id)], ephemeral: true });
        }
        if (sub === 'escolher') return showChooseMenu(interaction);
        if (sub === 'remover') {
            if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
                return interaction.reply({ content: 'Apenas administradores.', ephemeral: true });
            }
            const id = interaction.options.getString('id');
            if (!classes.deleteCustomClass(id)) return interaction.reply({ content: 'Classe custom não encontrada.', ephemeral: true });
            return interaction.reply({ content: `Removida \`${id}\`.`, ephemeral: true });
        }
    },

    async execute(message, args) {
        return message.reply('Use o slash **`/classe criar`** (admin) ou **`/classe escolher`**.');
    },

    async handleComponent(interaction) {
        const id = interaction.customId || '';
        if (id === 'classe:lista') return showChooseMenu(interaction, true);
        if (id.startsWith('classe:pick:')) {
            const classId = id.slice('classe:pick:'.length);
            if (!player.has(interaction.user.id)) {
                return interaction.reply({ content: 'Crie o perfil com `O.j criar` primeiro.', ephemeral: true });
            }
            const resolved = classes.resolveClassId(classId);
            player.update(interaction.user.id, { classId: resolved });
            const c = classes.getClass(resolved);
            return interaction.reply({ content: `✅ Classe: **${c.emoji} ${c.name}** (${c.rarityName || c.rarity || 'Comum'})`, embeds: [classEmbed(c)], ephemeral: true });
        }
        if (id.startsWith('classe:sel:')) {
            const classId = interaction.values[0];
            if (!player.has(interaction.user.id)) {
                return interaction.reply({ content: 'Crie o perfil com `O.j criar`.', ephemeral: true });
            }
            const resolved = classes.resolveClassId(classId);
            player.update(interaction.user.id, { classId: resolved });
            const c = classes.getClass(resolved);
            return interaction.update({ content: `✅ Classe: **${c.emoji} ${c.name}**`, embeds: [classEmbed(c)], components: [] });
        }
    }
};
