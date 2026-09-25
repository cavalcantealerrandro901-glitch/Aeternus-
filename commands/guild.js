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

/** userId -> draft creation state */
const drafts = new Map();

function fmt(n) {
    return Number(n || 0).toLocaleString('pt-BR');
}

function roleLabel(role) {
    if (role === 'owner') return '👑 Líder';
    if (role === 'officer') return '⭐ Oficial';
    return '🛡️ Membro';
}

function guildEmbed(g) {
    const members = (g.members || [])
        .slice()
        .sort((a, b) => {
            const o = { owner: 0, officer: 1, member: 2 };
            return (o[a.role] ?? 3) - (o[b.role] ?? 3);
        });
    const lines = members.slice(0, 15).map((m, i) => {
        return `${i + 1}. <@${m.id}> — ${roleLabel(m.role)}`;
    });
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
                `👥 Membros **${g.members.length}** / **${guilds.maxMembers(g)}**`,
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
                `Criar custa **✨ ${fmt(guilds.CREATE_COST)}** e é feito **no PV do bot**.`,
                '',
                '**Comandos**',
                '`O.guild criar` — inicia criação no privado',
                '`O.guild info [nome|tag]` — ver guilda',
                '`O.guild convidar @user` — convite',
                '`O.guild aceitar <nome|tag>` — entrar',
                '`O.guild sair` · `O.guild expulsar @user`',
                '`O.guild promover / rebaixar @user`',
                '`O.guild transferir @user`',
                '`O.guild depositar <valor>` · `O.guild sacar <valor>`',
                '`O.guild desc <texto>` · `O.guild boasvindas <texto>`',
                '`O.guild imagem` — envia no PV a nova foto',
                '`O.guild ranking` · `O.guild dissolver`',
                '',
                'Aliases: `O.guilda` · `O.clã` · `O.clan`'
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
    const urlMatch = String(message.content || '').match(/https?:\/\/\S+\.(png|jpe?g|gif|webp)(\?\S*)?/i);
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
        step: 'name',
        name: null,
        tag: null,
        description: '',
        welcome: '',
        imageUrl: null,
        imageTag: null,
        at: Date.now()
    });

    const payload = {
        embeds: [
            new EmbedBuilder()
                .setColor(0xa78bfa)
                .setTitle('🏰 Criar guilda — no privado')
                .setDescription(
                    [
                        `Custo ao finalizar: **✨ ${fmt(guilds.CREATE_COST)}**`,
                        '',
                        '**Passo 1/6 — Nome**',
                        'Envie o **nome** da guilda (3–24 caracteres).',
                        '',
                        'Depois pedirei: tag · descrição · boas-vindas · imagem · tag da imagem.',
                        'Digite `cancelar` a qualquer momento.'
                    ].join('\n')
                )
        ]
    };

    try {
        await message.author.send(payload);
        if (message.guild) {
            return message.reply('📬 Abri a criação da guilda no **seu PV**. Verifique as mensagens privadas.');
        }
        return null;
    } catch {
        drafts.delete(message.author.id);
        return message.reply(
            '❌ Não consegui enviar PV. Abra suas mensagens diretas com o bot e tente de novo.'
        );
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
            await message.channel.send('❌ Erro na criação da guilda. Tente de novo com `O.guild criar` ou `cancelar`.');
        } catch (_) {}
        return true;
    }
}

async function advanceDraftInner(message, uid, d) {
    if (!d) return false;
    if (Date.now() - d.at > 15 * 60 * 1000) {
        drafts.delete(uid);
        await message.channel.send('⏱️ Criação expirada. Use `O.guild criar` de novo.');
        return true;
    }
    d.at = Date.now();
    const text = String(message.content || '').trim();
    if (/^cancelar$/i.test(text)) {
        drafts.delete(uid);
        await message.channel.send('❌ Criação cancelada.');
        return true;
    }

    if (d.step === 'name') {
        if (text.length < 3) {
            await message.channel.send('Nome muito curto (mín. 3). Tente de novo.');
            return true;
        }
        d.name = text.slice(0, 24);
        d.step = 'tag';
        await message.channel.send(
            `✅ Nome: **${d.name}**\n\n**Passo 2/6 — Tag**\nEnvie a tag (2–5 letras/números), ex.: \`LOBO\``
        );
        return true;
    }

    if (d.step === 'tag') {
        const tag = guilds.sanitizeTag
            ? guilds.sanitizeTag(text)
            : String(text || '').trim().slice(0, 6);
        if ([...tag].length < 2) {
            await message.channel.send(
                'Tag inválida. Use **2 a 6** caracteres:\n' +
                    '• Letras **maiúsculas ou minúsculas** (ex.: `Lobo`, `AES`)\n' +
                    '• Números e **emojis** (ex.: `🔥G`, `G1`)\n' +
                    'Sem espaços.'
            );
            return true;
        }
        try {
            if (guilds.isTagTaken?.(tag) || guilds.findByName(tag)) {
                await message.channel.send(
                    `A tag **[${tag}]** já está em uso. Envie outra ou digite \`cancelar\`.`
                );
                return true;
            }
            if (guilds.isNameTaken?.(d.name) || guilds.findByName(d.name)) {
                await message.channel.send(
                    'O **nome** da guilda já está em uso. Digite `cancelar` e comece de novo com outro nome.'
                );
                drafts.delete(uid);
                return true;
            }
        } catch (e) {
            console.error('[guild tag check]', e);
        }
        d.tag = tag;
        d.step = 'description';
        await message.channel.send(
            `✅ Tag: **[${d.tag}]**\n\n**Passo 3/6 — Descrição**\nConte sobre a guilda (ou envie \`pular\`).`
        );
        return true;
    }

    if (d.step === 'description') {
        if (!/^pular$/i.test(text)) d.description = text.slice(0, guilds.MAX_DESC || 300);
        d.step = 'welcome';
        await message.channel.send(
            '**Passo 4/6 — Frase de boas-vindas**\nMensagem que novos membros verão ao entrar (ou `pular`).'
        );
        return true;
    }

    if (d.step === 'welcome') {
        if (!/^pular$/i.test(text)) d.welcome = text.slice(0, guilds.MAX_WELCOME || 300);
        d.step = 'image';
        await message.channel.send(
            '**Passo 5/6 — Imagem**\nEnvie uma **foto** (anexo) ou um **link** de imagem, ou `pular`.'
        );
        return true;
    }

    if (d.step === 'image') {
        const img = pickImageFromMessage(message);
        if (img) d.imageUrl = img;
        else if (!/^pular$/i.test(text) && text) {
            if (/^https?:\/\//i.test(text)) d.imageUrl = text;
            else {
                await message.channel.send('Envie uma imagem, um link ou `pular`.');
                return true;
            }
        }
        d.step = 'imageTag';
        await message.channel.send(
            '**Passo 6/6 — Tag da imagem**\nUm rótulo curto (ex.: `emblema`, `banner`) ou `pular`.\nDepois a guilda será criada.'
        );
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

module.exports = {
    name: 'guild',
    aliases: ['guilda', 'clã', 'cla', 'clan', 'clans'],
    description: 'Sistema de guildas / clãs',
    drafts,
    advanceDraft,

    async execute(message, args) {
        // Continuar wizard se estiver no meio da criação em DM
        if (!message.guild && drafts.has(message.author.id)) {
            await advanceDraft(message);
            return;
        }

        const sub = String(args[0] || 'ajuda').toLowerCase();
        const rest = args.slice(1);

        if (['ajuda', 'help', 'cmds'].includes(sub) || !args.length) {
            return message.reply({ embeds: [helpEmbed()] });
        }

        if (sub === 'criar' || sub === 'create') {
            return startCreateDm(message);
        }

        if (sub === 'info' || sub === 'ver') {
            let g = null;
            if (rest[0]) g = guilds.findByName(rest.join(' ')) || guilds.get(rest[0]);
            if (!g) g = guilds.findByMember(message.author.id);
            if (!g) return message.reply('Guilda não encontrada. Use `O.guild info <nome|tag>`.');
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
            const user = message.mentions.users.first();
            if (!user || user.bot) return message.reply('Mencione o usuário: `O.guild convidar @user`');
            const r = guilds.invite(g.id, message.author.id, user.id);
            if (!r.ok) return message.reply(`❌ ${r.error}`);
            return message.reply({
                content: `📨 <@${user.id}>, você foi convidado para **[${g.tag}] ${g.name}**!\nAceite com \`O.guild aceitar ${g.tag}\``
            });
        }

        if (sub === 'aceitar' || sub === 'accept' || sub === 'entrar') {
            const key = rest.join(' ').trim();
            if (!key) return message.reply('Uso: `O.guild aceitar <nome|tag>`');
            const r = guilds.acceptInvite(message.author.id, key);
            if (!r.ok) return message.reply(`❌ ${r.error}`);
            const welcome = r.welcome
                ? `\n\n💬 ${r.welcome}`
                : '';
            return message.reply({
                content: `✅ Você entrou em **[${r.guild.tag}] ${r.guild.name}**!${welcome}`,
                embeds: [guildEmbed(r.guild)]
            });
        }

        if (sub === 'sair' || sub === 'leave') {
            const r = guilds.leave(message.author.id);
            if (!r.ok) return message.reply(`❌ ${r.error}`);
            return message.reply(`👋 Você saiu de **[${r.guild.tag}] ${r.guild.name}**.`);
        }

        if (sub === 'expulsar' || sub === 'kick') {
            const g = guilds.findByMember(message.author.id);
            if (!g) return message.reply('Você não está em uma guilda.');
            const user = message.mentions.users.first();
            if (!user) return message.reply('Uso: `O.guild expulsar @user`');
            const r = guilds.kick(g.id, message.author.id, user.id);
            if (!r.ok) return message.reply(`❌ ${r.error}`);
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
                `🏦 Depositou **✨ ${fmt(bet.amount)}** em **[${r.guild.tag}]**.\nBanco: **${fmt(r.guild.bank)}** · Nv. **${r.guild.level}**`
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
            const g = guilds.findByMember(message.author.id);
            if (!g) return message.reply('Você não está em uma guilda.');
            const text = rest.join(' ').trim();
            if (!text) return message.reply('Uso: `O.guild desc <texto>`');
            const r = guilds.setDescription(g.id, message.author.id, text);
            if (!r.ok) return message.reply(`❌ ${r.error}`);
            return message.reply({ content: '📝 Descrição atualizada.', embeds: [guildEmbed(r.guild)] });
        }

        if (sub === 'boasvindas' || sub === 'welcome' || sub === 'bemvindo') {
            const g = guilds.findByMember(message.author.id);
            if (!g) return message.reply('Você não está em uma guilda.');
            const text = rest.join(' ').trim();
            if (!text) return message.reply('Uso: `O.guild boasvindas <texto>`');
            const r = guilds.setWelcome(g.id, message.author.id, text);
            if (!r.ok) return message.reply(`❌ ${r.error}`);
            return message.reply({ content: '💬 Boas-vindas atualizadas.', embeds: [guildEmbed(r.guild)] });
        }

        if (sub === 'imagem' || sub === 'foto' || sub === 'banner') {
            const g = guilds.findByMember(message.author.id);
            if (!g) return message.reply('Você não está em uma guilda.');
            if (!guilds.isOfficer(g, message.author.id)) {
                return message.reply('Só líder/oficiais alteram a imagem.');
            }
            try {
                await message.author.send(
                    'Envie neste PV a **nova imagem** da guilda (anexo ou link) e, na mesma mensagem ou em seguida, a **tag** (opcional).\nEx.: anexe a foto e escreva `emblema`.'
                );
                drafts.set(message.author.id, {
                    step: 'edit_image',
                    guildId: g.id,
                    at: Date.now()
                });
                if (message.guild) return message.reply('📬 Envie a imagem no **PV do bot**.');
            } catch {
                return message.reply('Abra o PV com o bot e tente de novo.');
            }
            return;
        }

        if (sub === 'ranking' || sub === 'rank' || sub === 'top') {
            const top = guilds.ranking(10);
            if (!top.length) return message.reply('Nenhuma guilda ainda.');
            const lines = top.map((g, i) => {
                const medal = ['🥇', '🥈', '🥉'][i] || `**${i + 1}.**`;
                return `${medal} **[${g.tag}] ${g.name}** — Nv.${g.level} · ✨ ${fmt(g.bank)} · ${g.members.length} membros`;
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
                content: `⚠️ Dissolver **[${g.tag}] ${g.name}**? O banco (✨ ${fmt(g.bank)}) volta para você.`,
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
                return interaction.reply({ content: 'Só o líder confirma.', ephemeral: true });
            }
            const r = guilds.disband(guildId, ownerId);
            if (!r.ok) return interaction.update({ content: `❌ ${r.error}`, components: [] });
            return interaction.update({
                content: `💥 Guilda dissolvida. ✨ **${fmt(r.refunded)}** devolvidos ao líder.`,
                components: []
            });
        }
        return false;
    }
};

// Export helper for messageCreate DM routing
module.exports.handleGuildDm = async function handleGuildDm(message) {
    const d = drafts.get(message.author.id);
    if (!d) return false;
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
        const r = guilds.setImage(d.guildId, message.author.id, img, tag || null);
        drafts.delete(message.author.id);
        if (!r.ok) {
            await message.channel.send(`❌ ${r.error}`);
            return true;
        }
        await message.channel.send({ content: '🖼️ Imagem da guilda atualizada.', embeds: [guildEmbed(r.guild)] });
        return true;
    }
    return advanceDraft(message);
};
