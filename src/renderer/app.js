const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];

const state = {
  bootstrap: null,
  runtime: null,
  config: null,
  filter: 'all',
  search: '',
  activities: [],
};

function toast(message) {
  const element = $('#toast');
  element.textContent = message;
  element.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => element.classList.remove('show'), 2600);
}

function setPage(page) {
  const labels = {
    overview: ['COMMAND CENTER', 'Overview'],
    heroes: ['STRATEGY MODULES', 'Hero pool'],
    setup: ['CONNECTION', 'Setup'],
  };
  $$('.nav-item').forEach(item => item.classList.toggle('active', item.dataset.page === page));
  $$('.page').forEach(section => section.classList.toggle('active', section.id === `page-${page}`));
  $('#page-eyebrow').textContent = labels[page][0];
  $('#page-title').textContent = labels[page][1];
}

function renderRuntime(runtime) {
  state.runtime = runtime;
  const dotClass = runtime.inMatch ? 'status-dot live' : runtime.running ? 'status-dot online' : 'status-dot';
  $('#side-status-dot').className = dotClass;
  $('#top-status-dot').className = dotClass;
  $('#side-status').textContent = runtime.inMatch ? 'Live match' : runtime.running ? 'Coach online' : 'Coach offline';
  $('#side-status-copy').textContent = runtime.status;
  $('#top-status').textContent = runtime.inMatch ? 'In match' : runtime.running ? 'Listening' : 'Offline';
  $('#coach-toggle').textContent = runtime.running ? 'Stop coach' : 'Start coach';
  $('#coach-toggle').classList.toggle('running', runtime.running);
  $('#match-label').textContent = runtime.inMatch ? 'MATCH IN PROGRESS' : runtime.gsiConnected ? 'DOTA CONNECTED' : runtime.running ? 'COACH ONLINE' : 'READY CHECK';
  $('#match-heading').textContent = runtime.heroName || (runtime.running ? 'Waiting for Dota 2' : 'Your live coach is offline');
  $('#match-copy').textContent = runtime.error || (runtime.inMatch
    ? 'Live telemetry is flowing. Coaching recommendations will be delivered as the match develops.'
    : runtime.running
      ? 'The local GSI listener is ready. Launch Dota 2 and enter a match to connect.'
      : 'Start the coach when you are ready. It will keep running quietly in the system tray.');
}

function renderConfig(config) {
  state.config = config;
  $$('#role-grid button').forEach(button => button.classList.toggle('active', button.dataset.role === config.position));
  $('#voice-enabled').checked = config.voiceEnabled;
  $('#volume').value = config.voiceVolume;
  $('#volume-output').textContent = `${config.voiceVolume}%`;
  $('#aggression').value = config.aggressionLevel;
  $('#aggression-output').textContent = `${config.aggressionLevel} / 10`;
  $('#steam-id').value = config.steamAccountId || '';
  $('#dota-path').value = config.dota2Path || '';
  $('#gsi-port').value = config.gsiPort || 3001;
  renderHeroes();
}

function renderSnapshot(snapshot) {
  const hp = Math.max(0, Math.min(100, Math.round(snapshot.hero.healthPercent || 0)));
  const mana = Math.max(0, Math.min(100, Math.round(snapshot.hero.manaPercent || 0)));
  $('#metric-health').textContent = `${Math.round(snapshot.hero.health)} / ${Math.round(snapshot.hero.maxHealth)}`;
  $('#metric-mana').textContent = `${Math.round(snapshot.hero.mana)} / ${Math.round(snapshot.hero.maxMana)}`;
  $('#health-meter').style.width = `${hp}%`;
  $('#mana-meter').style.width = `${mana}%`;
  $('#metric-kda').textContent = `${snapshot.player.kills} / ${snapshot.player.deaths} / ${snapshot.player.assists}`;
  $('#metric-lh').textContent = snapshot.player.lastHits;
  $('#metric-gpm').textContent = `${snapshot.player.gpm} GPM · Level ${snapshot.hero.level}`;
}

function roleName(role) {
  return { pos1: 'Carry', mid: 'Mid', pos3: 'Offlane', pos4: 'Soft support', pos5: 'Hard support' }[role] || role;
}

function renderHeroes() {
  if (!state.bootstrap || !state.config) return;
  const enabled = new Set(state.config.enabledHeroIds);
  const heroes = state.bootstrap.heroes.filter(hero => {
    const matchesRole = state.filter === 'all' || hero.role === state.filter;
    const matchesSearch = hero.name.toLowerCase().includes(state.search.toLowerCase());
    return matchesRole && matchesSearch;
  });
  $('#hero-count').textContent = state.bootstrap.heroes.filter(hero => enabled.has(hero.id)).length;
  $('#hero-grid').innerHTML = heroes.map(hero => `
    <button class="hero-card ${enabled.has(hero.id) ? 'enabled' : ''}" data-hero-id="${hero.id}">
      <span class="hero-avatar">${hero.name.split(/\s+/).map(word => word[0]).slice(0, 2).join('')}</span>
      <span class="hero-info"><strong>${hero.name}</strong><span>${roleName(hero.role)} · ${hero.attr}</span></span>
      <span class="hero-check">✓</span>
    </button>`).join('');
  $$('#hero-grid .hero-card').forEach(card => card.addEventListener('click', async () => {
    const config = await window.gank.toggleHero(Number(card.dataset.heroId));
    renderConfig(config);
  }));
}

function addActivity(message, timestamp = Date.now()) {
  state.activities.unshift({ message, timestamp });
  state.activities = state.activities.slice(0, 30);
  renderActivities();
}

function renderActivities() {
  const list = $('#activity-list');
  if (!state.activities.length) {
    list.innerHTML = '<div class="empty-state"><span>⌁</span><strong>No signals yet</strong><p>Connection and coaching events will appear here.</p></div>';
    return;
  }
  list.innerHTML = state.activities.map(item => `<div class="activity-item"><i></i><p>${escapeHtml(item.message)}</p><time>${new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time></div>`).join('');
}

function escapeHtml(value) {
  const div = document.createElement('div');
  div.textContent = String(value);
  return div.innerHTML;
}

function bindEvents() {
  $$('.nav-item').forEach(button => button.addEventListener('click', () => setPage(button.dataset.page)));
  $('#coach-toggle').addEventListener('click', async () => {
    try {
      const runtime = state.runtime.running ? await window.gank.stop() : await window.gank.start();
      renderRuntime(runtime);
      if (!runtime.running && !state.bootstrap.tokenConfigured) setPage('setup');
    } catch (error) { toast(error.message); }
  });
  $$('#role-grid button').forEach(button => button.addEventListener('click', async () => renderConfig(await window.gank.setPosition(button.dataset.role))));
  $('#voice-enabled').addEventListener('change', async event => renderConfig(await window.gank.updateConfig({ voiceEnabled: event.target.checked })));
  $('#volume').addEventListener('input', event => $('#volume-output').textContent = `${event.target.value}%`);
  $('#volume').addEventListener('change', async event => renderConfig(await window.gank.updateConfig({ voiceVolume: Number(event.target.value) })));
  $('#aggression').addEventListener('input', event => $('#aggression-output').textContent = `${event.target.value} / 10`);
  $('#aggression').addEventListener('change', async event => renderConfig(await window.gank.updateConfig({ aggressionLevel: Number(event.target.value) })));
  $('#test-voice').addEventListener('click', async () => { await window.gank.testVoice(); toast('Voice test sent'); });
  $('#setup-gsi').addEventListener('click', async () => {
    try { const file = await window.gank.setupGSI(); toast(`Installed: ${file}`); }
    catch (error) { toast(`Could not install GSI: ${error.message}`); setPage('setup'); }
  });
  $('#clear-activity').addEventListener('click', () => { state.activities = []; renderActivities(); });
  $('#hero-search').addEventListener('input', event => { state.search = event.target.value; renderHeroes(); });
  $$('#hero-filters button').forEach(button => button.addEventListener('click', () => {
    state.filter = button.dataset.filter;
    $$('#hero-filters button').forEach(candidate => candidate.classList.toggle('active', candidate === button));
    renderHeroes();
  }));
  $('#browse-dota').addEventListener('click', async () => {
    const selected = await window.gank.chooseDotaPath();
    if (selected) $('#dota-path').value = selected;
  });
  $('#setup-form').addEventListener('submit', async event => {
    event.preventDefault();
    const message = $('#form-message');
    message.textContent = 'Saving securely and starting the coach…';
    try {
      const result = await window.gank.saveSetup({
        token: $('#stratz-token').value,
        steamAccountId: Number($('#steam-id').value),
        dota2Path: $('#dota-path').value,
        gsiPort: Number($('#gsi-port').value),
      });
      state.bootstrap = result;
      renderConfig(result.config);
      renderRuntime(result.state);
      $('#stratz-token').value = '';
      $('#token-state').textContent = result.tokenConfigured ? 'Token secured' : 'Token required';
      message.textContent = result.state.error || 'Saved. The coach is ready.';
      if (result.state.running) setTimeout(() => setPage('overview'), 450);
    } catch (error) { message.textContent = error.message; }
  });
}

async function init() {
  bindEvents();
  const data = await window.gank.bootstrap();
  state.bootstrap = data;
  $('#app-version').textContent = `v${data.appVersion}`;
  $('#token-state').textContent = data.tokenConfigured ? 'Token secured' : 'Token required';
  renderConfig(data.config);
  renderRuntime(data.state);
  if (!data.tokenConfigured) setPage('setup');
  window.gank.onState(renderRuntime);
  window.gank.onSnapshot(renderSnapshot);
  window.gank.onActivity(event => addActivity(event.message, event.timestamp));
}

init().catch(error => toast(`Could not load app: ${error.message}`));
