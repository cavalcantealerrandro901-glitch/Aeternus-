const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');
const player = require('../utils/player');
const guilds = require('../utils/guilds');
const { looksLikeAmount, resolveBet } = require('../utils/parseAmount');
const eter = require('../utils/eter');

/** userId -> draft (criar ou editar) */
const drafts = new Map();
/** inviteId -> pending invite meta */
const pendingInvites = new Map();
const INVITE_TTL_MS = 5 * 60 * 1000;

function fmt(n) {
    return Number(n || 0).toLocaleString('pt-BR');
}

function stripGuildTag(nick) {
    return String(nick || '')
        .replace(/^\s*\[[^\]]{1,12}\]\s*/u, '')
        .trim();
}

async function applyGuildNick(guild, userId, tagOrNull) {
    if (!guild || !userId) return { ok: false, reason: 'no_guild' };
    try {
        const { PermissionFlagsBits } = require('discord.js');
        const me = guild.members.me || (await guild.members.fetchMe().catch(() => null));
        if (!me?.permissions?.has(PermissionFlagsBits.ManageNicknames)) {
            return { ok: false, reason: 'no_perm' };
        }
        const member = await guild.members.fetch(userId).catch(() => null);
        if (!member) return { ok: false, reason: 'not_in_server' };
        if (member.id === guild.ownerId) return { ok: false, reason: 'owner' };
        if (me.roles.highest.comparePositionTo(member.roles.highest) <= 0) {
            return { ok: false, reason: 'hierarchy' };
        }
        const base = stripGuildTag(member.nickname || member.user.username);
        let next;
        if (tagOrNull) {
            next = (`[${String(tagOrNull).slice(0, 6)}] ` + base).slice(0, 32);
        } else {
            next = base.slice(0, 32) || null;
        }
        if (next === member.user.username) next = null;
        if ((member.nickname || null) === next) return { ok: true, skipped: true };
        await member.setNickname(next, tagOrNull ? 'Tag da guilda Aeternus' : 'Saiu da guilda');
        return { ok: true };
    } catch (e) {
        console.error('[guild nick]', e.message);
        return { ok: false, reason: e.message };
    }
}

function roleLabel(role) {
    if (role === 'owner') return '👑 Líder';
    if (role === 'officer') return '⭐ Oficial';
    return '🛡️ Membro';
}

function guildEmbed(g) {
    const members = (Array.isArray(g.members) ? g.members : [])
        .filter((m) => m && m.id)
        .slice()
        .sort((a, b) => {
            const o = { owner: 0, officer: 1, member: 2 };
            return (o[a.role] ?? 3) - (o[b.role] ?? 3);
        });
    const lines = members.slice(0, 15).map((m, i) => `${i + 1}. <@${m.id}> — ${roleLabel(m.role)}`);
    const need = guilds.guildLevelNeed(g.level);
    const emb = new EmbedBuilder()
        .setColor(0xa78bfa)
        .setTitle(`[${g.tag}] ${g.name}`)
        .setDescription(
            [
                g.description || '_Sem descrição._',
                g.welcome ? `\n💬 **Boas-vindas:** ${g.welcome}` : '',
                '',
                `🎚️ Nível **${g.level}** · XP **${fmt(g.xp)}** / ${fmt(need)}`,
                `👥 Membros **${members.length}** / **${guilds.maxMembers(g)}**`,
                `🏦 Banco **✨ ${fmt(g.bank)}**`,
                `👑 Líder <@${g.ownerId}>`,
                g.imageTag ? `🏷️ Tag da imagem: \`${g.imageTag}\`` : '',
                '',
                '**Membros**',
                lines.join('\n') || '_Ninguém._'
            ]
                .filter(Boolean)
                .join('\n')
        )
        .setFooter({ text: `ID ${g.id} · O.guild ajuda` })
        .setTimestamp();
    if (g.imageUrl) emb.setThumbnail(g.imageUrl).setImage(g.imageUrl);
    return emb;
}

function helpEmbed() {
    return new EmbedBuilder()
        .setColor(0x8b5cf6)
        .setTitle('🏰 Sistema de Guildas')
        .setDescription(
            [
                `Criar custa **✨ ${fmt(guilds.CREATE_COST)}** e é feito **no PV**.`,
                '',
                '**Comandos**',
                '`O.guild criar` — criação no privado',
                '`O.guild editar` — editar no PV (nome, tag, imagem…)',
                '`O.guild editar <categoria>` — nome · tag · desc · boasvindas · imagem',
                '`O.guild info [nome|tag]`',
                '`O.guild convidar @user` — convite com botões',
                '`O.guild sair` · `O.guild expulsar @user`',
                '`O.guild promover / rebaixar @user`',
                '`O.guild transferir @user`',
                '`O.guild depositar / sacar <valor>`',
                '`O.guild inventario` · depositar/retirar itens',
                '`O.guild ranking` · `O.guild sincronizar` · `O.guild dissolver`'
            ].join('\n')
        );
}

function pickImageFromMessage(message) {
    const att = message.attachments?.find(
        (a) =>
            (a.contentType && a.contentType.startsWith('image/')) ||
            /\.(png|jpe?g|gif|webp)$/i.test(a.name || a.url || '')
    );
    if (att) return att.url;
    const urlMatch = String(message.content || '').match(
        /https?:\/\/\S+\.(png|jpe?g|gif|webp)(\?\S*)?/i
    );
    if (urlMatch) return urlMatch[0];
    return null;
}

async function startCreateDm(message) {
    if (!player.has(message.author.id)) {
        return message.reply('Crie o perfil com `O.j criar` antes.');
    }
    if (guilds.findByMember(message.author.id)) {
        return message.reply('Você já está em uma guilda.');
    }
    const bal = eter.get(message.author.id);
    if (bal < guilds.CREATE_COST) {
        return message.reply(
            `Custo: **✨ ${fmt(guilds.CREATE_COST)}**. Você tem **${fmt(bal)}**.`
        );
    }
    drafts.set(message.author.id, {
        mode: 'create',
        step: 'name',
        name: null,
        tag: null,
        description: '',
        welcome: '',
        imageUrl: null,
        imageTag: null,
        at: Date.now()
    });
    try {
        await message.author.send({
            embeds: [
                new EmbedBuilder()
                    .setColor(0xa78bfa)
                    .setTitle('🏰 Criar guilda — privado')
                    .setDescription(
                        `Custo ao finalizar: **✨ ${fmt(guilds.CREATE_COST)}**\n\n` +
                            '**Passo 1/6 — Nome**\nEnvie o nome da guilda (3–24 caracteres).\n`cancelar` a qualquer momento.'
                    )
            ]
        });
        if (message.guild) {
            return message.reply('📬 Abri a criação no **seu PV**.');
        }
    } catch {
        drafts.delete(message.author.id);
        return message.reply('❌ Não consegui enviar PV. Abra DMs com o bot.');
    }
    return null;
}

const EDIT_CATS = {
    nome: 'name',
    name: 'name',
    tag: 'tag',
    desc: 'description',
    descricao: 'description',
    description: 'description',
    boasvindas: 'welcome',
    welcome: 'welcome',
    bemvindo: 'welcome',
    imagem: 'image',
    foto: 'image',
    banner: 'image',
    imagetag: 'imageTag',
    tagimagem: 'imageTag'
};

async function startEditDm(message, category) {
    const g = guilds.findByMember(message.author.id);
    if (!g) return message.reply('Você não está em uma guilda.');
    if (!guilds.isOfficer(g, message.author.id)) {
        return message.reply('Só líder/oficiais editam a guilda.');
    }

    const cat = category ? EDIT_CATS[String(category).toLowerCase()] : null;
    if (!cat) {
        drafts.set(message.author.id, {
            mode: 'edit',
            step: 'pick',
            guildId: g.id,
            at: Date.now()
        });
        try {
            await message.author.send({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0xa78bfa)
                        .setTitle(`✏️ Editar [${g.tag}] ${g.name}`)
                        .setDescription(
                            [
                                'Envie a **categoria** que deseja editar:',
                                '',
                                '• `nome` — nome da guilda (só líder)',
                                '• `tag` — tag (só líder)',
                                '• `desc` — descrição',
                                '• `boasvindas` — frase de boas-vindas',
                                '• `imagem` — foto/banner',
                                '• `tagimagem` — rótulo da imagem',
                                '',
                                'Ou: `O.guild editar nome` · `O.guild editar tag` …',
                                '`cancelar` para sair.'
                            ].join('\n')
                        )
                ]
            });
            if (message.guild) return message.reply('📬 Menu de edição aberto no **PV**.');
            return null;
        } catch {
            drafts.delete(message.author.id);
            return message.reply('❌ Não consegui enviar PV.');
        }
    }

    drafts.set(message.author.id, {
        mode: 'edit',
        step: cat,
        guildId: g.id,
        at: Date.now()
    });
    const prompts = {
        name: 'Envie o **novo nome** da guilda (3–24 caracteres).',
        tag: 'Envie a **nova tag** (2–6 letras/números/emojis).',
        description: 'Envie a **nova descrição** (ou `limpar`).',
        welcome: 'Envie a **nova frase de boas-vindas** (ou `limpar`).',
        image: 'Envie a **nova imagem** (anexo ou link) ou `limpar`.',
        imageTag: 'Envie o **rótulo da imagem** (ou `limpar`).'
    };
    try {
        await message.author.send(
            `✏️ Editando **[${g.tag}]** — **${cat}**\n${prompts[cat] || 'Envie o valor.'}\n\`cancelar\` para sair.`
        );
        if (message.guild) return message.reply('📬 Continue a edição no **PV**.');
        return null;
    } catch {
        drafts.delete(message.author.id);
        return message.reply('❌ Não consegui enviar PV.');
    }
}

async function advanceDraft(message) {
    const uid = message.author.id;
    const d = drafts.get(uid);
    if (!d) return false;
    try {
        return await advanceDraftInner(message, uid, d);
    } catch (e) {
        console.error('[guild draft]', e);
        try {
            await message.channel.send('❌ Erro no fluxo. Use `cancelar` ou tente de novo.');
        } catch (_) {}
        return true;
    }
}

async function advanceDraftInner(message, uid, d) {
    if (!d) return false;
    if (Date.now() - d.at > 15 * 60 * 1000) {
        drafts.delete(uid);
        await message.channel.send('⏱️ Expirado. Use o comando de novo.');
        return true;
    }
    d.at = Date.now();
    const text = String(message.content || '').trim();
    if (/^cancelar$/i.test(text)) {
        drafts.delete(uid);
        await message.channel.send('❌ Cancelado.');
        return true;
    }

    // —— EDIT MODE ——
    if (d.mode === 'edit') {
        if (d.step === 'pick') {
            const cat = EDIT_CATS[text.toLowerCase()];
            if (!cat) {
                await message.channel.send(
                    'Categoria inválida. Use: `nome` · `tag` · `desc` · `boasvindas` · `imagem` · `tagimagem`'
                );
                return true;
            }
            d.step = cat;
            const prompts = {
                name: 'Envie o **novo nome**.',
                tag: 'Envie a **nova tag**.',
                description: 'Envie a **descrição** (ou `limpar`).',
                welcome: 'Envie as **boas-vindas** (ou `limpar`).',
                image: 'Envie a **imagem** ou link (ou `limpar`).',
                imageTag: 'Envie o **rótulo** (ou `limpar`).'
            };
            await message.channel.send(prompts[cat]);
            return true;
        }

        let r;
        if (d.step === 'name') {
            r = guilds.setName(d.guildId, uid, text);
        } else if (d.step === 'tag') {
            r = guilds.setTag(d.guildId, uid, text);
        } else if (d.step === 'description') {
            const val = /^limpar$/i.test(text) ? '' : text;
            r = guilds.setDescription(d.guildId, uid, val);
        } else if (d.step === 'welcome') {
            const val = /^limpar$/i.test(text) ? '' : text;
            r = guilds.setWelcome(d.guildId, uid, val);
        } else if (d.step === 'image') {
            if (/^limpar$/i.test(text)) {
                r = guilds.setImage(d.guildId, uid, '', null);
                if (r.ok) {
                    const data = guilds.all();
                    if (data[d.guildId]) {
                        data[d.guildId].imageUrl = null;
                        require('../utils/store').save('guilds.json', data);
                        r.guild = data[d.guildId];
                    }
                }
            } else {
                const img = pickImageFromMessage(message) || (/^https?:\/\//i.test(text) ? text : null);
                if (!img) {
                    await message.channel.send('Envie uma **imagem**, um **link** ou `limpar`.');
                    return true;
                }
                r = guilds.setImage(d.guildId, uid, img, null);
            }
        } else if (d.step === 'imageTag') {
            const val = /^limpar$/i.test(text) ? '' : text;
            r = guilds.setImage(d.guildId, uid, null, val);
        } else {
            drafts.delete(uid);
            await message.channel.send('Estado inválido.');
            return true;
        }

        drafts.delete(uid);
        if (!r?.ok) {
            await message.channel.send(`❌ ${r?.error || 'Falha'}`);
            return true;
        }
        await message.channel.send({
            content: '✅ Guilda atualizada.',
            embeds: [guildEmbed(r.guild)]
        });
        return true;
    }

    if (d.step === 'edit_image') {
        const img = pickImageFromMessage(message);
        if (!img) {
            await message.channel.send('Envie uma **imagem** (anexo ou link).');
            return true;
        }
        const tag = String(message.content || '')
            .replace(/https?:\/\/\S+/gi, '')
            .trim()
            .slice(0, 64);
        const r = guilds.setImage(d.guildId, uid, img, tag || null);
        drafts.delete(uid);
        if (!r.ok) {
            await message.channel.send(`❌ ${r.error}`);
            return true;
        }
        await message.channel.send({ content: '🖼️ Imagem atualizada.', embeds: [guildEmbed(r.guild)] });
        return true;
    }

    // —— CREATE MODE ——
    if (d.step === 'name') {
        if (text.length < 3) {
            await message.channel.send('Nome muito curto (mín. 3).');
            return true;
        }
        d.name = text.slice(0, 24);
        d.step = 'tag';
        await message.channel.send(
            `✅ Nome: **${d.name}**\n\n**Passo 2/6 — Tag**\nLetras, números ou emojis (ex.: \`LOBO\`, \`🔥G\`).`
        );
        return true;
    }

    if (d.step === 'tag') {
        const tag = guilds.sanitizeTag ? guilds.sanitizeTag(text) : text.slice(0, 6);
        if ([...tag].length < 2) {
            await message.channel.send('Tag inválida (2–6 caracteres).');
            return true;
        }
        try {
            if (guilds.isTagTaken?.(tag) || guilds.findByName(tag)) {
                await message.channel.send(`Tag **[${tag}]** em uso. Outra ou \`cancelar\`.`);
                return true;
            }
            if (guilds.isNameTaken?.(d.name) || guilds.findByName(d.name)) {
                await message.channel.send('Nome em uso. `cancelar` e recomece.');
                drafts.delete(uid);
                return true;
            }
        } catch (e) {
            console.error('[guild tag check]', e);
        }
        d.tag = tag;
        d.step = 'description';
        await message.channel.send(
            `✅ Tag: **[${d.tag}]**\n\n**Passo 3/6 — Descrição**\nOu \`pular\`.`
        );
        return true;
    }

    if (d.step === 'description') {
        if (!/^pular$/i.test(text)) d.description = text.slice(0, guilds.MAX_DESC || 300);
        d.step = 'welcome';
        await message.channel.send('**Passo 4/6 — Boas-vindas**\nOu `pular`.');
        return true;
    }

    if (d.step === 'welcome') {
        if (!/^pular$/i.test(text)) d.welcome = text.slice(0, guilds.MAX_WELCOME || 300);
        d.step = 'image';
        await message.channel.send('**Passo 5/6 — Imagem**\nAnexo, link ou `pular`.');
        return true;
    }

    if (d.step === 'image') {
        const img = pickImageFromMessage(message);
        if (img) d.imageUrl = img;
        else if (!/^pular$/i.test(text) && text) {
            if (/^https?:\/\//i.test(text)) d.imageUrl = text;
            else {
                await message.channel.send('Imagem, link ou `pular`.');
                return true;
            }
        }
        d.step = 'imageTag';
        await message.channel.send('**Passo 6/6 — Tag da imagem**\nOu `pular`.');
        return true;
    }

    if (d.step === 'imageTag') {
        if (!/^pular$/i.test(text)) d.imageTag = text.slice(0, 64);
        const r = guilds.createGuild(uid, {
            name: d.name,
            tag: d.tag,
            description: d.description,
            welcome: d.welcome,
            imageUrl: d.imageUrl,
            imageTag: d.imageTag
        });
        drafts.delete(uid);
        if (!r.ok) {
            await message.channel.send(`❌ ${r.error}`);
            return true;
        }
        await message.channel.send({
            content: `🏰 Guilda **[${r.guild.tag}] ${r.guild.name}** criada! (−✨ ${fmt(guilds.CREATE_COST)})`,
            embeds: [guildEmbed(r.guild)]
        });
        return true;
    }

    return true;
}

function scheduleInviteExpiry(inviteId, client) {
    setTimeout(async () => {
        const inv = pendingInvites.get(inviteId);
        if (!inv || inv.resolved) return;
        inv.resolved = true;
        pendingInvites.delete(inviteId);
        const g = guilds.get(inv.guildId);
        const gName = g ? `[${g.tag}] ${g.name}` : 'uma guilda';
        try {
            const user = await client.users.fetch(inv.targetId).catch(() => null);
            if (user) {
                await user.send({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(0xf59e0b)
                            .setTitle('⏰ Convite de guilda expirado')
                            .setDescription(
                                `O convite de **${gName}** expirou sem resposta.\n` +
                                    'Peça ao líder para convidar de novo se ainda quiser entrar.'
                            )
                    ]
                });
            }
        } catch (_) {}
        try {
            const from = await client.users.fetch(inv.fromId).catch(() => null);
            if (from) {
                await from.send({
                    content: `⏰ <@${inv.targetId}> não aceitou a tempo o convite de **${gName}**.`
                });
            }
        } catch (_) {}
        try {
            if (inv.channelId && inv.messageId) {
                const ch = await client.channels.fetch(inv.channelId).catch(() => null);
                const msg = ch ? await ch.messages.fetch(inv.messageId).catch(() => null) : null;
                if (msg) {
                    await msg.edit({
                        content: `⏰ Convite expirado — <@${inv.targetId}> não aceitou a tempo.`,
                        embeds: msg.embeds,
                        components: []
                    }).catch(() => {});
                }
            }
        } catch (_) {}
    }, INVITE_TTL_MS);
}

module.exports = {
    name: 'guild',
    aliases: ['guilda', 'clã', 'cla', 'clan', 'clans'],
    description: 'Sistema de guildas / clãs',
    drafts,
    advanceDraft,

    async execute(message, args) {
        if (!message.guild && drafts.has(message.author.id)) {
            await advanceDraft(message);
            return;
        }

        const sub = String(args[0] || 'ajuda').toLowerCase();
        const rest = args.slice(1);

        if (['ajuda', 'help', 'cmds'].includes(sub) || !args.length) {
            return message.reply({ embeds: [helpEmbed()] });
        }

        if (sub === 'criar' || sub === 'create') return startCreateDm(message);

        if (sub === 'editar' || sub === 'edit') {
            return startEditDm(message, rest[0]);
        }

        if (sub === 'info' || sub === 'ver') {
            let g = null;
            if (rest[0]) g = guilds.findByName(rest.join(' ')) || guilds.get(rest[0]);
            if (!g) g = guilds.findByMember(message.author.id);
            if (!g) return message.reply('Guilda não encontrada.');
            return message.reply({ embeds: [guildEmbed(g)] });
        }

        if (sub === 'membros' || sub === 'members') {
            const g = guilds.findByMember(message.author.id);
            if (!g) return message.reply('Você não está em uma guilda.');
            return message.reply({ embeds: [guildEmbed(g)] });
        }

        if (sub === 'convidar' || sub === 'invite') {
            const g = guilds.findByMember(message.author.id);
            if (!g) return message.reply('Você não está em uma guilda.');
            if (!guilds.isOfficer(g, message.author.id)) {
                return message.reply('Só líder/oficiais convidam.');
            }
            const user = message.mentions.users.first();
            if (!user || user.bot) {
                return message.reply('Mencione o usuário: `O.guild convidar @user`');
            }
            if (!player.has(user.id)) {
                return message.reply('Esse usuário ainda não tem perfil (`O.j criar`).');
            }
            if (guilds.findByMember(user.id)) {
                return message.reply('Essa pessoa já está em uma guilda.');
            }

            const inviteId = `${message.author.id}_${user.id}_${Date.now()}`;
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`guild:invconfirm:${inviteId}`)
                    .setLabel('Confirmar')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId(`guild:invcancel:${inviteId}`)
                    .setLabel('Cancelar')
                    .setStyle(ButtonStyle.Secondary)
            );

            pendingInvites.set(inviteId, {
                guildId: g.id,
                fromId: message.author.id,
                targetId: user.id,
                stage: 'confirm',
                resolved: false,
                channelId: message.channel.id,
                messageId: null,
                at: Date.now()
            });

            const msg = await message.reply({
                content:
                    `🏰 <@${message.author.id}>, você está convidando <@${user.id}> para **[${g.tag}] ${g.name}**.\n` +
                    `Clique no botão abaixo para **confirmar**. Caso a pessoa não aceite a tempo, enviarei um aviso na DM dela. ♡`,
                components: [row]
            });
            const inv = pendingInvites.get(inviteId);
            if (inv) inv.messageId = msg.id;
            return;
        }

        if (sub === 'aceitar' || sub === 'accept' || sub === 'entrar') {
            const key = rest.join(' ').trim();
            if (!key) return message.reply('Use o **botão** do convite ou `O.guild aceitar <tag>`.');
            const r = guilds.acceptInvite(message.author.id, key);
            if (!r.ok) return message.reply(`❌ ${r.error}`);
            let nickNote = '';
            if (message.guild) {
                const nick = await applyGuildNick(message.guild, message.author.id, r.guild.tag);
                if (nick.ok && !nick.skipped) {
                    nickNote = `\n🏷️ Tag **[${r.guild.tag}]** no apelido.`;
                }
            }
            const welcome = r.welcome ? `\n\n💬 ${r.welcome}` : '';
            return message.reply({
                content: `✅ Você entrou em **[${r.guild.tag}] ${r.guild.name}**!${welcome}${nickNote}`,
                embeds: [guildEmbed(r.guild)]
            });
        }

        if (sub === 'sair' || sub === 'leave') {
            const r = guilds.leave(message.author.id);
            if (!r.ok) return message.reply(`❌ ${r.error}`);
            if (message.guild) await applyGuildNick(message.guild, message.author.id, null);
            return message.reply(`👋 Você saiu de **[${r.guild.tag}] ${r.guild.name}**.`);
        }

        if (sub === 'expulsar' || sub === 'kick') {
            const g = guilds.findByMember(message.author.id);
            if (!g) return message.reply('Você não está em uma guilda.');
            const user = message.mentions.users.first();
            if (!user) return message.reply('Uso: `O.guild expulsar @user`');
            const r = guilds.kick(g.id, message.author.id, user.id);
            if (!r.ok) return message.reply(`❌ ${r.error}`);
            if (message.guild) await applyGuildNick(message.guild, user.id, null);
            return message.reply(`👢 <@${user.id}> foi expulso de **[${g.tag}]**.`);
        }

        if (sub === 'promover' || sub === 'promote') {
            const g = guilds.findByMember(message.author.id);
            if (!g) return message.reply('Você não está em uma guilda.');
            const user = message.mentions.users.first();
            if (!user) return message.reply('Uso: `O.guild promover @user`');
            const r = guilds.setRole(g.id, message.author.id, user.id, 'officer');
            if (!r.ok) return message.reply(`❌ ${r.error}`);
            return message.reply(`⭐ <@${user.id}> agora é **oficial**.`);
        }

        if (sub === 'rebaixar' || sub === 'demote') {
            const g = guilds.findByMember(message.author.id);
            if (!g) return message.reply('Você não está em uma guilda.');
            const user = message.mentions.users.first();
            if (!user) return message.reply('Uso: `O.guild rebaixar @user`');
            const r = guilds.setRole(g.id, message.author.id, user.id, 'member');
            if (!r.ok) return message.reply(`❌ ${r.error}`);
            return message.reply(`🛡️ <@${user.id}> voltou a **membro**.`);
        }

        if (sub === 'transferir' || sub === 'transfer') {
            const g = guilds.findByMember(message.author.id);
            if (!g) return message.reply('Você não está em uma guilda.');
            const user = message.mentions.users.first();
            if (!user) return message.reply('Uso: `O.guild transferir @user`');
            const r = guilds.transfer(g.id, message.author.id, user.id);
            if (!r.ok) return message.reply(`❌ ${r.error}`);
            return message.reply(`👑 Liderança transferida para <@${user.id}>.`);
        }

        if (sub === 'depositar' || sub === 'dep' || sub === 'doar') {
            const raw = rest.find((a) => looksLikeAmount(a));
            if (!raw) return message.reply('Uso: `O.guild depositar <valor|all|half|1k>`');
            const bet = resolveBet(raw, eter.get(message.author.id), { label: '✨' });
            if (!bet.ok) return message.reply(`❌ ${bet.error}`);
            const r = guilds.deposit(message.author.id, bet.amount);
            if (!r.ok) return message.reply(`❌ ${r.error}`);
            return message.reply(
                `🏦 Depositou **✨ ${fmt(bet.amount)}** em **[${r.guild.tag}]**.\nBanco: **${fmt(r.guild.bank)}**`
            );
        }

        if (sub === 'sacar' || sub === 'withdraw') {
            const raw = rest.find((a) => looksLikeAmount(a));
            if (!raw) return message.reply('Uso: `O.guild sacar <valor|all|half>`');
            const g = guilds.findByMember(message.author.id);
            if (!g) return message.reply('Você não está em uma guilda.');
            const bet = resolveBet(raw, g.bank || 0, { label: 'banco' });
            if (!bet.ok) return message.reply(`❌ ${bet.error}`);
            const r = guilds.withdraw(message.author.id, bet.amount);
            if (!r.ok) return message.reply(`❌ ${r.error}`);
            return message.reply(`💸 Sacou **✨ ${fmt(bet.amount)}** do banco de **[${r.guild.tag}]**.`);
        }

        if (sub === 'desc' || sub === 'descricao' || sub === 'description') {
            return startEditDm(message, 'desc');
        }
        if (sub === 'boasvindas' || sub === 'welcome') {
            return startEditDm(message, 'boasvindas');
        }
        if (sub === 'imagem' || sub === 'foto') {
            return startEditDm(message, 'imagem');
        }

        if (sub === 'inventario' || sub === 'inv' || sub === 'bau' || sub === 'baú') {
            const g = guilds.findByMember(message.author.id);
            if (!g) return message.reply('Você não está em uma guilda.');
            const list = guilds.getInventory(g.id);
            if (!list.length) {
                return message.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(0x8b5cf6)
                            .setTitle(`📦 Baú · [${g.tag}] ${g.name}`)
                            .setDescription(
                                '_Vazio._\n\nOficiais: `O.guild depositaritem <nº do seu inventário>`\n' +
                                    'Membros: `O.guild retiraritem <nº do baú>`'
                            )
                    ]
                });
            }
            const lines = list.slice(0, 25).map((it) => {
                const name = it.name || it.id || 'Item';
                const emoji = it.emoji || '📦';
                const rare = it.rarity ? ` · ${it.rarity}` : '';
                const by = it.depositedBy ? ` · por <@${it.depositedBy}>` : '';
                return `**${it.index}.** ${emoji} **${name}**${rare}${by}`;
            });
            const more = list.length > 25 ? `\n_…e mais ${list.length - 25}_` : '';
            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0x8b5cf6)
                        .setTitle(`📦 Baú · [${g.tag}] ${g.name}`)
                        .setDescription(
                            lines.join('\n') +
                                more +
                                '\n\n`O.guild depositaritem <nº>` · `O.guild retiraritem <nº>` · `O.guild removeritem <nº>`'
                        )
                        .setFooter({ text: `${list.length} item(ns) · oficiais depositam · membros retiram` })
                ]
            });
        }

        if (sub === 'depositaritem' || sub === 'depitem' || sub === 'doaritem') {
            const g = guilds.findByMember(message.author.id);
            if (!g) return message.reply('Você não está em uma guilda.');
            const n = parseInt(rest[0], 10);
            if (!n) {
                return message.reply(
                    'Uso: `O.guild depositaritem <número>`\nO número é o do **seu** `O.inventario`.'
                );
            }
            const r = guilds.depositItem(g.id, message.author.id, n);
            if (!r.ok) return message.reply(`❌ ${r.error}`);
            const name = r.item.name || r.item.id || 'Item';
            return message.reply(
                `📦 Depositou **${r.item.emoji || ''} ${name}** no baú de **[${g.tag}]**.`
            );
        }

        if (sub === 'retiraritem' || sub === 'pegaritem' || sub === 'withdrawitem') {
            const g = guilds.findByMember(message.author.id);
            if (!g) return message.reply('Você não está em uma guilda.');
            const n = parseInt(rest[0], 10);
            if (!n) {
                return message.reply(
                    'Uso: `O.guild retiraritem <número>`\nVeja os números em `O.guild inventario`.'
                );
            }
            const r = guilds.withdrawItem(g.id, message.author.id, n);
            if (!r.ok) return message.reply(`❌ ${r.error}`);
            const name = r.item.name || r.item.id || 'Item';
            return message.reply(
                `📦 Você retirou **${r.item.emoji || ''} ${name}** do baú para o seu inventário.`
            );
        }

        if (sub === 'removeritem' || sub === 'delitem') {
            const g = guilds.findByMember(message.author.id);
            if (!g) return message.reply('Você não está em uma guilda.');
            const n = parseInt(rest[0], 10);
            if (!n) return message.reply('Uso: `O.guild removeritem <número do baú>`');
            const r = guilds.removeGuildItem(g.id, message.author.id, n);
            if (!r.ok) return message.reply(`❌ ${r.error}`);
            const name = r.item.name || r.item.id || 'Item';
            return message.reply(`🗑️ Removeu **${name}** do baú da guilda.`);
        }

        if (sub === 'sincronizar' || sub === 'sync' || sub === 'nicks') {
            const g = guilds.findByMember(message.author.id);
            if (!g) return message.reply('Você não está em uma guilda.');
            if (!guilds.isOfficer(g, message.author.id)) {
                return message.reply('Só líder/oficiais.');
            }
            if (!message.guild) return message.reply('Use no **servidor**.');
            let ok = 0;
            let fail = 0;
            for (const m of g.members || []) {
                if (!m?.id) continue;
                const r = await applyGuildNick(message.guild, m.id, g.tag);
                if (r.ok) ok++;
                else fail++;
            }
            return message.reply(`🏷️ Tags: **${ok}** ok · **${fail}** falha(s).`);
        }

        if (sub === 'ranking' || sub === 'rank' || sub === 'top') {
            const top = (guilds.ranking(10) || []).filter((g) => g && typeof g === 'object');
            if (!top.length) return message.reply('Nenhuma guilda ainda.');
            const lines = top.map((g, i) => {
                const medal = ['🥇', '🥈', '🥉'][i] || `**${i + 1}.**`;
                const members = Array.isArray(g.members) ? g.members.length : 0;
                return `${medal} **[${g.tag || '???'}] ${g.name || '?'}** — Nv.${g.level || 1} · ✨ ${fmt(g.bank)} · ${members} membros`;
            });
            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0xfbbf24)
                        .setTitle('🏆 Ranking de Guildas')
                        .setDescription(lines.join('\n'))
                        .setTimestamp()
                ]
            });
        }

        if (sub === 'dissolver' || sub === 'disband' || sub === 'deletar') {
            const g = guilds.findByMember(message.author.id);
            if (!g) return message.reply('Você não está em uma guilda.');
            if (!guilds.isOwner(g, message.author.id)) {
                return message.reply('Só o líder pode dissolver.');
            }
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`guild:disband:${g.id}:${message.author.id}`)
                    .setLabel('Confirmar dissolver')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId(`guild:cancel:${message.author.id}`)
                    .setLabel('Cancelar')
                    .setStyle(ButtonStyle.Secondary)
            );
            return message.reply({
                content: `⚠️ Dissolver **[${g.tag}] ${g.name}**? Banco ✨ ${fmt(g.bank)} volta para você.`,
                components: [row]
            });
        }

        return message.reply({ embeds: [helpEmbed()] });
    },

    async handleComponent(interaction) {
        const id = interaction.customId || '';
        if (!id.startsWith('guild:')) return false;
        const parts = id.split(':');
        const action = parts[1];
        const client = interaction.client;

        if (action === 'cancel') {
            if (interaction.user.id !== parts[2]) {
                return interaction.reply({ content: 'Não é seu.', ephemeral: true });
            }
            return interaction.update({ content: 'Cancelado.', components: [] });
        }

        if (action === 'disband') {
            const guildId = parts[2];
            const ownerId = parts[3];
            if (interaction.user.id !== ownerId) {
                return interaction.reply({ content: 'Só o líder.', ephemeral: true });
            }
            const r = guilds.disband(guildId, ownerId);
            if (!r.ok) return interaction.update({ content: `❌ ${r.error}`, components: [] });
            return interaction.update({
                content: `💥 Guilda dissolvida. ✨ **${fmt(r.refunded)}** devolvidos.`,
                components: []
            });
        }

        // Inviter confirms the invite
        if (action === 'invconfirm') {
            const inviteId = parts[2];
            const inv = pendingInvites.get(inviteId);
            if (!inv || inv.resolved) {
                return interaction.reply({ content: 'Convite inválido ou expirado.', ephemeral: true });
            }
            if (interaction.user.id !== inv.fromId) {
                return interaction.reply({ content: 'Só quem convidou pode confirmar.', ephemeral: true });
            }
            const g = guilds.get(inv.guildId);
            if (!g) {
                inv.resolved = true;
                pendingInvites.delete(inviteId);
                return interaction.update({ content: 'Guilda não existe mais.', components: [] });
            }
            const r = guilds.invite(g.id, inv.fromId, inv.targetId);
            if (!r.ok) {
                inv.resolved = true;
                pendingInvites.delete(inviteId);
                return interaction.update({ content: `❌ ${r.error}`, components: [] });
            }

            inv.stage = 'pending';
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`guild:invaccept:${inviteId}`)
                    .setLabel('Aceitar')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId(`guild:invdecline:${inviteId}`)
                    .setLabel('Recusar')
                    .setStyle(ButtonStyle.Danger)
            );

            const content =
                `🏰 <@${inv.targetId}>, o líder/oficial de **[${g.tag}] ${g.name}** te convidou para se juntar a eles!\n` +
                `Clique no botão abaixo para **aceitar**.\n` +
                `Se ninguém aceitar a tempo, enviarei um aviso na sua **DM**.`;

            await interaction.update({ content, components: [row] });

            // DM ao convidado
            try {
                const target = await client.users.fetch(inv.targetId);
                await target.send({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(0xa78bfa)
                            .setTitle('🏰 Convite de guilda')
                            .setDescription(
                                `**[${g.tag}] ${g.name}** convidou você!\n` +
                                    `Volte ao servidor e clique em **Aceitar** na mensagem do convite.\n` +
                                    `Ou use \`O.guild aceitar ${g.tag}\`.\n\n` +
                                    `_Expira em 5 minutos._`
                            )
                    ]
                });
            } catch (_) {}

            scheduleInviteExpiry(inviteId, client);
            return true;
        }

        if (action === 'invcancel') {
            const inviteId = parts[2];
            const inv = pendingInvites.get(inviteId);
            if (!inv) {
                return interaction.update({ content: 'Cancelado.', components: [] });
            }
            if (interaction.user.id !== inv.fromId) {
                return interaction.reply({ content: 'Só quem convidou pode cancelar.', ephemeral: true });
            }
            inv.resolved = true;
            pendingInvites.delete(inviteId);
            return interaction.update({ content: '❌ Convite cancelado.', components: [] });
        }

        if (action === 'invaccept') {
            const inviteId = parts[2];
            const inv = pendingInvites.get(inviteId);
            if (!inv || inv.resolved) {
                return interaction.reply({ content: 'Convite inválido ou expirado.', ephemeral: true });
            }
            if (interaction.user.id !== inv.targetId) {
                return interaction.reply({ content: 'Este convite não é para você.', ephemeral: true });
            }
            const g = guilds.get(inv.guildId);
            if (!g) {
                inv.resolved = true;
                pendingInvites.delete(inviteId);
                return interaction.update({ content: 'Guilda não existe mais.', components: [] });
            }
            const r = guilds.acceptInvite(inv.targetId, g.id);
            if (!r.ok) {
                return interaction.reply({ content: `❌ ${r.error}`, ephemeral: true });
            }
            inv.resolved = true;
            pendingInvites.delete(inviteId);
            if (interaction.guild) {
                await applyGuildNick(interaction.guild, inv.targetId, r.guild.tag);
            }
            const welcome = r.welcome ? `\n\n💬 ${r.welcome}` : '';
            return interaction.update({
                content: `✅ <@${inv.targetId}> entrou em **[${r.guild.tag}] ${r.guild.name}**!${welcome}`,
                components: []
            });
        }

        if (action === 'invdecline') {
            const inviteId = parts[2];
            const inv = pendingInvites.get(inviteId);
            if (!inv || inv.resolved) {
                return interaction.reply({ content: 'Convite inválido.', ephemeral: true });
            }
            if (interaction.user.id !== inv.targetId && interaction.user.id !== inv.fromId) {
                return interaction.reply({ content: 'Não é seu convite.', ephemeral: true });
            }
            inv.resolved = true;
            pendingInvites.delete(inviteId);
            return interaction.update({
                content: `❌ <@${inv.targetId}> recusou o convite.`,
                components: []
            });
        }

        return false;
    }
};

module.exports.handleGuildDm = async function handleGuildDm(message) {
    if (!drafts.has(message.author.id)) return false;
    return advanceDraft(message);
};
