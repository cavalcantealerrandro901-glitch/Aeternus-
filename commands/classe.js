const {
    PermissionFlagsBits,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuBuilder,
    SlashCommandBuilder
} = require('discord.js');
const classes = require('../utils/classes');
const player = require('../utils/player');
const store = require('../utils/store');
const items = require('../utils/items');
const { generateClass } = require('../utils/classCreator');

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
    const details = cls.abilityDetails || {};
    const detailField = (list, detailList) => {
        const source = Array.isArray(detailList) && detailList.length ? detailList : list.map((name) => ({ name }));
        return truncField(source.map((x, i) => {
            const attrs = x.attributes && typeof x.attributes === 'object'
                ? Object.entries(x.attributes).map(([k, v]) => k + ' ' + (v >= 0 ? '+' : '') + v).join(' · ')
                : '';
            return '**' + (i + 1) + '. ' + (x.name || list[i]) + '**\n' + (x.description || '_Sem descrição_') + (attrs ? '\n↳ 📊 ' + attrs : '');
        }).join('\n\n'));
    };
    if (ua.length) emb.addFields({ name: '👁️ Habilidades únicas (3)', value: detailField(ua, details.unique) });
    if (aa.length) emb.addFields({ name: '⚔️ Ativas (4)', value: detailField(aa, details.active) });
    if (up.length) emb.addFields({ name: '🔮 Passivas únicas (3)', value: detailField(up, details.uniquePassives) });
    if (pa.length) emb.addFields({ name: '🧠 Passivas (5)', value: detailField(pa, details.passives) });

    if (cls.attributes && Object.keys(cls.attributes).length) {
        emb.addFields({
            name: '📊 Atributos da classe',
            value: truncField(Object.entries(cls.attributes).map(([k, v]) => '**' + k + '**: ' + v).join(' · '))
        });
    }
    if (cls.disadvantages?.length) {
        emb.addFields({ name: '⚠️ Desvantagens', value: truncField(cls.disadvantages.join(' · ')) });
    }
    if (Array.isArray(cls.exclusiveItems) && cls.exclusiveItems.length) {
        const customItemDefs = cls.exclusiveItems.map((id) => items.getItemDef(id)).filter(Boolean);
        if (customItemDefs.length) {
            emb.addFields({
                name: '🎒 Itens exclusivos da classe',
                value: truncField(customItemDefs.map((it) => {
                    const effects = Object.entries(it.effects || {}).map(([k, v]) => k + ' ' + (v >= 0 ? '+' : '') + v).join(' · ');
                    return (it.emoji || '🎒') + ' **' + it.name + '** · ' + it.category + '\n' + (it.desc || '_Sem descrição_') + (effects ? '\n↳ 📊 ' + effects : '');
                }).join('\n\n'), 1020)
            });
        }
    }
    if (cls.classGear) {
        const g = cls.classGear;
        const gearLines = [
            ['⚔️ Arma', g.arma],
            ['🛡️ Armadura', g.armadura],
            ['💍 Acessório', g.acessorio]
        ]
            .filter(([, id]) => id)
            .map(([label, id]) => {
                const item = items.getItemDef(id);
                if (!item) return `${label}: \`${id}\``;
                const stats = Object.entries(item.effects || {})
                    .map(([k, v]) => `${k} ${v >= 0 ? '+' : ''}${v}`)
                    .join(' · ');
                const ability = item.uniqueAbility?.name
                    ? `\n↳ ✦ ${item.uniqueAbility.name}`
                    : '';
                return `${label}: ${item.emoji || '📦'} **${item.name}**${stats ? ` — ${stats}` : ''}${ability}`;
            });

        if (gearLines.length) {
            emb.addFields({
                name: '🎒 Itens exclusivos da classe',
                value: truncField(gearLines.join('\n'), 1020)
            });
        }
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
                    'Sua classe é permanente depois de escolhida.',
                    'Também pode ver todas com O.classe listar ou o botão **Ver todas**.'
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


module.exports = {
    name: 'classe',
    aliases: ['classes'],
    description: 'Consultar e escolher classes',
    data: new SlashCommandBuilder()
        .setName('classe')
        .setDescription('Consultar e escolher classes')
        .addSubcommand((s) => s.setName('listar').setDescription('Listar as classes disponíveis'))
        .addSubcommand((s) => s.setName('escolher').setDescription('Escolher sua classe')),


    async execute(message, args) {
        const sub = String(args[0] || 'listar').toLowerCase();

        if (sub === 'listar' || sub === 'lista' || sub === 'list') {
            return message.reply(classListPayload('comum', 0, 'prefix'));
        }

        if (sub === 'escolher' || sub === 'escolha') {
            return message.reply(chooseStartPayload());
        }

        if (sub === 'criar') {
            const rawDescription = args.slice(1).join(' ').trim();
            if (!rawDescription) return message.reply('❌ Informe a descrição completa da classe. Use: O.classe criar "descrição completa da classe"');

            let isOwner = false;
            const configuredOwner = process.env.OWNER_ID || process.env.BOT_OWNER_ID;
            if (configuredOwner) {
                isOwner = String(configuredOwner) === String(message.author.id);
            } else {
                try {
                    const application = await message.client.application?.fetch();
                    const owner = application?.owner;
                    isOwner = String(owner?.user?.id || owner?.id || '') === String(message.author.id);
                    if (!isOwner && owner?.members?.has) isOwner = owner.members.has(message.author.id);
                } catch (_) {}
            }
            if (!isOwner) return message.reply('❌ Apenas o criador do Aeternus pode usar O.classe criar.');

            await message.reply('🧠 Interpretando a descrição e montando a classe completa...');
            try {
                const generated = await generateClass(rawDescription);
                const abilityDetails = { unique: generated.uniqueAbilities, active: generated.activeAbilities, uniquePassives: generated.uniquePassives, passives: generated.passives };
                const classBonuses = {
                    abilities: Object.fromEntries(generated.activeAbilities.map((x) => [x.name, x.attributes || {}])),
                    passives: Object.fromEntries(generated.passives.map((x) => [x.name, x.attributes || {}])),
                    unique: Object.fromEntries(generated.uniqueAbilities.map((x) => [x.name, x.attributes || {}])),
                    uniquePassives: Object.fromEntries(generated.uniquePassives.map((x) => [x.name, x.attributes || {}]))
                };
                const disadvantageDetails = Object.fromEntries(generated.disadvantages.map((x) => [x.name, x]));
                const cls = classes.createClass({
                    name: generated.name, desc: generated.description, rarity: generated.rarity, type: generated.type, emoji: generated.emoji,
                    attributes: generated.attributes, bonus: generated.attributes, uniqueAbilities: generated.uniqueAbilities, activeAbilities: generated.activeAbilities,
                    uniquePassives: generated.uniquePassives, passives: generated.passives, disadvantages: generated.disadvantages, abilityDetails, disadvantageDetails, classBonuses
                });
                const createdItems = items.createCustomItems(generated.items, cls.id);
                if (createdItems.length !== 3) return message.reply('❌ A classe foi gerada, mas os 3 itens exclusivos não puderam ser registrados.');
                const updated = classes.updateCustomClass(cls.id, {
                    exclusiveItems: createdItems.map((item) => item.id),
                    classGear: { armor: createdItems.find((x) => x.category === 'armadura')?.id || null, accessory: createdItems.find((x) => x.category === 'acessorio')?.id || null }
                }) || cls;
                const itemLines = createdItems.map((item) => item.emoji + ' **' + item.name + '** · ' + item.category).join('\n');
                const attrLines = Object.entries(generated.attributes).map(([key, value]) => key + ': **' + value + '**').join(' · ');
                return message.reply({
                    content: ['# ✦ NOVA CLASSE GERADA', '', updated.emoji + ' **' + updated.name + '**', '⭐ Raridade: **' + updated.rarityName + '**', '⚔️ Tipo: **' + updated.type + '**', '', '📊 **Atributos:** ' + attrLines, '', '🎒 **Itens exclusivos:**', itemLines].join('\n'),
                    embeds: [classEmbed(updated)]
                });
            } catch (e) {
                console.error('[classe criar]', e);
                return message.reply('❌ Não foi possível criar a classe: ' + (e.message || e));
            }
        }
        return message.reply([
            '❌ Subcomando de classe não reconhecido.',
            '',
            'Comandos disponíveis:',
            'O.classe escolher — escolher sua classe',
            'O.classe listar — listar as classes',
            'O.classe criar <descrição completa> — criar uma classe com IA (criador do bot)'
        ].join('\\n'));
    },

   async executeSlash(interaction) {
        const sub = interaction.options.getSubcommand();
        if (sub === 'listar') {
            return interaction.reply(classListPayload('comum', 0, 'slash'));
        }
        if (sub === 'escolher') return interaction.reply(chooseStartPayload());
    },

    async handleComponent(interaction) {
        const id = interaction.customId || '';
        if (id.startsWith('classe:list:')) {
            const parts = id.split(':');
            const rarity = parts[2] || 'comum';
            const page = Math.max(0, Number(parts[3]) || 0);
            return interaction.update(classListPayload(rarity, page, 'component'));
        }
        if (id === 'classe:abrir') {
            return showChooseMenu(interaction, true);
        }
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
            const current = player.get(interaction.user.id);
            if (current?.classId) {
                return interaction.reply({ content: `🔒 Sua classe já foi escolhida: **${player.getClass(current.classId)?.name || current.classId}**. Ela é permanente e não pode ser trocada.`, ephemeral: true });
            }
            const claim = classes.canClaim(resolved, interaction.user.id, player.all());
            if (!claim.ok) {
                return interaction.reply({ content: '🔒 ' + claim.reason, ephemeral: true });
            }
            player.update(interaction.user.id, { classId: resolved });
            const c = classes.getClass(resolved);
            return interaction.reply({
                content: [
                    `# ✦ ${c.emoji || '✨'} ${String(c.name).toUpperCase()}`,
                    '',
                    '## CLASSE ESCOLHIDA',
                    '',
                    `Você escolheu **${c.name}**. Esta escolha é permanente.`,
                    c.exclusive || c.maxHolders === 1 ? '🔒 **Classe exclusiva — só você pode usá-la.**' : '✨ Sua classe está pronta para ser usada.'
                ].join('\n'),
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
            const current = player.get(interaction.user.id);
            if (current?.classId) {
                return interaction.reply({ content: `🔒 Sua classe já foi escolhida: **${player.getClass(current.classId)?.name || current.classId}**. Ela é permanente e não pode ser trocada.`, ephemeral: true });
            }
            const claim = classes.canClaim(resolved, interaction.user.id, player.all());
            if (!claim.ok) {
                return interaction.reply({ content: '🔒 ' + claim.reason, ephemeral: true });
            }
            player.update(interaction.user.id, { classId: resolved });
            const c = classes.getClass(resolved);
            return interaction.update({
                content: [
                    `# ✦ ${c.emoji || '✨'} ${String(c.name).toUpperCase()}`,
                    '',
                    '## CLASSE ESCOLHIDA',
                    '',
                    `Você escolheu **${c.name}**. Esta escolha é permanente.`,
                    c.exclusive || c.maxHolders === 1 ? '🔒 **Classe exclusiva — só você pode usá-la.**' : '✨ Sua classe está pronta para ser usada.'
                ].join('\n'),
                embeds: [classEmbed(c)],
                components: []
            });
        }
    }
};

const CLASS_RARITIES = [
    { id: 'comum', name: 'Comum' },
    { id: 'incomum', name: 'Incomum' },
    { id: 'rara', name: 'Rara' },
    { id: 'epica', name: 'Épica' },
    { id: 'lendaria', name: 'Lendária' },
    { id: 'unica', name: 'Única' },
    { id: 'mitica', name: 'Mítica' }
];

function listCatalogClasses(rarity) {
    const all = typeof classes.allClasses === 'function' ? classes.allClasses() : {};
    return Object.values(all).filter((c) => c && c.id &&
        String(c.selectionPool || '').toLowerCase() === String(rarity).toLowerCase() &&
        !(c.exclusive || c.maxHolders === 1));
}

function classListPayload(rarity = 'comum', page = 0, source = 'component') {
    const rarityInfo = CLASS_RARITIES.find((r) => r.id === rarity) || CLASS_RARITIES[0];
    const list = listCatalogClasses(rarityInfo.id);
    const pageSize = 5;
    const totalPages = Math.max(1, Math.ceil(list.length / pageSize));
    const safePage = Math.min(Math.max(0, Number(page) || 0), totalPages - 1);
    const visible = list.slice(safePage * pageSize, safePage * pageSize + pageSize);
    const lines = [];
    lines.push('**✦ Raridade: ' + rarityInfo.name + '**');
    lines.push('*Escolha uma classe para conhecer seu caminho.*', '');
    for (const c of visible) {
        lines.push((c.emoji || '✨') + ' **' + c.name + '**');
        lines.push(c.desc || 'Sem descrição disponível.', '');
    }
    const emb = new EmbedBuilder()
        .setColor(0xc9a227)
        .setTitle('📜 CLASSES • AETERNUS')
        .setDescription(lines.join('\n').trim() || '_Nenhuma classe disponível nesta raridade._')
        .setFooter({ text: 'Página ' + (safePage + 1) + '/' + totalPages + ' • ' + list.length + ' classes • ' + rarityInfo.name });
    const prev = new ButtonBuilder()
        .setCustomId('classe:list:' + rarityInfo.id + ':' + Math.max(0, safePage - 1))
        .setLabel('Anterior').setStyle(ButtonStyle.Secondary).setEmoji('◀️').setDisabled(safePage === 0);
    const next = new ButtonBuilder()
        .setCustomId('classe:list:' + rarityInfo.id + ':' + Math.min(totalPages - 1, safePage + 1))
        .setLabel('Próxima').setStyle(ButtonStyle.Secondary).setEmoji('▶️').setDisabled(safePage >= totalPages - 1);
    const rarityIndex = CLASS_RARITIES.findIndex((r) => r.id === rarityInfo.id);
    const nextRarity = CLASS_RARITIES[(rarityIndex + 1) % CLASS_RARITIES.length];
    const rarityButton = new ButtonBuilder()
        .setCustomId('classe:list:' + nextRarity.id + ':0')
        .setLabel('Mudar raridade · ' + nextRarity.name).setStyle(ButtonStyle.Primary).setEmoji('🔄');
    return { embeds: [emb], components: [
        new ActionRowBuilder().addComponents(prev, next),
        new ActionRowBuilder().addComponents(rarityButton)
    ], ephemeral: source !== 'prefix' };
}

function parseQuotedArgs(input) {
    const out = [];
    const re = /"([^"]*)"|'([^']*)'|(\S+)/g;
    let m;
    while ((m = re.exec(String(input || '')))) {
        out.push(m[1] ?? m[2] ?? m[3]);
    }
    return out;
}

function chooseStartPayload() {
    return {
        content: [
            '# ✦ ESCOLHA SUA CLASSE',
            '',
            '## 🜂 O SEU CAMINHO COMEÇA AQUI',
            '',
            'Sua escolha define a classe que acompanhará seu personagem.',
            '',
            '⭐ **Raridade disponível:** Comum',
            '🔒 **A escolha é permanente.**',
            '',
            'Pressione o botão abaixo para abrir o menu de classes.'
        ].join('\n'),
        components: [
            new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('classe:abrir')
                    .setLabel('Selecionar uma classe')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('⚔️')
            )
        ],
        ephemeral: true
    };
}

async function showChooseMenu(interaction, isUpdate = false) {
    const list = classes.listSelectableClasses();
    const options = list.slice(0, 30).map((c) => ({
        label: String(c.name).slice(0, 100),
        value: c.id,
        emoji: c.emoji || '✨',
        description: String(c.desc || 'Classe Comum').slice(0, 100)
    }));

    const rows = [];
    for (let i = 0; i < options.length; i += 15) {
        const chunk = options.slice(i, i + 15);
        if (!chunk.length) continue;
        rows.push(
            new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId(`classe:sel:common:${Math.floor(i / 15)}`)
                    .setPlaceholder(i === 0 ? 'Selecione uma classe Comum' : 'Mais classes Comuns')
                    .addOptions(chunk)
            )
        );
    }

    const payload = {
        content: [
            '# ✦ SELECIONE SUA CLASSE',
            '',
            'Escolha uma das classes disponíveis para a sua raridade.',
            '🔒 Depois de escolhida, a classe será permanente.'
        ].join('\n'),
        components: rows,
        ephemeral: true
    };

    if (!rows.length) {
        payload.content = '# ✦ SELECIONE SUA CLASSE\n\nNenhuma classe Comum está disponível no momento.';
    }

    if (isUpdate && interaction.isMessageComponent()) return interaction.update(payload);
    if (interaction.replied || interaction.deferred) return interaction.followUp(payload);
    return interaction.reply(payload);
}