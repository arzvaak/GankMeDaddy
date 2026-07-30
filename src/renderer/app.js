const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];

if (!window.gank && new URLSearchParams(window.location.search).has('preview')) {
  const previewConfig = {
    steamAccountId: 0, enabledHeroIds: [126, 35, 11, 106, 17, 114, 39, 22, 145],
    aggressionLevel: 8, voiceEnabled: true, voiceRate: 1, voiceVolume: 80,
    dota2Path: 'C:\\Program Files (x86)\\Steam\\steamapps\\common\\dota 2 beta',
    gsiPort: 3001, position: 'mid', launchOptionsConfirmed: false, onboardingComplete: false,
  };
  const previewData = {
    config: previewConfig,
    state: { running: false, gsiConnected: false, inMatch: false, heroId: null, heroName: null, status: 'Setup required', error: null, startedAt: null },
    tokenConfigured: false,
    requirements: { token: false, steam: false, dotaPath: true, gsi: false, launchOptions: false, ready: false },
    appVersion: '1.1.0-preview',
    heroes: [
      [126, 'Void Spirit', 'uni', 'mid'], [35, 'Sniper', 'agi', 'mid'], [11, 'Shadow Fiend', 'agi', 'mid'], [106, 'Ember Spirit', 'agi', 'mid'],
      [5, 'Crystal Maiden', 'int', 'pos5'], [31, 'Lich', 'int', 'pos5'], [30, 'Witch Doctor', 'int', 'pos5'], [37, 'Warlock', 'int', 'pos5'],
      [86, 'Rubick', 'int', 'pos4'], [26, 'Lion', 'int', 'pos4'], [123, 'Hoodwink', 'agi', 'pos4'], [107, 'Earth Spirit', 'str', 'pos4'],
      [2, 'Axe', 'str', 'pos3'], [29, 'Tidehunter', 'str', 'pos3'], [16, 'Sand King', 'uni', 'pos3'], [129, 'Mars', 'str', 'pos3'],
      [44, 'Phantom Assassin', 'agi', 'pos1'], [41, 'Faceless Void', 'agi', 'pos1'], [67, 'Spectre', 'agi', 'pos1'], [8, 'Juggernaut', 'agi', 'pos1'],
    ].map(([id, name, attr, role]) => ({ id, name, attr, role })),
  };
  window.gank = {
    bootstrap: async () => previewData, refresh: async () => previewData,
    start: async () => ({ ...previewData.state, running: true, status: 'Ready — waiting for Dota 2' }), stop: async () => previewData.state,
    testVoice: async () => undefined, setupGSI: async () => 'Preview GSI configuration',
    updateConfig: async partial => Object.assign(previewConfig, partial), setPosition: async role => Object.assign(previewConfig, { position: role }),
    toggleHero: async heroId => { previewConfig.enabledHeroIds = previewConfig.enabledHeroIds.includes(heroId) ? previewConfig.enabledHeroIds.filter(id => id !== heroId) : [...previewConfig.enabledHeroIds, heroId]; return previewConfig; },
    chooseDotaPath: async () => previewConfig.dota2Path, saveSetup: async () => previewData, copyText: () => undefined,
    onState: () => undefined, onSnapshot: () => undefined, onActivity: () => undefined,
  };
}

const appState = {
  bootstrap: null,
  runtime: null,
  config: null,
  filter: 'all',
  search: '',
  activities: [],
  wizardStep: 0,
};

const requirementMeta = [
  ['token', 'STRATZ', 'key-round'],
  ['steam', 'Steam ID', 'user-round'],
  ['dotaPath', 'Dota folder', 'folder-check'],
  ['gsi', 'GSI config', 'radio-tower'],
  ['launchOptions', 'Launch option', 'terminal'],
];

function icons() {
  if (window.lucide) window.lucide.createIcons({ attrs: { 'aria-hidden': 'true' } });
}

function toast(message) {
  const element = $('#toast');
  element.innerHTML = '<i data-lucide="circle-check"></i><span></span>';
  element.querySelector('span').textContent = message;
  element.classList.add('show');
  icons();
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => element.classList.remove('show'), 2800);
}

function setPage(page) {
  const labels = {
    overview: ['COMMAND CENTER', 'Overview'],
    heroes: ['STRATEGY MODULES', 'Hero pool'],
    setup: ['GET MATCH-READY', 'Guided setup'],
  };
  $$('.nav-item').forEach(item => item.classList.toggle('active', item.dataset.page === page));
  $$('.page').forEach(section => section.classList.toggle('active', section.id === `page-${page}`));
  $('#page-eyebrow').textContent = labels[page][0];
  $('#page-title').textContent = labels[page][1];
  window.scrollTo(0, 0);
}

function goToSetup(step) {
  setPage('setup');
  if (Number.isInteger(step)) setWizardStep(step);
}

function renderRuntime(runtime) {
  appState.runtime = runtime;
  const dotClass = runtime.inMatch ? 'status-dot live' : runtime.running ? 'status-dot online' : 'status-dot';
  $('#side-status-dot').className = dotClass;
  $('#top-status-dot').className = dotClass;
  $('#side-status').textContent = runtime.inMatch ? 'Live match' : runtime.running ? 'Coach online' : 'Coach offline';
  $('#side-status-copy').textContent = runtime.status;
  $('#top-status').textContent = runtime.inMatch ? 'In match' : runtime.running ? 'Listening' : 'Offline';
  $('#coach-toggle').innerHTML = `<i data-lucide="${runtime.running ? 'square' : 'play'}"></i><span>${runtime.running ? 'Stop coach' : 'Start coach'}</span>`;
  $('#coach-toggle').classList.toggle('running', runtime.running);
  $('#listener-state').textContent = runtime.gsiConnected ? 'Dota connected' : runtime.running ? 'Listening' : 'Standby';
  $('#match-label').textContent = runtime.inMatch ? 'MATCH IN PROGRESS' : runtime.gsiConnected ? 'DOTA CONNECTED' : runtime.running ? 'COACH ONLINE' : 'READY CHECK';
  $('#match-heading').textContent = runtime.heroName || (runtime.running ? 'Waiting for Dota 2' : 'Your match. A clearer plan.');
  $('#match-copy').textContent = runtime.error || (runtime.inMatch
    ? 'Live telemetry is flowing. You’ll hear focused cues as the match develops.'
    : runtime.running
      ? 'The local listener is ready. Launch Dota 2 and enter a match to connect.'
      : 'Get calm, role-aware voice cues from draft through the final push—all powered by live local telemetry.');
  icons();
}

function renderConfig(config) {
  appState.config = config;
  $$('#role-grid button').forEach(button => button.classList.toggle('active', button.dataset.role === config.position));
  $('#voice-enabled').checked = config.voiceEnabled;
  $('#volume').value = config.voiceVolume;
  $('#volume-output').textContent = `${config.voiceVolume}%`;
  $('#aggression').value = config.aggressionLevel;
  $('#aggression-output').textContent = `${config.aggressionLevel} / 10`;
  $('#steam-id').value = config.steamAccountId || '';
  $('#dota-path').value = config.dota2Path || '';
  $('#launch-confirmed').checked = Boolean(config.launchOptionsConfirmed);
  $('#gsi-location').textContent = config.dota2Path
    ? `${config.dota2Path}\\game\\dota\\cfg\\gamestate_integration`
    : 'Waiting for a valid Dota folder';
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

function renderReadiness() {
  const requirements = appState.bootstrap.requirements;
  const complete = requirementMeta.filter(([key]) => requirements[key]).length;
  const percent = complete * 20;
  const remaining = 5 - complete;
  $('#readiness-percent').textContent = `${percent}%`;
  $('#readiness-ring-value').style.strokeDashoffset = String(106.8 - (106.8 * percent / 100));
  $('#readiness-title').textContent = requirements.ready ? 'You’re ready for a match' : `${remaining} setup ${remaining === 1 ? 'item' : 'items'} remaining`;
  $('#readiness-copy').textContent = requirements.ready ? 'Start the coach, then launch Dota 2.' : 'The guided setup explains each one.';
  $('#requirement-chips').innerHTML = requirementMeta.map(([key, label, icon]) => `<span class="requirement-chip ${requirements[key] ? 'done' : ''}"><i data-lucide="${requirements[key] ? 'check' : icon}"></i>${label}</span>`).join('');
  $('#setup-progress-copy').textContent = `${complete} of 5 ready`;
  $('#setup-progress-bar').style.width = `${percent}%`;
  $('#nav-setup-badge').textContent = remaining;
  $('#nav-setup-badge').hidden = requirements.ready;
  renderWizardStatus();
  renderFinalChecks();
  icons();
}

function renderWizardStatus() {
  if (!appState.bootstrap) return;
  const r = appState.bootstrap.requirements;
  const stepComplete = [true, r.token, r.steam && r.dotaPath, r.gsi, r.launchOptions, r.ready];
  $$('#wizard-steps button').forEach(button => {
    const step = Number(button.dataset.step);
    button.classList.toggle('active', step === appState.wizardStep);
    button.classList.toggle('complete', stepComplete[step]);
  });
}

function renderFinalChecks() {
  if (!appState.bootstrap) return;
  const r = appState.bootstrap.requirements;
  $('#final-checks').innerHTML = requirementMeta.map(([key, label]) => `<div class="final-check ${r[key] ? 'done' : ''}"><i data-lucide="${r[key] ? 'check-circle-2' : 'circle-dashed'}"></i><span>${label}</span></div>`).join('');
  $('#finish-title').textContent = r.ready ? 'Everything is in place.' : 'Let’s make sure everything is connected.';
  $('#finish-copy').textContent = r.ready ? 'Run a voice test, finish setup, then launch Dota 2. The connection badge will light up after the first telemetry update.' : 'Complete the missing items, then come back for a final voice test.';
  $('#finish-setup').disabled = !r.ready;
}

function roleName(role) {
  return { pos1: 'Carry', mid: 'Mid', pos3: 'Offlane', pos4: 'Soft support', pos5: 'Hard support' }[role] || role;
}

function roleIcon(role) {
  return { pos1: 'swords', mid: 'wand-sparkles', pos3: 'shield', pos4: 'footprints', pos5: 'heart-handshake' }[role] || 'shield';
}

function renderHeroes() {
  if (!appState.bootstrap || !appState.config) return;
  const enabled = new Set(appState.config.enabledHeroIds);
  const heroes = appState.bootstrap.heroes.filter(hero => {
    const matchesRole = appState.filter === 'all' || hero.role === appState.filter;
    return matchesRole && hero.name.toLowerCase().includes(appState.search.toLowerCase());
  });
  $('#hero-count').textContent = appState.bootstrap.heroes.filter(hero => enabled.has(hero.id)).length;
  $('#hero-grid').innerHTML = heroes.map(hero => `
    <button class="hero-card ${enabled.has(hero.id) ? 'enabled' : ''}" data-hero-id="${hero.id}">
      <span class="hero-avatar"><i data-lucide="${roleIcon(hero.role)}"></i></span>
      <span class="hero-info"><strong>${escapeHtml(hero.name)}</strong><span>${roleName(hero.role)} · ${hero.attr}</span></span>
      <span class="hero-check"><i data-lucide="check"></i></span>
    </button>`).join('');
  $$('#hero-grid .hero-card').forEach(card => card.addEventListener('click', async () => {
    const config = await window.gank.toggleHero(Number(card.dataset.heroId));
    renderConfig(config);
  }));
  icons();
}

function addActivity(message, timestamp = Date.now()) {
  appState.activities.unshift({ message, timestamp });
  appState.activities = appState.activities.slice(0, 30);
  renderActivities();
}

function renderActivities() {
  const list = $('#activity-list');
  if (!appState.activities.length) {
    list.innerHTML = '<div class="empty-state"><i data-lucide="radio-tower"></i><strong>No signals yet</strong><p>Connection and coaching events will appear here.</p></div>';
  } else {
    list.innerHTML = appState.activities.map(item => `<div class="activity-item"><i></i><p>${escapeHtml(item.message)}</p><time>${new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time></div>`).join('');
  }
  icons();
}

function escapeHtml(value) {
  const div = document.createElement('div');
  div.textContent = String(value);
  return div.innerHTML;
}

function setWizardStep(step) {
  appState.wizardStep = Math.max(0, Math.min(5, step));
  $$('.tutorial-step').forEach(panel => panel.classList.toggle('active', Number(panel.dataset.stepPanel) === appState.wizardStep));
  $('#wizard-position').textContent = `Step ${appState.wizardStep + 1} of 6`;
  $('#wizard-back').style.visibility = appState.wizardStep === 0 ? 'hidden' : 'visible';
  $('#wizard-next').style.visibility = appState.wizardStep === 5 ? 'hidden' : 'visible';
  $('#wizard-next span').textContent = appState.wizardStep === 0 ? 'Begin setup' : 'Continue';
  renderWizardStatus();
}

async function refresh() {
  const data = await window.gank.refresh();
  appState.bootstrap = data;
  renderConfig(data.config);
  renderRuntime(data.state);
  renderReadiness();
  $('#token-help').textContent = data.tokenConfigured ? 'A token is already protected. Leave this blank to keep it.' : 'Your token will be protected with Windows encryption after saving.';
  return data;
}

async function saveConnectionSettings() {
  const result = await window.gank.saveSetup({
    token: $('#stratz-token').value,
    steamAccountId: Number($('#steam-id').value),
    dota2Path: $('#dota-path').value,
    gsiPort: appState.config.gsiPort || 3001,
  });
  appState.bootstrap = result;
  $('#stratz-token').value = '';
  renderConfig(result.config);
  renderRuntime(result.state);
  renderReadiness();
  return result;
}

async function continueWizard() {
  const message = $('#form-message');
  message.textContent = '';
  try {
    if (appState.wizardStep === 1) {
      if (!appState.bootstrap.requirements.token && !$('#stratz-token').value.trim()) {
        message.textContent = 'Paste a STRATZ token before continuing.';
        return;
      }
      await saveConnectionSettings();
      if (!appState.bootstrap.requirements.token) {
        message.textContent = 'The token could not be secured. Please try again.';
        return;
      }
    }
    if (appState.wizardStep === 2) {
      if (!Number($('#steam-id').value)) {
        message.textContent = 'Enter the numeric account ID from your STRATZ player URL.';
        return;
      }
      if (!$('#dota-path').value.trim()) {
        message.textContent = 'Choose your Dota 2 installation folder.';
        return;
      }
      await saveConnectionSettings();
      if (!appState.bootstrap.requirements.dotaPath) {
        message.textContent = 'That folder does not contain game\\dota. Choose the “dota 2 beta” folder.';
        return;
      }
    }
    if (appState.wizardStep === 3 && !appState.bootstrap.requirements.gsi) {
      message.textContent = 'Install the GSI config before continuing.';
      return;
    }
    if (appState.wizardStep === 4 && !$('#launch-confirmed').checked) {
      message.textContent = 'Confirm that you added the Steam launch option.';
      return;
    }
    setWizardStep(appState.wizardStep + 1);
  } catch (error) {
    message.textContent = error.message;
  }
}

function bindEvents() {
  $$('.nav-item').forEach(button => button.addEventListener('click', () => setPage(button.dataset.page)));
  $$('[data-go-setup]').forEach(button => button.addEventListener('click', () => goToSetup()));
  $$('#wizard-steps button').forEach(button => button.addEventListener('click', () => setWizardStep(Number(button.dataset.step))));
  $('#wizard-back').addEventListener('click', () => setWizardStep(appState.wizardStep - 1));
  $('#wizard-next').addEventListener('click', continueWizard);
  $('#coach-toggle').addEventListener('click', async () => {
    try {
      if (!appState.runtime.running && !appState.bootstrap.requirements.ready) {
        goToSetup();
        toast('Finish the guided setup before starting the coach.');
        return;
      }
      renderRuntime(appState.runtime.running ? await window.gank.stop() : await window.gank.start());
    } catch (error) { toast(error.message); }
  });
  $$('#role-grid button').forEach(button => button.addEventListener('click', async () => renderConfig(await window.gank.setPosition(button.dataset.role))));
  $('#voice-enabled').addEventListener('change', async event => renderConfig(await window.gank.updateConfig({ voiceEnabled: event.target.checked })));
  $('#volume').addEventListener('input', event => $('#volume-output').textContent = `${event.target.value}%`);
  $('#volume').addEventListener('change', async event => renderConfig(await window.gank.updateConfig({ voiceVolume: Number(event.target.value) })));
  $('#aggression').addEventListener('input', event => $('#aggression-output').textContent = `${event.target.value} / 10`);
  $('#aggression').addEventListener('change', async event => renderConfig(await window.gank.updateConfig({ aggressionLevel: Number(event.target.value) })));
  for (const id of ['test-voice', 'finish-test-voice']) {
    $(`#${id}`).addEventListener('click', async () => { await window.gank.testVoice(); toast('Voice test sent. You should hear the coach now.'); });
  }
  $('#clear-activity').addEventListener('click', () => { appState.activities = []; renderActivities(); });
  $('#hero-search').addEventListener('input', event => { appState.search = event.target.value; renderHeroes(); });
  $$('#hero-filters button').forEach(button => button.addEventListener('click', () => {
    appState.filter = button.dataset.filter;
    $$('#hero-filters button').forEach(candidate => candidate.classList.toggle('active', candidate === button));
    renderHeroes();
  }));
  $('#browse-dota').addEventListener('click', async () => {
    const selected = await window.gank.chooseDotaPath();
    if (selected) {
      $('#dota-path').value = selected;
      $('#gsi-location').textContent = `${selected}\\game\\dota\\cfg\\gamestate_integration`;
    }
  });
  $('#toggle-token').addEventListener('click', () => {
    const input = $('#stratz-token');
    input.type = input.type === 'password' ? 'text' : 'password';
    $('#toggle-token').innerHTML = `<i data-lucide="${input.type === 'password' ? 'eye' : 'eye-off'}"></i>`;
    icons();
  });
  $('#install-gsi').addEventListener('click', async () => {
    const message = $('#form-message');
    try {
      await saveConnectionSettings();
      if (!appState.bootstrap.requirements.dotaPath) {
        message.textContent = 'Choose a valid “dota 2 beta” folder first.';
        setWizardStep(2);
        return;
      }
      const installedPath = await window.gank.setupGSI();
      await refresh();
      message.textContent = '';
      toast(`GSI config installed in ${installedPath}`);
    } catch (error) { message.textContent = `Could not install GSI: ${error.message}`; }
  });
  $('#copy-launch-option').addEventListener('click', () => {
    window.gank.copyText('-gamestateintegration');
    toast('Launch option copied.');
  });
  $('#launch-confirmed').addEventListener('change', async event => {
    await window.gank.updateConfig({ launchOptionsConfirmed: event.target.checked });
    await refresh();
  });
  $('#finish-setup').addEventListener('click', async () => {
    if (!appState.bootstrap.requirements.ready) return;
    await window.gank.updateConfig({ onboardingComplete: true });
    const runtime = await window.gank.start();
    await refresh();
    renderRuntime(runtime);
    setPage('overview');
    toast('Setup complete. The coach is listening for Dota 2.');
  });
}

async function init() {
  bindEvents();
  renderActivities();
  const data = await window.gank.bootstrap();
  appState.bootstrap = data;
  $('#app-version').textContent = `v${data.appVersion}`;
  renderConfig(data.config);
  renderRuntime(data.state);
  renderReadiness();
  setWizardStep(0);
  if (!data.config.onboardingComplete || !data.requirements.ready) setPage('setup');
  window.gank.onState(renderRuntime);
  window.gank.onSnapshot(renderSnapshot);
  window.gank.onActivity(event => addActivity(event.message, event.timestamp));
  icons();
}

init().catch(error => toast(`Could not load app: ${error.message}`));
