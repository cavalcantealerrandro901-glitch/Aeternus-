const renderLogsCategory = require('./categories/logs');
const renderWelcomeCategory = require('./categories/welcome');
const renderUpdatesCategory = require('./categories/updates');
const renderCustomCommandsCategory = require('./categories/customCommands');

module.exports = (guild, userGuilds, user, botUser) => {
    const iconUrl = guild.icon
        ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`
        : 'https://cdn.discordapp.com/embed/avatars/0.png';

    const guildList = userGuilds.map(g => {
        const gIcon = g.icon 
            ? `https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png`
            : 'https://cdn.discordapp.com/embed/avatars/0.png';
        const activeClass = g.id === guild.id ? 'active' : '';
        return `
            <a href="/dashboard/${g.id}" class="sidebar-guild ${activeClass}" title="${g.name}">
                <img src="${gIcon}" alt="${g.name}">
            </a>
        `;
    }).join('');

    return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Gerenciar ${guild.name} - Aeternus</title>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Plus Jakarta Sans', sans-serif; }
        body { background: #0b0f19; color: #f8fafc; min-height: 100vh; display: flex; }
        
        .sidebar { width: 80px; background: #030712; border-right: 1px solid rgba(255,255,255,0.05); display: flex; flex-direction: column; align-items: center; padding: 20px 0; gap: 16px; flex-shrink: 0; }
        .sidebar-guild { width: 48px; height: 48px; border-radius: 16px; overflow: hidden; transition: all 0.2s; border: 2px solid transparent; opacity: 0.7; flex-shrink: 0; }
        .sidebar-guild:hover, .sidebar-guild.active { opacity: 1; border-color: #38bdf8; border-radius: 12px; }
        .sidebar-guild img { width: 100%; height: 100%; object-fit: cover; }

        .main-content { flex: 1; padding: 40px; overflow-y: auto; max-width: 1200px; margin: 0 auto; width: 100%; }
        .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; flex-wrap: wrap; gap: 16px; }
        .guild-title { display: flex; align-items: center; gap: 16px; }
        .guild-title img { width: 64px; height: 64px; border-radius: 20px; border: 2px solid rgba(56, 189, 248, 0.3); }

        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; margin-bottom: 30px; }
        .stat-card { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); padding: 20px; border-radius: 16px; }
        .stat-card span { font-size: 0.85rem; color: #94a3b8; }
        .stat-card h3 { font-size: 1.5rem; color: #38bdf8; margin-top: 4px; }

        .config-card { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 20px; padding: 28px; margin-bottom: 24px; }
        .config-card-header { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; border-bottom: 1px solid rgba(255,255,255,0.06); padding-bottom: 12px; }

        .form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 20px; margin-bottom: 20px; }
        .form-group { display: flex; flex-direction: column; gap: 8px; width: 100%; }
        .form-group label { font-size: 0.85rem; font-weight: 600; color: #cbd5e1; }
        .form-control { background: rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.1); padding: 12px 16px; border-radius: 10px; color: #fff; font-size: 0.95rem; outline: none; width: 100%; box-sizing: border-box; }
        .form-control:focus { border-color: #38bdf8; }

        .btn-save { background: linear-gradient(135deg, #38bdf8, #2563eb); color: #fff; border: none; padding: 12px 24px; border-radius: 12px; font-weight: 700; cursor: pointer; transition: all 0.2s; width: 100%; max-width: 300px; text-align: center; }
        .btn-save:hover { opacity: 0.9; transform: translateY(-1px); }

        /* 📱 Adaptabilidade Responsiva para Celulares */
        @media (max-width: 768px) {
            body { flex-direction: column; }
            .sidebar { 
                width: 100%; 
                height: auto; 
                flex-direction: row; 
                padding: 12px 16px; 
                justify-content: flex-start; 
                border-right: none; 
                border-bottom: 1px solid rgba(255,255,255,0.05); 
                overflow-x: auto; 
            }
            .main-content { padding: 16px; }
            .header { flex-direction: column; align-items: flex-start; }
            .form-grid { grid-template-columns: 1fr !important; }
            .stats-grid { grid-template-columns: 1fr 1fr; }
            .config-card { padding: 18px; }
            .btn-save { max-width: 100%; }
        }
    </style>
</head>
<body>
    <div class="sidebar">
        <a href="/dashboard" class="sidebar-guild" title="Voltar ao Início" style="background: rgba(255,255,255,0.1); display: flex; align-items: center; justify-content: center; font-size: 1.2rem; color: #fff; text-decoration: none;">🏠</a>
        ${guildList}
    </div>

    <div class="main-content">
        <div class="header">
            <div class="guild-title">
                <img src="${iconUrl}" alt="${guild.name}">
                <div>
                    <h1 style="font-size: 1.6rem; font-weight: 800;">${guild.name}</h1>
                    <p style="color: #94a3b8; font-size: 0.85rem;">ID: ${guild.id}</p>
                </div>
            </div>
            <a href="/dashboard" style="color: #94a3b8; text-decoration: none; font-size: 0.85rem; border: 1px solid rgba(255,255,255,0.1); padding: 8px 16px; border-radius: 10px;">← Voltar</a>
        </div>

        <div class="stats-grid">
            <div class="stat-card"><span>👥 Membros</span><h3>${guild.memberCount}</h3></div>
            <div class="stat-card"><span>💬 Canais</span><h3>${guild.channelCount}</h3></div>
            <div class="stat-card"><span>🏷️ Cargos</span><h3>${guild.roleCount}</h3></div>
        </div>

        ${renderLogsCategory(guild)}
        ${renderWelcomeCategory(guild)}
        ${renderUpdatesCategory(guild)}
        ${renderCustomCommandsCategory(guild)}
    </div>
</body>
</html>
    `;
};
