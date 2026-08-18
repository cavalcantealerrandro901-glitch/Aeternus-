// public/js/channels.js

let currentGuildData = null;

async function fetchGuildChannels(guildId) {
    try {
        const response = await fetch(`/api/guild-data/${guildId}`);
        const data = await response.json();
        if (data.error) throw new Error(data.error);
        return data;
    } catch (err) {
        console.error('[Canais] Erro ao buscar canais:', err);
        return null;
    }
}

function getChannelIcon(type) {
    switch (type) {
        case 0: return '💬 #';
        case 2: return '🔊 ';
        case 5: return '📢 #';
        case 13: return '🎙️ ';
        case 15: return '💬 #';
        default: return '📁 #';
    }
}

async function populateChannelSelects(guildId) {
    const targetGuildId = guildId || window.selectedGuildId;
    if (!targetGuildId) return;

    const data = await fetchGuildChannels(targetGuildId);
    if (!data || !Array.isArray(data.allChannels)) return;

    currentGuildData = data;

    const descElement = document.getElementById('guildDescription');
    if (descElement) {
        descElement.textContent = data.description || 'Nenhuma descrição informada.';
    }

    const selects = document.querySelectorAll('.channel-select');

    selects.forEach(select => {
        const filterType = select.getAttribute('data-channel-type') || 'text';
        const currentValue = select.value;

        select.innerHTML = '<option value="">Selecione um canal...</option>';

        const channels = data.allChannels.filter(ch => {
            if (!ch) return false;
            if (filterType === 'text') return ch.isText;
            if (filterType === 'voice') return ch.isVoice;
            return true;
        });

        const categoriesMap = new Map();

        channels.forEach(ch => {
            let catName = 'Outros';
            if (typeof ch.category === 'string' && ch.category.trim() !== '') {
                catName = ch.category;
            } else if (ch.category && typeof ch.category.name === 'string') {
                catName = ch.category.name;
            }

            if (!categoriesMap.has(catName)) {
                categoriesMap.set(catName, []);
            }
            categoriesMap.get(catName).push(ch);
        });

        categoriesMap.forEach((chList, catName) => {
            const group = document.createElement('optgroup');
            group.label = catName;

            chList.forEach(ch => {
                const option = document.createElement('option');
                option.value = ch.id;
                option.textContent = `${getChannelIcon(ch.type)}${ch.name}`;
                group.appendChild(option);
            });

            select.appendChild(group);
        });

        if (currentValue) select.value = currentValue;
    });
}

document.addEventListener('mousedown', (e) => {
    const select = e.target.closest('.channel-select');
    if (!select) return;

    const guildId = window.selectedGuildId;
    if (select.options.length <= 1 && guildId) {
        populateChannelSelects(guildId);
    }
});
