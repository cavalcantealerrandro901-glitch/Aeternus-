const { EmbedBuilder, ChannelType } = require('discord.js');
const rr = require('../utils/reactionRoles');
const store = require('../utils/store');

function getSettings(guildId) {
    const all = store.load('guild_settings.json', {});
    return all[guildId] || {};
}

function setSettings(guildId, patch) {
    const all = store.load('guild_settings.json', {});
    all[guildId] = { ...(all[guildId] || {}), ...patch, updatedAt: Date.now() };
    store.save('guild_settings.json', all);
    return all[guildId];
}

function mountReactionRoutes(app, client, sessionUser) {
    app.get('/api/guild/:id', async (req, res) => {
        if (!sessionUser(req)) return res.status(401).json({ error: 'auth' });
        const guild = client.guilds.cache.get(req.params.id);
        if (!guild) return res.status(404).json({ error: 'Bot não está neste servidor' });

        try {
            await guild.channels.fetch().catch(() => null);
            await guild.roles.fetch().catch(() => null);
        } catch (_) {}

        const channels = guild.channels.cache
            .filter((c) => c.isTextBased?.() && !c.isThread?.())
            .map((c) => ({ id: c.id, name: '#' + c.name }))
            .sort((a, b) => a.name.localeCompare(b.name));

        const catType = ChannelType?.GuildCategory ?? 4;
        const categories = guild.channels.cache
            .filter((c) => c.type === catType)
            .map((c) => ({ id: c.id, name: c.name }))
            .sort((a, b) => a.name.localeCompare(b.name));

        const roles = guild.roles.cache
            .filter((r) => r.id !== guild.id && !r.managed)
            .map((r) => ({ id: r.id, name: r.name }))
            .sort((a, b) => a.name.localeCompare(b.name));

        const settings = getSettings(guild.id);
        try {
            const us = require('../utils/settings');
            if (typeof us.getSettings === 'function') {
                Object.assign(settings, us.getSettings(guild.id) || {});
            }
        } catch (_) {}

        res.json({
            id: guild.id,
            name: guild.name,
            memberCount: guild.memberCount,
            channels,
            categories,
            roles,
            settings,
            reactionRoles: rr.get(guild.id)
        });
    });

    app.get('/api/guild/:id/reaction-roles', (req, res) => {
        if (!sessionUser(req)) return res.status(401).json({ error: 'auth' });
        const guild = client.guilds.cache.get(req.params.id);
        if (!guild) return res.status(404).json({ error: 'not found' });
        res.json({ ok: true, config: rr.get(guild.id) });
    });

    app.post('/api/guild/:id/reaction-roles', (req, res) => {
        if (!sessionUser(req)) return res.status(401).json({ error: 'auth' });
        const guild = client.guilds.cache.get(req.params.id);
        if (!guild) return res.status(404).json({ error: 'not found' });

        const body = req.body || {};
        const prev = rr.get(guild.id);
        const roles = Array.isArray(body.roles)
            ? body.roles
                  .filter((r) => r && r.roleId && r.emoji)
                  .map((r) => ({
                      roleId: String(r.roleId),
                      emoji: String(r.emoji).slice(0, 80),
                      label: String(r.label || 'VIP').slice(0, 40)
                  }))
            : prev.roles || [];

        const cfg = rr.save(guild.id, {
            enabled: body.enabled !== false,
            channelId: body.channelId ? String(body.channelId) : null,
            messageId: prev.messageId || null,
            allowMultiple: !!body.allowMultiple,
            message: body.message
                ? String(body.message).slice(0, 1000)
                : prev.message || 'Reaja com o emoji do VIP que deseja receber.',
            roles
        });
        res.json({ ok: true, config: cfg });
    });

    app.post('/api/guild/:id/reaction-roles/publish', async (req, res) => {
        if (!sessionUser(req)) return res.status(401).json({ error: 'auth' });
        const guild = client.guilds.cache.get(req.params.id);
        if (!guild) return res.status(404).json({ error: 'not found' });

        const cfg = rr.get(guild.id);
        if (!cfg.channelId) return res.status(400).json({ error: 'Defina o canal no painel.' });
        if (!cfg.roles?.length) {
            return res.status(400).json({ error: 'Adicione ao menos um VIP (emoji + cargo).' });
        }

        const channel = await guild.channels.fetch(cfg.channelId).catch(() => null);
        if (!channel || !channel.isTextBased?.()) {
            return res.status(400).json({ error: 'Canal inválido.' });
        }

        const intro =
            (cfg.message && String(cfg.message).trim()) ||
            'Reaja com o emoji do VIP que deseja receber.';
        const lines = [intro, ''];
        for (const r of cfg.roles) {
            const role = guild.roles.cache.get(r.roleId);
            lines.push(
                `${r.emoji} → **${r.label || role?.name || 'VIP'}**${role ? ` (${role})` : ''}`
            );
        }
        lines.push(
            '',
            cfg.allowMultiple
                ? '_Você pode escolher mais de um VIP._'
                : '_Apenas um VIP por vez. Ao escolher outro, o anterior é removido._'
        );

        const emb = new EmbedBuilder()
            .setColor(0xa78bfa)
            .setTitle('Cargos VIP · reação')
            .setDescription(lines.join('\n'))
            .setFooter({ text: 'Aeternus · reaja para receber o cargo' });

        let msg = null;
        if (cfg.messageId) {
            msg = await channel.messages.fetch(cfg.messageId).catch(() => null);
        }
        try {
            if (msg) {
                await msg.edit({ embeds: [emb] });
                try {
                    await msg.reactions.removeAll();
                } catch (_) {}
            } else {
                msg = await channel.send({ embeds: [emb] });
                cfg.messageId = msg.id;
                rr.save(guild.id, cfg);
            }
            for (const r of cfg.roles) {
                try {
                    await msg.react(r.emoji);
                } catch (e) {
                    console.warn('[panel rr] react', r.emoji, e.message);
                }
            }
            res.json({ ok: true, messageId: msg.id, channelId: channel.id });
        } catch (e) {
            res.status(500).json({ error: e.message || 'Falha ao publicar' });
        }
    });
}

module.exports = { mountReactionRoutes, getSettings, setSettings };
