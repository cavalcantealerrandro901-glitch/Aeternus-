// Cole este trecho dentro da sua rota onde os servidores são listados após o login:

const serverListHtml = adminGuilds.length > 0 ? adminGuilds.map(guild => {
    const iconUrl = guild.icon 
        ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=128` 
        : 'https://cdn.discordapp.com/embed/avatars/0.png';

    return `
        <div onclick="window.location.href='/?guildId=${guild.id}'" style="background: var(--card-bg, #1e293b); padding: 20px; border-radius: 16px; display: flex; align-items: center; gap: 20px; border: 1px solid var(--border-color, #334155); width: 100%; max-width: 600px; cursor: pointer; transition: all 0.2s ease; box-shadow: 0 4px 6px rgba(0,0,0,0.1);" onmouseover="this.style.borderColor='#38bdf8'; this.style.transform='translateY(-2px)';" onmouseout="this.style.borderColor='var(--border-color, #334155)'; this.style.transform='translateY(0)';">
            <img src="${iconUrl}" alt="${guild.name}" style="width: 65px; height: 65px; border-radius: 50%; object-fit: cover; border: 2px solid #38bdf8; flex-shrink: 0;">
            <div style="display: flex; flex-direction: column; gap: 6px; overflow: hidden;">
                <span style="font-weight: bold; font-size: 20px; color: var(--text-color, #f8fafc); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${guild.name}</span>
                <span style="font-size: 13px; color: #94a3b8; font-family: monospace;">ID: ${guild.id}</span>
            </div>
        </div>
    `;
}).join('') : '<p style="color: #94a3b8; font-size: 16px;">Nenhum servidor encontrado onde você seja Administrador.</p>';
