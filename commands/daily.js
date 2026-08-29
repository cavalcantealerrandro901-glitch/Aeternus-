const { EmbedBuilder } = require('discord.js');
const store = require('../utils/store');
const flocos = require('../utils/flocos');
const xp = require('../utils/xp');
const { getSettings } = require('../utils/settings');

function todayKey() {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
}

module.exports = {
    name: 'daily',
    aliases: ['diario'],
    async execute(message) {
        const all = store.load('daily.json', {});
        const today = todayKey();
        const info = all[message.author.id] || { last: null, streak: 0 };
        if (info.last === today)
            return message.reply('❄️ Daily já coletado. Volte após meia-noite BRT.');

        const y = new Date();
        y.setDate(y.getDate() - 1);
        const yKey = y.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
        const streak = info.last === yKey ? (info.streak || 0) + 1 : 1;

        const eco = getSettings(message.guild.id).economy;
        const min = eco.dailyMin ?? 5000;
        const max = eco.dailyMax ?? 50000;
        let base = min + Math.floor(Math.random() * (max - min + 1));
        const mult = xp.dailyMultiplier(xp.get(message.author.id).level);
        const total = Math.floor(base * mult);

        flocos.add(message.author.id, total);
        all[message.author.id] = { last: today, streak };
        store.save('daily.json', all);

        await message.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(0xfbbf24)
                    .setTitle('❄️ Daily')
                    .setDescription(
                        `+${flocos.format(total)}\n🔥 Sequência **${streak}** · ×${mult.toFixed(2)}`
                    )
            ]
        });
    }
};
