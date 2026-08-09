const colorMap = {
    'vermelho': '#FF0000',
    'vermelho claro': '#FF6666',
    'vermelho escuro': '#8B0000',
    'azul': '#0000FF',
    'azul claro': '#38BDF8',
    'azul escuro': '#00008B',
    'verde': '#00FF00',
    'verde claro': '#66FF66',
    'verde escuro': '#006400',
    'amarelo': '#FFFF00',
    'roxo': '#800080',
    'rosa': '#FFC0CB',
    'laranja': '#FFA500',
    'preto': '#000000',
    'branco': '#FFFFFF',
    'cinza': '#808080'
};

module.exports = function resolveColor(inputColor) {
    if (!inputColor) return '#38BDF8';
    
    const cleanInput = inputColor.trim().toLowerCase();

    // Se for nome em português
    if (colorMap[cleanInput]) {
        return colorMap[cleanInput];
    }

    // Se já for formato Hexadecimal (com ou sem #)
    if (/^#?[0-9A-Fa-f]{6}$/.test(cleanInput)) {
        return cleanInput.startsWith('#') ? cleanInput : `#${cleanInput}`;
    }

    return '#38BDF8'; // Cor padrão caso inválida
};
