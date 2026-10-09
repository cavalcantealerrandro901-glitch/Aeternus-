const media = require('../utils/avatarMedia');

module.exports = {
  setup(client) {
    let lastAvatar = client.user?.avatar || null;
    let running = false;
    async function syncAvatar() {
      if (running || !client.user) return;
      running = true;
      try {
        const names = ['aet_avatar', 'aet_glow', 'aet_purple', 'aet_pulse'];
        const guilds = [...client.guilds.cache.values()];
        for (const guild of guilds) {
          const botMember = guild.members.me;
          if (!botMember?.permissions.has('ManageGuildExpressions')) continue;
          for (const name of names) {
            const emoji = guild.emojis.cache.find(e => e.name === name);
            if (!emoji) continue;
            try {
              const data = name === 'aet_pulse'
                ? await media.animatedEmoji(client)
                : await media.staticEmoji(client, name === 'aet_glow' ? 'glow' : name === 'aet_purple' ? 'purple' : 'normal');
              await guild.emojis.edit(emoji.id, { image: data, reason: 'Avatar do Aeternus alterado: sincronização automática' });
            } catch (e) {
              console.warn('[avatarEmojiSync] Falha em ' + guild.id + '/' + name + ': ' + e.message);
            }
          }
        }
      } finally { running = false; }
    }
    const onUserUpdate = (oldUser, newUser) => {
      if (newUser.id !== client.user?.id || oldUser.avatar === newUser.avatar) return;
      lastAvatar = newUser.avatar || null;
      console.log('[avatarEmojiSync] Avatar alterado; sincronizando emojis gerados...');
      syncAvatar().catch(e => console.error('[avatarEmojiSync]', e));
    };
    client.on('userUpdate', onUserUpdate);
    // Covers an avatar update that happened while the process was offline.
    const interval = setInterval(() => {
      const current = client.user?.avatar || null;
      if (current !== lastAvatar) {
        lastAvatar = current;
        syncAvatar().catch(e => console.error('[avatarEmojiSync]', e));
      }
    }, 5 * 60 * 1000);
    return () => { client.off('userUpdate', onUserUpdate); clearInterval(interval); };
  }
};
