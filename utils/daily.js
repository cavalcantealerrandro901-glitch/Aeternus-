const store = require('./store');
const eter = require('./eter');
const xp = require('./xp');
const { getSettings } = require('./settings');

const TIME_ZONE = 'America/Sao_Paulo';
function dateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(date);
  const part = type => parts.find(p => p.type === type)?.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}
function todayKey() { return dateKey(); }
function yesterdayKey() {
  const [year, month, day] = todayKey().split('-').map(Number);
  const d = new Date(Date.UTC(year, month - 1, day - 1, 12));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}
function daysSince(last, today = todayKey()) {
  if (!last || !/^\d{4}-\d{2}-\d{2}$/.test(last)) return Infinity;
  const lastDate = Date.parse(last + 'T12:00:00Z');
  const todayDate = Date.parse(today + 'T12:00:00Z');
  return Math.floor((todayDate - lastDate) / 86400000);
}
function keepsStreak(last, today = todayKey()) {
  const days = daysSince(last, today);
  return days >= 1 && days < 7;
}
function isPartnerGuild(guildId) {
  if (!guildId) return false;
  const partners = store.load('serverPartners.json', {});
  if (partners && typeof partners === 'object' && partners[String(guildId)]) return true;
  return String(process.env.PARTNER_GUILD_IDS || '').split(',').map(id => id.trim()).filter(Boolean).includes(String(guildId));
}
function getInfo(userId) {
  const all = store.load('daily.json', {});
  return all[userId] || { last: null, streak: 0 };
}
function status(userId, guildId) {
  const info = getInfo(userId);
  const today = todayKey();
  const claimed = info.last === today;
  const eco = guildId ? getSettings(guildId).economy : { dailyMin: 5000, dailyMax: 50000 };
  const level = xp.get(userId).level || 0;
  const levelMultiplier = xp.dailyMultiplier(level);
  const partner = isPartnerGuild(guildId);
  return {
    ok: true, claimed, available: !claimed, last: info.last, streak: info.streak || 0,
    nextStreak: claimed
      ? (info.streak || 0)
      : (keepsStreak(info.last, today) ? (info.streak || 0) + 1 : 1),
    dailyMin: eco.dailyMin ?? 5000, dailyMax: eco.dailyMax ?? 50000,
    multiplier: levelMultiplier * (partner ? 2 : 1), levelMultiplier, partner, level,
    balance: eter.get(userId), timezone: TIME_ZONE,
    leftText: claimed ? 'Volte após meia-noite de Brasília.' : null
  };
}
function claim(userId, guildId) {
  const all = store.load('daily.json', {});
  const today = todayKey();
  const info = all[userId] || { last: null, streak: 0 };
  if (info.last === today) return { ok: false, error: 'Daily já coletado hoje. Volte após meia-noite de Brasília.' };

  const streak = keepsStreak(info.last, today) ? (info.streak || 0) + 1 : 1;
  const eco = guildId ? getSettings(guildId).economy : { dailyMin: 5000, dailyMax: 50000 };
  const min = eco.dailyMin ?? 5000;
  const max = Math.max(eco.dailyMax ?? 50000, min);
  const base = min + Math.floor(Math.random() * (max - min + 1));
  const levelMultiplier = xp.dailyMultiplier(xp.get(userId).level || 0);
  const partner = isPartnerGuild(guildId);
  const total = Math.floor(base * levelMultiplier * (partner ? 2 : 1));
  eter.add(userId, total, { reason: 'daily' });
  all[userId] = { last: today, streak };
  store.save('daily.json', all);
  return {
    ok: true, amount: total, base, multiplier: levelMultiplier * (partner ? 2 : 1),
    levelMultiplier, partner, streak, balance: eter.get(userId)
  };
}
module.exports = { todayKey, yesterdayKey, claim, status, getInfo, daysSince, keepsStreak };