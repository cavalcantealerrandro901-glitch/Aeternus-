const mongoose = require('mongoose');

const guildConfigSchema = new mongoose.Schema({
    guildId: { type: String, required: true, unique: true },
    logs: { type: Object, default: {} },
    welcome: { type: Object, default: {} }
}, { timestamps: true });

module.exports = mongoose.model('GuildConfig', guildConfigSchema);
