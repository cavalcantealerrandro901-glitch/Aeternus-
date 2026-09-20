const crypto = require('crypto');
const pvpArena = require('./pvpArena');

/** @type {Map<string, any>} */
const rooms = new Map();
const MAX_CHAT = 40;
const ROOM_TTL_MS = 3 * 60 * 60 * 1000;

function newCode() {
    return crypto.randomBytes(3).toString('hex');
}

function panelBase() {
    return (
        String(process.env.RENDER_EXTERNAL_URL || process.env.PUBLIC_URL || '').replace(
            /\/$/,
            ''
        ) || 'https://aeternus-8hlu.onrender.com'
    );
}

function publicMember(m) {
    if (!m) return null;
    return {
        id: m.id,
        name: m.name,
        level: m.level || 0,
        classId: m.classId || 'guerreiro',
        className: m.className || m.classId,
        emoji: m.emoji || '⚔️',
        photo: m.photo || null,
        online: !!m.online
    };
}

function publicRoom(room, viewerId) {
    if (!room) return null;
    return {
        code: room.code,
        hostId: room.hostId,
        name: room.name || 'Sala RPG',
        members: (room.members || []).map(publicMember),
        chat: (room.chat || []).slice(-MAX_CHAT),
        fightId: room.fightId || null,
        fightUrl: room.fightId
            ? panelBase() +
              '/pvp/' +
              room.fightId +
              (viewerId ? '?as=' + encodeURIComponent(viewerId) : '')
            : null,
        you: viewerId
            ? publicMember(room.members.find((x) => String(x.id) === String(viewerId)))
            : null,
        createdAt: room.createdAt
    };
}

function createRoom(host) {
    const code = newCode();
    const room = {
        code,
        hostId: host.id,
        name: 'Arena · ' + (host.name || 'Aventura'),
        members: [
            {
                id: String(host.id),
                name: host.name || 'Jogador',
                level: host.level || 0,
                classId: host.classId || 'guerreiro',
                className: host.className || 'Guerreiro',
                emoji: host.emoji || '⚔️',
                photo: host.photo || null,
                online: true,
                joinedAt: Date.now()
            }
        ],
        chat: [
            {
                id: 'sys',
                name: 'Sistema',
                text: 'Sala criada. Convide amigos e lutem!',
                at: Date.now(),
                system: true
            }
        ],
        fightId: null,
        createdAt: Date.now()
    };
    rooms.set(code, room);
    setTimeout(() => {
        const r = rooms.get(code);
        if (r && Date.now() - r.createdAt > ROOM_TTL_MS) rooms.delete(code);
    }, ROOM_TTL_MS + 1000);
    return room;
}

function getRoom(code) {
    return rooms.get(String(code || '').toLowerCase()) || rooms.get(String(code || '')) || null;
}

function joinRoom(code, member) {
    const room = getRoom(code);
    if (!room) return { ok: false, error: 'Sala não encontrada ou expirou.' };
    if (room.members.length >= 12) return { ok: false, error: 'Sala cheia (máx. 12).' };
    const id = String(member.id);
    const existing = room.members.find((m) => String(m.id) === id);
    if (existing) {
        existing.online = true;
        existing.name = member.name || existing.name;
        existing.level = member.level ?? existing.level;
        existing.classId = member.classId || existing.classId;
        existing.className = member.className || existing.className;
        existing.emoji = member.emoji || existing.emoji;
        existing.photo = member.photo ?? existing.photo;
    } else {
        room.members.push({
            id,
            name: member.name || 'Jogador',
            level: member.level || 0,
            classId: member.classId || 'guerreiro',
            className: member.className || 'Guerreiro',
            emoji: member.emoji || '⚔️',
            photo: member.photo || null,
            online: true,
            joinedAt: Date.now()
        });
        room.chat.push({
            id: 'sys',
            name: 'Sistema',
            text: (member.name || 'Alguém') + ' entrou na sala.',
            at: Date.now(),
            system: true
        });
        if (room.chat.length > MAX_CHAT) room.chat = room.chat.slice(-MAX_CHAT);
    }
    return { ok: true, room };
}

function leaveRoom(code, userId) {
    const room = getRoom(code);
    if (!room) return { ok: false };
    const id = String(userId);
    const m = room.members.find((x) => String(x.id) === id);
    if (m) m.online = false;
    room.chat.push({
        id: 'sys',
        name: 'Sistema',
        text: (m?.name || 'Jogador') + ' saiu.',
        at: Date.now(),
        system: true
    });
    if (room.chat.length > MAX_CHAT) room.chat = room.chat.slice(-MAX_CHAT);
    return { ok: true, room };
}

function chat(code, userId, text) {
    const room = getRoom(code);
    if (!room) return { ok: false, error: 'Sala não encontrada.' };
    const m = room.members.find((x) => String(x.id) === String(userId));
    if (!m) return { ok: false, error: 'Você não está nesta sala.' };
    const msg = String(text || '').trim().slice(0, 300);
    if (!msg) return { ok: false, error: 'Mensagem vazia.' };
    room.chat.push({
        id: m.id,
        name: m.name,
        text: msg,
        at: Date.now(),
        system: false
    });
    if (room.chat.length > MAX_CHAT) room.chat = room.chat.slice(-MAX_CHAT);
    return { ok: true, room };
}

function updateMemberProfile(code, userId, patch) {
    const room = getRoom(code);
    if (!room) return { ok: false, error: 'Sala não encontrada.' };
    const m = room.members.find((x) => String(x.id) === String(userId));
    if (!m) return { ok: false, error: 'Não está na sala.' };
    if (patch.name) m.name = String(patch.name).slice(0, 32);
    if (patch.photo !== undefined) m.photo = patch.photo;
    return { ok: true, room };
}

function startDuel(opts) {
    const room = getRoom(opts.code);
    if (!room) return { ok: false, error: 'Sala não encontrada.' };
    const aId = String(opts.aId);
    const bId = String(opts.bId);
    const a = room.members.find((m) => String(m.id) === aId);
    const b = room.members.find((m) => String(m.id) === bId);
    if (!a || !b) return { ok: false, error: 'Ambos precisam estar na sala.' };
    if (aId === bId) return { ok: false, error: 'Escolha outro jogador.' };

    const loadFighter = opts.loadFighter;
    if (typeof loadFighter !== 'function') {
        return { ok: false, error: 'Sistema de combate indisponível.' };
    }

    const fa = loadFighter(aId, false);
    const fb = loadFighter(bId, false);
    fa.name = a.name || fa.name;
    fb.name = b.name || fb.name;

    const fight = pvpArena.createArena({
        a: fa,
        b: fb,
        bet: opts.bet || 0,
        channelId: null,
        guildId: null
    });
    room.fightId = fight.id;
    room.chat.push({
        id: 'sys',
        name: 'Sistema',
        text: '⚔️ Duelo: ' + fa.name + ' vs ' + fb.name + ' — abram a arena!',
        at: Date.now(),
        system: true
    });
    if (room.chat.length > MAX_CHAT) room.chat = room.chat.slice(-MAX_CHAT);

    return {
        ok: true,
        room,
        fightId: fight.id,
        urlA: panelBase() + '/pvp/' + fight.id + '?as=' + encodeURIComponent(aId),
        urlB: panelBase() + '/pvp/' + fight.id + '?as=' + encodeURIComponent(bId)
    };
}

function roomUrl(code, userId) {
    const base = panelBase();
    let u = base + '/rpg?room=' + encodeURIComponent(code);
    if (userId) u += '&as=' + encodeURIComponent(userId);
    return u;
}

function hubUrl(userId) {
    const base = panelBase();
    return base + '/rpg' + (userId ? '?as=' + encodeURIComponent(userId) : '');
}

module.exports = {
    rooms,
    createRoom,
    getRoom,
    joinRoom,
    leaveRoom,
    chat,
    updateMemberProfile,
    startDuel,
    publicRoom,
    roomUrl,
    hubUrl,
    panelBase
};
