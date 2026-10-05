const {
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
const items = require('../utils/items');

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
            name: '👁️ Habilidades únicas (3)',
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
    }\n    if (cls.boundUserId) {
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
    description: 'Classes: criar, listar e escolher por prefixo',
    slash: false,

    async execute(message, args) {
        const sub = String(args[0] || 'listar').toLowerCase();

        if (sub === 'listar' || sub === 'lista' || sub === 'list') {
            const list = classes.listSelectableClasses();
            const lines = list
                .map((c) => String(c.emoji || '✨') + ' **' + c.name + '** · ' + (c.rarityName || c.rarity || 'Comum') + ' · ' + c.id + (c.custom ? ' · custom' : ''))
                .join('\n')
                .slice(0, 3900);
            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0xc9a227)
                        .setTitle('📜 Classes Aeternus')
                        .setDescription(lines || '_Nenhuma classe disponível._')
                        .setFooter({ text: 'Use O.classe escolher para fazer sua escolha permanente' })
                ]
            });
        }

        if (sub === 'escolher' || sub === 'escolha') {
            return message.reply(chooseStartPayload());
        }

        if (sub === 'criar') {
            if (!message.member?.permissions?.has(PermissionFlagsBits.Administrator)) {
                return message.reply('❌ Apenas administradores podem criar classes.');
            }

            const raw = args.slice(1).join(' ').trim();
            const parts = parseQuotedArgs(raw);

            if (parts.length < 8) {
                return message.reply([
                    '❌ Formato incorreto.',
                    '',
                    'Use: O.classe criar "Nome" "Descrição" raridade tipo "únicas|..." "ativas|..." "passivas únicas|..." "passivas|..." emoji "desvantagens|..."',
                    '',
                    'Exemplo: O.classe criar "Cavaleiro Arcano" "Um guerreiro que combina espada e magia." rara melee "Mestre da Lâmina|Último Bastião|Golpe do Campeão" "Investida|Corte Arcano|Barreira|Ruptura" "Vontade Arcana|Defesa Mística|Sentido Arcano" "Tenacidade|Foco|Resistência|Concentração|Disciplina" ⚔️ "Custo de mana"',
                    '',
                    'Use | para separar habilidades, passivas e desvantagens.'
                ].join('\n'));
            }

            const [name, desc, rarity, type, uniqueAbilities, activeAbilities, uniquePassives, passives, emoji = '✨', disadvantages = ''] = parts;
            const validRarities = ['comum', 'incomum', 'rara', 'epica', 'lendaria', 'unica', 'mitica'];
            const validTypes = ['melee', 'magic', 'ranged', 'support', 'tank'];

            if (!validRarities.includes(String(rarity).toLowerCase())) {
                return message.reply('❌ Raridade inválida. Use: comum, incomum, rara, epica, lendaria, unica ou mitica.');
            }
            if (!validTypes.includes(String(type).toLowerCase())) {
                return message.reply('❌ Tipo inválido. Use: melee, magic, ranged, support ou tank.');
            }

            try {
                const cls = classes.createClass({
                    name,
                    desc,
                    rarity: String(rarity).toLowerCase(),
                    type: String(type).toLowerCase(),
                    uniqueAbilities,
                    activeAbilities,
                    uniquePassives,
                    passives,
                    emoji: emoji || '✨',
                    disadvantages
                });

                let dmInfo = '';
                try {
                    const r = await dmAllPlayers(message.client, cls);
                    dmInfo = '\n📬 PV enviado: **' + r.ok + '** · falhou: **' + r.fail + '**';
                } catch (e) {
                    dmInfo = '\n⚠️ Não foi possível enviar os PVs: ' + e.message;
                }

                return message.reply({
                    content: [
                        '# ✦ NOVA CLASSE',
                        '',
                        '✅ **' + cls.emoji + ' ' + cls.name + '** criada com sucesso.',
                        '🆔 ID: ' + cls.id,
                        '⭐ Raridade: **' + (cls.rarityName || cls.rarity) + '**',
                        dmInfo.trim()
                    ].filter(Boolean).join('\n'),
                    embeds: [classEmbed(cls)],
                    components: [pickButtons(cls.id)]
                });
            } catch (e) {
                return message.reply('❌ ' + e.message);
            }
        }

        return message.reply([
            '❌ Subcomando de classe não reconhecido.',
            '',
            'Comandos disponíveis:',
            'O.classe escolher — escolher sua classe',
            'O.classe listar — listar as classes',
            'O.classe criar ... — criar uma classe (administrador)'
        ].join('\n'));
    },

    async handleComponent(interaction) {
        const id = interaction.customId || '';
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