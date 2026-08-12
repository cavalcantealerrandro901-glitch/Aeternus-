const {
    SlashCommandBuilder,
    EmbedBuilder
} = require('discord.js');
const { chat, clearHistory } = require('../utils/ai');

async function runAi(ctx, prompt, options = {}) {
    const isInteraction = !!ctx.isChatInputCommand;
    const user = ctx.user || ctx.author;
    const guild = ctx.guild;

    if (!prompt || !String(prompt).trim()) {
        const msg = 'Pergunte algo ao abismo… Ex: `/ai o que são Almas?`';
        if (isInteraction) return ctx.reply({ content: msg, ephemeral: true });
        return ctx.reply(msg);
    }

    if (options.reset) {
        clearHistory(user.id, guild?.id);
    }

    if (isInteraction) {
        await ctx.deferReply();
    } else {
        await ctx.channel.sendTyping().catch(() => {});
    }

    const result = await chat(String(prompt).trim(), {
        userId: user.id,
        guildId: guild?.id,
        username: user.username,
        guildName: guild?.name,
        botName: ctx.client?.user?.username || 'Aeternus'
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
        .setFooter({
            text: `${user.username} · ${result.model || 'modelo'}`
        })
        .setTimestamp();

    if (isInteraction) {
        return ctx.editReply({ embeds: [embed] });
    }
    return ctx.reply({ embeds: [embed] });
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ai')
        .setDescription('Fale com a IA abissal do Aeternus')
        .addStringOption((o) =>
            o
                .setName('mensagem')
                .setDescription('Sua pergunta ou mensagem')
                .setRequired(true)
        )
        .addBooleanOption((o) =>
            o
                .setName('resetar')
                .setDescription('Limpar memória desta conversa')
                .setRequired(false)
        ),

    aliases: ['ia', 'ask', 'perguntar', 'grok'],

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
        const prompt = args.join(' ');
        await runAi(message, prompt, { reset });
    }
};
