const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const fs = require('fs');

const DB_FILE = './gameData.json';

function loadData() {
    if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, JSON.stringify({ users: {} }));
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
}

function saveData(data) {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// Relíquias que podem ser forjadas
const RELICS = [
    { name: '☄️ Fragmento de Meteoro', rarity: 'Comum', power: 10 },
    { name: '🌙 Lâmina de Lucentia', rarity: 'Rara', power: 25 },
    { name: '☀️ Manopla Solar', rarity: 'Épica', power: 50 },
    { name: '⏳ Ampulheta Primordial', rarity: 'Atemporal', power: 100 }
];

module.exports = {
    // Ganho passivo ao enviar mensagens no chat
    trackMessage(userId) {
        let data = loadData();
        if (!data.users[userId]) {
            data.users[userId] = { stardust: 0, relics: [], wins: 0 };
        }
        data.users[userId].stardust += 2;
        saveData(data);
    },

    // Comando principal: !forja
    async executeGame(message) {
        const userId = message.author.id;
        let data = loadData();

        if (!data.users[userId]) {
            data.users[userId] = { stardust: 10, relics: [], wins: 0 };
            saveData(data);
        }

        const userGame = data.users[userId];

        const embed = new EmbedBuilder()
            .setColor('#38bdf8')
            .setTitle('🌌 Forja Aeterna - O Núcleo Cósmico')
            .setDescription(`Olá **${message.author.username}**, gerencie seus recursos temporais e monte seu inventário de relíquias!`)
            .addFields(
                { name: '✨ Poeira Estelar', value: `${userGame.stardust}`, inline: true },
                { name: '🗡️ Relíquias', value: `${userGame.relics.length}`, inline: true },
                { name: '🏆 Vitórias', value: `${userGame.wins}`, inline: true }
            )
            .setFooter({ text: 'Aeternus Mini-Game • Use os botões abaixo para jogar' });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('explore').setLabel('🚀 Explorar Galáxia').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('forge').setLabel('⚒️ Forjar Relíquia (20✨)').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('inventory').setLabel('🎒 Inventário').setStyle(ButtonStyle.Secondary)
        );

        const msg = await message.channel.send({ embeds: [embed], components: [row] });
        const collector = msg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 60000 });

        collector.on('collect', async i => {
            if (i.user.id !== message.author.id) {
                return i.reply({ content: '❌ Abra o seu próprio painel usando `!forja`!', ephemeral: true });
            }

            let currentData = loadData();
            let p = currentData.users[userId];

            if (i.customId === 'explore') {
                const found = Math.floor(Math.random() * 15) + 5;
                p.stardust += found;
                saveData(currentData);
                await i.reply({ content: `🌌 Você explorou uma fenda temporal e encontrou **${found} Poeira Estelar**!`, ephemeral: true });
            } 
            
            else if (i.customId === 'forge') {
                if (p.stardust < 20) {
                    return i.reply({ content: '❌ Você precisa de pelo menos 20 Poeira Estelar para forjar!', ephemeral: true });
                }
                p.stardust -= 20;
                const relic = RELICS[Math.floor(Math.random() * RELICS.length)];
                p.relics.push(relic);
                saveData(currentData);

                await i.reply({ content: `✨ **FORJA CONCLUÍDA!** Você obteve: **${relic.name}** [Raridade: ${relic.rarity}]!`, ephemeral: true });
            } 

            else if (i.customId === 'inventory') {
                const list = p.relics.length > 0 
                    ? p.relics.map(r => `- ${r.name} (${r.rarity})`).join('\n') 
                    ? p.relics.map(r => `- ${r.name} (${r.rarity})`).join('\n') 
                    : 'Nenhuma relíquia forjada ainda.';
                
                await i.reply({ content: `📜 **Seu Inventário:**\n${list}`, ephemeral: true });
            }
        });
    }
};
