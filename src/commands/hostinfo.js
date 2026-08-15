const { EmbedBuilder } = require('discord.js');
const os = require('os');

module.exports = {
    name: 'hostinfo',
    async execute(message) {
        const totalMem = (os.totalmem() / 1024 / 1024 / 1024).toFixed(2);
        const freeMem = (os.freemem() / 1024 / 1024 / 1024).toFixed(2);
        const cpu = os.cpus()[0].model;

        const embed = new EmbedBuilder()
            .setTitle('⚙️ Detalhes da Hospedagem')
            .setColor('#f59e0b')
            .addFields(
                { name: 'CPU', value: cpu, inline: false },
                { name: 'Memória Total', value: `${totalMem} GB`, inline: true },
                { name: 'Memória Livre', value: `${freeMem} GB`, inline: true },
                { name: 'Sistema', value: os.type() + ' ' + os.release(), inline: false }
            );

        message.reply({ embeds: [embed] });
    }
};
