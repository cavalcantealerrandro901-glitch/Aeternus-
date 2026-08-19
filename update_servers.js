const serverListHtml = adminGuilds.length > 0 ? adminGuilds.map(guild => {
    const iconUrl = guild.icon 
        ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=128` 
        : 'https://cdn.discordapp.com/embed/avatars/0.png';

    return `
        <div onclick="window.location.href='/?guildId=${guild.id}'" style="background: var(--card-bg, #ffffff); padding: 18px 22px; border-radius: 16px; display: flex; align-items: center; border: 1px solid var(--border-color, #cbd5e1); width: 100%; max-width: 500px; cursor: pointer; transition: all 0.2s ease; box-shadow: 0 4px 6px rgba(0,0,0,0.05); gap: 15px;" onmouseover="this.style.borderColor='#38bdf8'; this.style.transform='translateY(-2px)';" onmouseout="this.style.borderColor='var(--border-color, #cbd5e1)'; this.style.transform='translateY(0)';">
            <img src="${iconUrl}" alt="${guild.name}" style="width: 55px; height: 55px; border-radius: 50%; object-fit: cover; border: 2px solid #38bdf8; flex-shrink: 0;" onerror="this.src='https://cdn.discordapp.com/embed/avatars/0.png'">
            <div style="display: flex; flex-direction: column; gap: 4px; overflow: hidden;">
                <span style="font-weight: bold; font-size: 18px; color: var(--text-color, #0f172a); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${guild.name}</span>
                <span style="font-size: 12px; color: #64748b; font-family: monospace;">ID: ${guild.id}</span>
            </div>
        </div>
    `;
}).join('') : '<p style="color: #64748b; font-size: 16px;">Nenhum servidor encontrado onde você seja Administrador.</p>';
