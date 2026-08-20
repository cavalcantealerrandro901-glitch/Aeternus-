const { EmbedBuilder, MessageFlags } = require('discord.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '../../data/economy.json');

// Carrega/Salva o saldo dos usuários
function loadEconomy() {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    if (!fs.existsSync(DB_PATH)) fs.writeFileSync(DB_PATH, JSON.stringify({ users: {} }));
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
}

function saveEconomy(data) {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

function getBalance(userId) {
    const data = loadEconomy();
    return data.users[userId]?.crystals || 500; // Saldo inicial de 500 cristais
}

function updateBalance(userId, amount) {
    const data = loadEconomy();
    if (!data.users[userId]) data.users[userId] = { crystals: 500 };
    data.users[userId].crystals += amount;
    if (data.users[userId].crystals < 0) data.users[userId].crystals = 0;
    saveEconomy(data);
    return data.users[userId].crystals;
}

// Interpretador de valores (all, half, k, m, b, t)
function parseBet(input, userBalance) {
    if (!input) return null;
    const str = input.toLowerCase().trim();

    if (str === 'all' || str === 'tudo') return userBalance;
    if (str === 'half' || str === 'metade') return Math.floor(userBalance / 2);

    // Expressão regular para k, m, b, t (Ex: 5k, 2.5m, 10b, 1t)
    const match = str.match(/^(\d+(\.\d+)?)([kmbt])$/);
    if (match) {
        const val = parseFloat(match[1]);
        const unit = match[3];
        let multiplier = 1;

        if (unit === 'k') multiplier = 1e3;          // Mil
        else if (unit === 'm') multiplier = 1e6;     // Milhão
        else if (unit === 'b') multiplier = 1e9;     // Bilhão
        else if (unit === 't') multiplier = 1e12;    // Trilhão

        return Math.floor(val * multiplier);
    }

    const num = parseInt(str, 10);
    if (!isNaN(num) && num > 0) return num;

    return null;
}

function formatNum(num) {
    return num.toLocaleString('pt-BR');
}

module.exports = {
    getBalance,
    updateBalance,
    parseBet,

    // 🪙 1. COINFLIP (Cara ou Coroa)
    async coinflip(message, args) {
        const userId = message.author.id;
        const balance = getBalance(userId);

        const bet = parseBet(args[0], balance);
        const choice = args[1]?.toLowerCase();

        if (!bet || bet <= 0) {
            return message.reply('❌ Defina um valor válido de aposta! Ex: `!cf 50k cara` ou `!cf all coroa`');
        }

        if (bet > balance) {
            return message.reply(`❌ Saldo insuficiente! Você possui **${formatNum(balance)}** cristais.`);
        }

        if (!choice || !['cara', 'coroa', 'c'].includes(choice)) {
            return message.reply('❌ Escolha **cara** ou **coroa**! Ex: `!cf 10k cara`');
        }

        const userSide = choice.startsWith('c') && choice !== 'coroa' ? 'cara' : choice;
        const outcome = Math.random() < 0.5 ? 'cara' : 'coroa';
        const won = userSide === outcome;

        const newBal = updateBalance(userId, won ? bet : -bet);

        const embed = new EmbedBuilder()
            .setColor(won ? '#2ecc71' : '#e74c3c')
            .setTitle('🪙 Coinflip Aeterno')
            .setDescription(`A moeda girou no ar e caiu em **${outcome.toUpperCase()}**!`)
            .addFields(
                { name: 'Aposta', value: `\`${formatNum(bet)} Cristais\``, inline: true },
                { name: 'Resultado', value: won ? `🎉 **Ganhou +${formatNum(bet)}**` : `💥 **Perdeu -${formatNum(bet)}**`, inline: true },
                { name: 'Novo Saldo', value: `\`${formatNum(newBal)} Cristais\``, inline: true }
            );

        message.reply({ embeds: [embed] });
    },

    // 🎰 2. SLOTS (Caça-Níqueis)
    async slots(message, args) {
        const userId = message.author.id;
        const balance = getBalance(userId);

        const bet = parseBet(args[0], balance);

        if (!bet || bet <= 0) {
            return message.reply('❌ Digite um valor válido! Ex: `!slots 10k`, `!slots half`, `!slots all`');
        }

        if (bet > balance) {
            return message.reply(`❌ Saldo insuficiente! Você tem **${formatNum(balance)}** cristais.`);
        }

        const symbols = ['💎', '⚡', '🌙', '⭐', '7️⃣'];
        const reel1 = symbols[Math.floor(Math.random() * symbols.length)];
        const reel2 = symbols[Math.floor(Math.random() * symbols.length)];
        const reel3 = symbols[Math.floor(Math.random() * symbols.length)];

        let multiplier = 0;
        if (reel1 === reel2 && reel2 === reel3) {
            multiplier = reel1 === '7️⃣' || reel1 === '⭐' ? 10 : 5;
        } else if (reel1 === reel2 || reel2 === reel3 || reel1 === reel3) {
            multiplier = 1.5;
        }

        const won = multiplier > 0;
        const profit = won ? Math.floor(bet * multiplier) - bet : -bet;
        const newBal = updateBalance(userId, profit);

        const embed = new EmbedBuilder()
            .setColor(won ? '#f1c40f' : '#e74c3c')
            .setTitle('🎰 Caça-Níqueis Aeterno')
            .setDescription(`[ ${reel1} | ${reel2} | ${reel3} ]`)
            .addFields(
                { name: 'Aposta', value: `\`${formatNum(bet)}\``, inline: true },
                { name: 'Resultado', value: won ? `🎉 **+${formatNum(profit)} (${multiplier}x)**` : `💥 **-${formatNum(bet)}**`, inline: true },
                { name: 'Novo Saldo', value: `\`${formatNum(newBal)} Cristais\``, inline: true }
            );

        message.reply({ embeds: [embed] });
    },

    // 🎲 3. DADO (Guess 1-6)
    async dice(message, args) {
        const userId = message.author.id;
        const balance = getBalance(userId);

        const bet = parseBet(args[0], balance);
        const guessedNum = parseInt(args[1], 10);

        if (!bet || bet <= 0) {
            return message.reply('❌ Defina o valor da aposta! Ex: `!dado 5k 4`');
        }

        if (bet > balance) {
            return message.reply(`❌ Saldo insuficiente! Você possui **${formatNum(balance)}** cristais.`);
        }

        if (isNaN(guessedNum) || guessedNum < 1 || guessedNum > 6) {
            return message.reply('❌ Escolha um número do dado de **1 a 6**! Ex: `!dado 10k 6`');
        }

        const rolled = Math.floor(Math.random() * 6) + 1;
        const won = rolled === guessedNum;
        const profit = won ? bet * 5 : -bet; // 6x no acerto total (lucro de 5x)

        const newBal = updateBalance(userId, profit);

        const embed = new EmbedBuilder()
            .setColor(won ? '#2ecc71' : '#e74c3c')
            .setTitle('🎲 Dado Aeterno')
            .setDescription(`O dado rolou na mesa e caiu no número **🎲 ${rolled}**!`)
            .addFields(
                { name: 'Seu Palpite', value: `\`${guessedNum}\``, inline: true },
                { name: 'Resultado', value: won ? `🎉 **Acertou! +${formatNum(profit)}**` : `💥 **Errou! -${formatNum(bet)}**`, inline: true },
                { name: 'Novo Saldo', value: `\`${formatNum(newBal)} Cristais\``, inline: true }
            );

        message.reply({ embeds: [embed] });
    },

    // 🎡 4. ROLETA
    async roulette(message, args) {
        const userId = message.author.id;
        const balance = getBalance(userId);

        const bet = parseBet(args[0], balance);
        const option = args[1]?.toLowerCase();

        if (!bet || bet <= 0) {
            return message.reply('❌ Informe a aposta! Ex: `!roleta 20k vermelho` ou `!roleta 1m verde`');
        }

        if (bet > balance) {
            return message.reply(`❌ Saldo insuficiente! Você tem **${formatNum(balance)}** cristais.`);
        }

        if (!option) {
            return message.reply('❌ Escolha onde apostar: **vermelho**, **preto**, **verde** ou um número de **0 a 36**.');
        }

        const rolledNum = Math.floor(Math.random() * 37); // 0 a 36
        let rolledColor = 'preto';
        if (rolledNum === 0) rolledColor = 'verde';
        else if ([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36].includes(rolledNum)) {
            rolledColor = 'vermelho';
        }

        let won = false;
        let mult = 0;

        if (!isNaN(parseInt(option, 10))) {
            const targetNum = parseInt(option, 10);
            if (targetNum === rolledNum) {
                won = true;
                mult = 36; // 36x para número exato
            }
        } else if (['vermelho', 'red'].includes(option) && rolledColor === 'vermelho') {
            won = true;
            mult = 2;
        } else if (['preto', 'black'].includes(option) && rolledColor === 'preto') {
            won = true;
            mult = 2;
        } else if (['verde', 'green'].includes(option) && rolledColor === 'verde') {
            won = true;
            mult = 14; // 14x no zero verde
        }

        const profit = won ? (bet * mult) - bet : -bet;
        const newBal = updateBalance(userId, profit);

        const colorEmoji = rolledColor === 'vermelho' ? '🔴' : rolledColor === 'preto' ? '⚫' : '🟢';

        const embed = new EmbedBuilder()
            .setColor(won ? '#2ecc71' : '#e74c3c')
            .setTitle('🎡 Roleta Aeterna')
            .setDescription(`A roleta parou no número **${colorEmoji} ${rolledNum} (${rolledColor.toUpperCase()})**!`)
            .addFields(
                { name: 'Sua Aposta', value: `\`${option}\` (${formatNum(bet)})`, inline: true },
                { name: 'Resultado', value: won ? `🎉 **Ganhou +${formatNum(profit)} (${mult}x)**` : `💥 **Perdeu -${formatNum(bet)}**`, inline: true },
                { name: 'Novo Saldo', value: `\`${formatNum(newBal)} Cristais\``, inline: true }
            );

        message.reply({ embeds: [embed] });
    }
};
