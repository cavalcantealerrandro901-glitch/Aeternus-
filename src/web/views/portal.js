const renderLogsCategory = require('./categories/logs');
const renderWelcomeCategory = require('./categories/welcome');
const renderUpdatesCategory = require('./categories/updates');
const renderCustomCommandsCategory = require('./categories/customCommands');
const renderTicketsCategory = require('./categories/tickets');

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
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>Gerenciar ${guild.name} - Aeternus</title>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Plus Jakarta Sans', sans-serif; }
        
        html, body { 
            background: #0b0f19; 
            color: #f8fafc; 
            min-height: 100vh; 
            width: 100%;
            overflow-x: hidden;
        }

        body { display: flex; flex-direction: row; }

        /* Sidebar para Desktop */
        .sidebar { 
            width: 80px; 
            background: #030712; 
            border-right: 1px solid rgba(255,255,255,0.05); 
            display: flex; 
            flex-direction: column; 
            align-items: center; 
            padding: 20px 0; 
            gap: 16px; 
            flex-shrink: 0; 
            min-height: 100vh;
        }

        .sidebar-guild { 
            width: 48px; 
            height: 48px; 
            border-radius: 16px; 
            overflow: hidden; 
            transition: all 0.2s; 
            border: 2px solid transparent; 
            opacity: 0.7; 
            flex-shrink: 0; 
        }
        .sidebar-guild:hover, .sidebar-guild.active { opacity: 1; border-color: #38bdf8; border-radius: 12px; }
        .sidebar-guild img { width: 100%; height: 100%; object-fit: cover; }

        /* Conteúdo Principal */
        .main-content { 
            flex: 1; 
            padding: 30px; 
            max-width: 1200px; 
            margin: 0 auto; 
            width: 100%; 
            box-sizing: border-box;
        }

        .header { 
            display: flex; 
            justify-content: space-between; 
            align-items: center; 
            margin-bottom: 24px; 
            flex-wrap: wrap; 
            gap: 16px; 
        }
        .guild-title { display: flex; align-items: center; gap: 16px; }
        .guild-title img { width: 56px; height: 56px; border-radius: 16px; border: 2px solid rgba(56, 189, 248, 0.3); }

        .stats-grid { 
            display: grid; 
            grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); 
            gap: 12px; 
            margin-bottom: 24px; 
        }
        .stat-card { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); padding: 16px; border-radius: 14px; }
        .stat-card span { font-size: 0.8rem; color: #94a3b8; }
        .stat-card h3 { font-size: 1.3rem; color: #38bdf8; margin-top: 4px; }

        /* Cards de Configuração */
        .config-card { 
            background: rgba(255,255,255,0.02); 
            border: 1px solid rgba(255,255,255,0.06); 
            border-radius: 16px; 
            padding: 20px; 
            margin-bottom: 20px; 
            width: 100%;
            box-sizing: border-box;
        }

        .config-card-header { 
            display: flex; 
            align-items: center; 
            gap: 12px; 
            margin-bottom: 16px; 
            border-bottom: 1px solid rgba(255,255,255,0.06); 
            padding-bottom: 10px; 
        }
        .config-card-header h2 { font-size: 1.2rem; }

        .form-grid { 
            display: grid; 
            grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); 
            gap: 16px; 
            margin-bottom: 16px; 
            width: 100%;
        }

        .form-group { display: flex; flex-direction: column; gap: 6px; width: 100%; box-sizing: border-box; }
        .form-group label { font-size: 0.85rem; font-weight: 600; color: #cbd5e1; }
        
        .form-control { 
            background: rgba(0,0,0,0.4); 
            border: 1px solid rgba(255,255,255,0.1); 
            padding: 10px 14px; 
            border-radius: 8px; 
            color: #fff; 
            font-size: 0.9rem; 
            outline: none; 
            width: 100%; 
            box-sizing: border-box; 
        }
        .form-control:focus { border-color: #38bdf8; }

        .btn-save { 
            background: linear-gradient(135deg, #38bdf8, #2563eb); 
            color: #fff; 
            border: none; 
            padding: 12px 20px; 
            border-radius: 10px; 
            font-weight: 700; 
            cursor: pointer; 
            transition: all 0.2s; 
            text-align: center;
            font-size: 0.9rem;
            display: inline-block;
            width: auto;
        }
        .btn-save:hover { opacity: 0.9; }

        /* 📱 Ajustes Exclusivos para Celular / Mobile */
        @media (max-width: 768px) {
            body { flex-direction: column; }
            
            .sidebar { 
                width: 100%; 
                min-height: auto; 
                height: 64px;
                flex-direction: row; 
                padding: 0 16px; 
                justify-content: flex-start; 
                border-right: none; 
                border-bottom: 1px solid rgba(255,255,255,0.08); 
                overflow-x: auto; 
                overflow-y: hidden;
                white-space: nowrap;
                position: sticky;
                top: 0;
                z-index: 100;
                background: #030712;
                -webkit-overflow-scrolling: touch;
            }

            .sidebar-guild {
                width: 40px;
                height: 40px;
                border-radius: 12px;
            }

            .main-content { padding: 16px 12px; }

            .header { 
                flex-direction: row; 
                align-items: center; 
                justify-content: space-between; 
                margin-bottom: 16px;
            }
            
            .guild-title img { width: 44px; height: 44px; }
            .guild-title h1 { font-size: 1.2rem !important; }

            .form-grid { 
                grid-template-columns: 1fr !important; 
            }

            .stats-grid { 
                grid-template-columns: repeat(3, 1fr); 
                gap: 8px;
            }

            .stat-card { padding: 10px; text-align: center; }
            .stat-card span { font-size: 0.75rem; }
            .stat-card h3 { font-size: 1.1rem; }

            .config-card { padding: 14px; border-radius: 12px; }

            .btn-save { 
                width: 100% !important; 
                box-sizing: border-box;
                padding: 12px;
            }
        }
    </style>
</head>
<body>
    <div class="sidebar">
        <a href="/dashboard" class="sidebar-guild" title="Voltar ao Início" style="background: rgba(255,255,255,0.1); display: flex; align-items: center; justify-content: center; font-size: 1.1rem; color: #fff; text-decoration: none;">🏠</a>
        ${guildList}
    </div>

    <div class="main-content">
        <div class="header">
            <div class="guild-title">
                <img src="${iconUrl}" alt="${guild.name}">
                <div>
                    <h1 style="font-size: 1.5rem; font-weight: 800;">${guild.name}</h1>
                    <p style="color: #94a3b8; font-size: 0.8rem;">ID: ${guild.id}</p>
                </div>
            </div>
            <a href="/dashboard" style="color: #94a3b8; text-decoration: none; font-size: 0.8rem; border: 1px solid rgba(255,255,255,0.1); padding: 6px 12px; border-radius: 8px;">← Voltar</a>
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
        ${renderTicketsCategory(guild)}
    </div>
</body>
</html>
    `;
};
