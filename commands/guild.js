const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const player = require('../utils/player');
const guilds = require('../utils/guilds');
const { parseAmount, looksLikeAmount, resolveBet } = require('../utils/parseAmount');
const eter = require('../utils/eter');

function fmt(n) {
    return Number(n || 0).toLocaleString('pt-BR');
}

function roleLabel(role) {
    if (role === 'owner') return '👑 Líder';
    if (role === 'officer') return '⭐ Oficial';
    return '🛡️ Membro';
}

function guildEmbed(g, client) {
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
    return new EmbedBuilder()
        .setColor(0xa78bfa)
        .setTitle(`[${g.tag}] ${g.name}`)
        .setDescription(
            [
                g.description || '_Sem descrição._',
                '',
                `🎚️ Nível **${g.level}** · XP **${fmt(g.xp)}** / ${fmt(need)}`,
                `👥 Membros **${g.members.length}** / **${guilds.maxMembers(g)}**`,
                `🏦 Banco **✨ ${fmt(g.bank)}**`,
                `👑 Líder <@${g.ownerId}>`,
                '',
                '**Membros**',
                lines.join('\n') || '_Ninguém._'
            ].join('\n')
        )
        .setFooter({ text: `ID ${g.id} · O.guild ajuda` })
        .setTimestamp();
}

function helpEmbed() {
    return new EmbedBuilder()
        .setColor(0x8b5cf6)
        .setTitle('🏰 Sistema de Guildas')
        .setDescription(
            [
                `Criar custa **✨ ${fmt(guilds.CREATE_COST)}**.`,
                '',
                '**Comandos**',
                '`O.guild criar <nome> <tag>` — cria (tag 2–5 chars)',
                '`O.guild info [nome|tag]` — ver guilda',
                '`O.guild membros` — lista da sua',
                '`O.guild convidar @user` — convite',
                '`O.guild aceitar <nome|tag>` — entrar',
                '`O.guild sair` — deixar a guilda',
                '`O.guild expulsar @user`',
                '`O.guild promover @user` / `O.guild rebaixar @user`',
                '`O.guild transferir @user` — passar liderança',
                '`O.guild depositar <valor>` — all/half/1k…',
                '`O.guild sacar <valor>` — líder/oficiais',
                '`O.guild desc <texto>` — descrição',
                '`O.guild ranking` — top guildas',
                '`O.guild dissolver` — líder dissolve (banco volta)',
                '',
                'Aliases: `O.guilda` · `O.clã` · `O.clan`'
            ].join('\n')
        );
}

module.exports = {
    name: 'guild',
    aliases: ['guilda', 'clã', 'cla', 'clan', 'clans'],
    description: 'Sistema de guildas / clãs',

    async execute(message, args) {
        const sub = String(args[0] || 'ajuda').toLowerCase();
        const rest = args.slice(1);

        if (['ajuda', 'help', 'cmds'].includes(sub) || !args.length) {
            return message.reply({ embeds: [helpEmbed()] });
        }

        if (sub === 'criar' || sub === 'create') {
            const tag = rest[rest.length - 1];
            const name = rest.slice(0, -1).join(' ');
            if (!name || !tag) {
                return message.reply('Uso: `O.guild criar <nome da guilda> <TAG>`\nEx.: `O.guild criar Lobos do Éter LOBO`');
            }
            const r = guilds.createGuild(message.author.id, name, tag);
            if (!r.ok) return message.reply(`❌ ${r.error}`);
            return message.reply({
                content: `🏰 Guilda **[${r.guild.tag}] ${r.guild.name}** criada! (−✨ ${fmt(guilds.CREATE_COST)})`,
                embeds: [guildEmbed(r.guild)]
            });
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
            return message.reply({
                content: `✅ Você entrou em **[${r.guild.tag}] ${r.guild.name}**!`,
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
