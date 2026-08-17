const express = require('express');
const { settingsDb } = require('../data/db');

const router = express.Router();

router.get('/:guildId', (req, res) => {
    const { guildId } = req.params;
    res.json({ prefix: settingsDb[guildId]?.prefix || '!' });
});

router.post('/:guildId', (req, res) => {
    const { guildId } = req.params;
    const { prefix } = req.body;
    
    if (!settingsDb[guildId]) {
        settingsDb[guildId] = {};
    }
    
    settingsDb[guildId].prefix = prefix;
    res.json({ success: true, prefix });
});

module.exports = router;
