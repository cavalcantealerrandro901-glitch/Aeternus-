const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { chat, clearHistory } = require('../utils/ai');

async function runAi(ctx, prompt, options = {}) {
    const isInteraction =
        typeof ctx.isChatInputCommand === 'function'
            ? ctx.isChatInputCommand()
            : !!ctx.commandName;
    const user = ctx.user || ctx.author;
    const guild = ctx.guild;

    if (!prompt || !String(prompt).trim()) {
        const msg =
            'Pergunte algo. Ex: meu saldo, transferências, lista de comandos, clima em SP.';
        if (isInteraction) return ctx.reply({ content: msg, ephemeral: true });
        return ctx.reply(msg);
    }

    if (options.reset) clearHistory(user.id, guild?.id);

    if (isInteraction) await ctx.deferReply();
    else await ctx.channel.sendTyping().catch(() => {});

    const result = await chat(String(prompt).trim(), {
        userId: user.id,
        guildId: guild?.id,
        username: user.username,
        guildName: guild?.name,
        botName: ctx.client?.user?.username || 'Aeternus',
        guild: guild || null,
        client: ctx.client || null
    });

    if (!result.ok) {
        const err = `⚠️ ${result.error}`;
        if (isInteraction) return ctx.editReply({ content: err });
        return ctx.reply(err);
    }

    const embed = new EmbedBuilder()
        .setColor(0x7c3aed)
        .setAuthor({
            name: `${ctx.client.user.username} · IA`,
            iconURL: ctx.client.user.displayAvatarURL()
        })
        .setDescription(result.reply)
        .setFooter({ text: `${user.username} · ${result.model || 'modelo'}` })
        .setTimestamp();

    if (isInteraction) return ctx.editReply({ embeds: [embed] });
    return ctx.reply({ embeds: [embed] });
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ai')
        .setDescription('IA do Aeternus (saldo, comandos, clima, servidor...)')
        .addStringOption((o) =>
            o.setName('mensagem').setDescription('Sua pergunta').setRequired(true)
        )
        .addBooleanOption((o) =>
            o.setName('resetar').setDescription('Limpar memória da conversa').setRequired(false)
        ),

    aliases: ['ia', 'ask', 'perguntar'],

    async execute(interaction) {
        const prompt = interaction.options.getString('mensagem');
        const reset = interaction.options.getBoolean('resetar') || false;
        await runAi(interaction, prompt, { reset });
    },

    async executePrefix(message, args) {
        let reset = false;
        if (args[0]?.toLowerCase() === 'reset' || args[0]?.toLowerCase() === 'limpar') {
            reset = true;
            args.shift();
        }
        await runAi(message, args.join(' '), { reset });
    }
};
