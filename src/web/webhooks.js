const crypto = require('crypto');
const express = require('express');
const db = require('../database/db');
const { decrypt } = require('../bot/utils/cryptoSecrets');

function timingSafeEqual(a, b) {
    try {
        const ba = Buffer.from(a);
        const bb = Buffer.from(b);
        if (ba.length !== bb.length) return false;
        return crypto.timingSafeEqual(ba, bb);
    } catch {
        return false;
    }
}

function verifyGitHubSignature(rawBody, signatureHeader, secret) {
    if (!secret || !signatureHeader) return false;
    const expected =
        'sha256=' +
        crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
    return timingSafeEqual(expected, signatureHeader);
}

async function getSecret(name) {
    if (process.env[name]) return process.env[name];
    try {
        const doc = await db.getEditorConfig();
        const s = (doc.secrets || []).find((x) => x.name === name);
        if (s) return decrypt(s.valueEnc);
    } catch {}
    return null;
}

async function notifyDiscord(payload) {
    const url =
        process.env.DISCORD_DEPLOY_WEBHOOK ||
        (await getSecret('DISCORD_DEPLOY_WEBHOOK'));
    if (!url) return false;
    try {
        await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        return true;
    } catch (err) {
        console.error('Discord webhook falhou:', err.message);
        return false;
    }
}

async function triggerRenderDeploy(reason = 'Aeternus webhook') {
    const hook =
        process.env.RENDER_DEPLOY_HOOK ||
        (await getSecret('RENDER_DEPLOY_HOOK'));
    if (!hook) {
        return { ok: false, error: 'RENDER_DEPLOY_HOOK não configurado' };
    }
    try {
        const res = await fetch(hook, { method: 'POST' });
        const text = await res.text();
        if (!res.ok) return { ok: false, error: text || res.statusText };

        console.log(`🚀 Render deploy disparado (${reason})`);
        await notifyDiscord({
            embeds: [
                {
                    title: '🚀 Deploy disparado',
                    description:
                        'Motivo: **' +
                        reason +
                        '**\nO Render está reconstruindo o serviço Aeternus.',
                    color: 0x7c3aed,
                    timestamp: new Date().toISOString()
                }
            ]
        });
        return { ok: true };
    } catch (err) {
        return { ok: false, error: err.message };
    }
}

function registerWebhooks(app) {
    app.post(
        '/webhooks/github',
        express.raw({ type: 'application/json' }),
        async (req, res) => {
            try {
                const raw =
                    req.body instanceof Buffer
                        ? req.body
                        : Buffer.from(req.body || '');
                const signature = req.headers['x-hub-signature-256'];
                const event = req.headers['x-github-event'];
                const delivery = req.headers['x-github-delivery'];

                const secret =
                    process.env.GITHUB_WEBHOOK_SECRET ||
                    (await getSecret('GITHUB_WEBHOOK_SECRET'));

                if (secret) {
                    if (!verifyGitHubSignature(raw, signature, secret)) {
                        console.warn('⚠️ Webhook GitHub: assinatura inválida');
                        return res.status(401).json({ error: 'Assinatura inválida' });
                    }
                } else {
                    console.warn(
                        '⚠️ GITHUB_WEBHOOK_SECRET ausente — webhook sem verificação'
                    );
                }

                let payload = {};
                try {
                    payload = JSON.parse(raw.toString('utf8') || '{}');
                } catch {
                    return res.status(400).json({ error: 'JSON inválido' });
                }

                console.log(
                    `📦 GitHub webhook: event=${event} delivery=${delivery}`
                );

                if (event === 'ping') {
                    await notifyDiscord({
                        embeds: [
                            {
                                title: '✅ Webhook GitHub conectado',
                                description:
                                    'O Aeternus recebeu o ping do GitHub com sucesso.',
                                color: 0x22c55e,
                                timestamp: new Date().toISOString()
                            }
                        ]
                    });
                    return res.json({ ok: true, message: 'pong' });
                }

                if (event === 'push') {
                    const branch = (payload.ref || '').replace('refs/heads/', '');
                    const repo = payload.repository?.full_name || '?';
                    const pusher =
                        payload.pusher?.name || payload.sender?.login || '?';
                    const commits = payload.commits || [];
                    const head = payload.head_commit;
                    const targetBranch = process.env.DEPLOY_BRANCH || 'main';

                    const commitLines = commits
                        .slice(0, 5)
                        .map((c) => {
                            const id = (c.id || '').slice(0, 7);
                            const msg = (c.message || '').split('\n')[0];
                            return '• `' + id + '` ' + msg;
                        })
                        .join('\n');

                    let description =
                        '**' +
                        repo +
                        '** → `' +
                        branch +
                        '`\nPor: **' +
                        pusher +
                        '**\n';
                    if (head) {
                        description +=
                            'Head: ' +
                            (head.message || '').split('\n')[0] +
                            '\n';
                    }
                    if (commitLines) description += '\n' + commitLines;

                    await notifyDiscord({
                        embeds: [
                            {
                                title: '📥 Push no repositório',
                                description,
                                color: 0x3b82f6,
                                url: head?.url || payload.compare,
                                timestamp: new Date().toISOString(),
                                footer: {
                                    text:
                                        branch === targetBranch
                                            ? 'Deploy automático (Render/Git)'
                                            : 'Branch sem auto-deploy'
                                }
                            }
                        ]
                    });

                    const autoHook = process.env.AUTO_RENDER_ON_PUSH === 'true';
                    if (autoHook && branch === targetBranch) {
                        const result = await triggerRenderDeploy(
                            'push em ' + branch + ' por ' + pusher
                        );
                        if (!result.ok) {
                            console.warn('Render deploy hook:', result.error);
                        }
                    }

                    return res.json({ ok: true, event: 'push', branch });
                }

                if (event === 'workflow_run' && payload.action === 'completed') {
                    const run = payload.workflow_run;
                    const ok = run?.conclusion === 'success';
                    await notifyDiscord({
                        embeds: [
                            {
                                title: ok ? '✅ CI concluído' : '❌ CI falhou',
                                description:
                                    '**' +
                                    (run?.name || 'Workflow') +
                                    '** em ' +
                                    (payload.repository?.full_name || '') +
                                    '\nBranch: ' +
                                    (run?.head_branch || '') +
                                    '\nResultado: **' +
                                    (run?.conclusion || '') +
                                    '**',
                                color: ok ? 0x22c55e : 0xef4444,
                                url: run?.html_url,
                                timestamp: new Date().toISOString()
                            }
                        ]
                    });
                    return res.json({ ok: true });
                }

                return res.json({ ok: true, event, ignored: true });
            } catch (err) {
                console.error('Webhook GitHub erro:', err);
                return res.status(500).json({ error: err.message });
            }
        }
    );

    app.post('/webhooks/deploy', express.json(), async (req, res) => {
        try {
            const token =
                process.env.DEPLOY_WEBHOOK_TOKEN ||
                (await getSecret('DEPLOY_WEBHOOK_TOKEN'));
            const auth =
                req.headers['authorization'] ||
                req.headers['x-deploy-token'] ||
                '';
            const provided = String(auth).replace(/^Bearer\s+/i, '');
            if (token && provided !== token) {
                return res.status(401).json({ error: 'Token inválido' });
            }

            const status = req.body?.status || req.body?.state || 'unknown';
            const service = req.body?.service || req.body?.name || 'Aeternus';
            const message = req.body?.message || '';

            const colors = {
                success: 0x22c55e,
                live: 0x22c55e,
                building: 0xf59e0b,
                failed: 0xef4444,
                error: 0xef4444
            };

            await notifyDiscord({
                embeds: [
                    {
                        title: '🚀 Deploy: ' + status,
                        description:
                            'Serviço: **' + service + '**\n' + message,
                        color:
                            colors[String(status).toLowerCase()] || 0x7c3aed,
                        timestamp: new Date().toISOString()
                    }
                ]
            });

            res.json({ ok: true });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    app.post('/webhooks/trigger-deploy', express.json(), async (req, res) => {
        try {
            const token =
                process.env.DEPLOY_WEBHOOK_TOKEN ||
                (await getSecret('DEPLOY_WEBHOOK_TOKEN'));
            const auth =
                req.headers['authorization'] ||
                req.headers['x-deploy-token'] ||
                '';
            const provided = String(auth).replace(/^Bearer\s+/i, '');
            if (token && provided !== token) {
                return res.status(401).json({ error: 'Token inválido' });
            }
            const result = await triggerRenderDeploy(
                req.body?.reason || 'trigger manual'
            );
            if (!result.ok) return res.status(400).json(result);
            res.json({ ok: true });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    console.log(
        '🔗 Webhooks: /webhooks/github · /webhooks/deploy · /webhooks/trigger-deploy'
    );
}

module.exports = {
    registerWebhooks,
    triggerRenderDeploy,
    notifyDiscord
};
