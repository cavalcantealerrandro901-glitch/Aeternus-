/** Boot do dashboard: partials + dados do servidor */
(async function () {
  if (typeof loadSystemPartials === 'function') {
    await loadSystemPartials();
  }
  // carrega dados do guild depois dos HTML dos sistemas
  const s = document.createElement('script');
  s.src = '/js/guildHome.js';
  document.body.appendChild(s);
})();
