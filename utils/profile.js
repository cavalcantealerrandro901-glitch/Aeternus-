const store = require('./store');

function all() {
    return store.load('profiles.json', {});
}

function get(userId) {
    const d = all()[userId] || {};
    return {
        aboutMe: typeof d.aboutMe === 'string' ? d.aboutMe.slice(0, 200) : '',
        layout: d.layout || 'classic'
    };
}

function setAboutMe(userId, text) {
    const data = all();
    const cur = data[userId] || {};
    cur.aboutMe = String(text || '').slice(0, 200);
    data[userId] = cur;
    store.save('profiles.json', data);
    return get(userId);
}

function setLayout(userId, layout) {
    const data = all();
    const cur = data[userId] || {};
    cur.layout = layout || 'classic';
    data[userId] = cur;
    store.save('profiles.json', data);
    return get(userId);
}

module.exports = { get, setAboutMe, setLayout };
