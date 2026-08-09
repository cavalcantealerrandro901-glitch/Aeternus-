const express = require('express');
const router = express.Router();
const db = require('../../database/db');

// Rota para salvar o Prefixo via Painel Web
router.post('/guilds/:guildId/prefix', async (req, res) => {
    try {
        const { guildId } = req.params;
        const { prefix } = req.body;

        if (!prefix || prefix.trim().length === 0) {
            return res.status(400).json({ success: false, message: 'O prefixo não pode estar vazio.' });
        }

        if (prefix.length > 5) {
            return res.status(400).json({ success: false, message: 'O prefixo deve ter no máximo 5 caracteres.' });
        }

        // ADICIONADO AWAIT AQUI
        const updated = await db.setGuildConfig(guildId, { prefix: prefix.trim() });
        return res.json({ success: true, prefix: updated.prefix });
    } catch (err) {
        console.error('Erro ao salvar prefixo via API:', err);
        return res.status(500).json({ success: false, message: 'Erro interno ao salvar prefixo.' });
    }
});

// Rota para salvar o Modo Paquerar via Painel Web
router.post('/guilds/:guildId/flirt', async (req, res) => {
    try {
        const { guildId } = req.params;
        const { chance, mode } = req.body;

        // ADICIONADO AWAIT AQUI
        const currentConfig = await db.getGuildConfig(guildId);
        const flirtConfig = {
            ...(currentConfig.flirt || {}),
            chance: parseInt(chance) || 10,
            mode: mode || 'emoji'
        };

        // ADICIONADO AWAIT AQUI
        await db.setGuildConfig(guildId, { flirt: flirtConfig });
        return res.json({ success: true, flirt: flirtConfig });
    } catch (err) {
        console.error('Erro ao salvar paquera via API:', err);
        return res.status(500).json({ success: false, message: 'Erro interno ao salvar paquera.' });
    }
});

module.exports = router;
