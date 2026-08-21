const music = require('../utils/musicPlayer');

module.exports = {
    name: 'voiceStateUpdate',
    async execute(oldState, newState) {
        try {
            await music.onVoiceStateUpdate(oldState, newState);
        } catch (e) {
            console.error('[voiceStateUpdate music]', e.message);
        }
    }
};
