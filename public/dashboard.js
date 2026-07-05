// ============================================================================
// GankMeDaddy — Web Dashboard JavaScript Controller
// Handles draft layout configuration, API synchronization, and GSI status.
// ============================================================================

let allHeroes = [];
let selectedActiveHero = null; // Hero object
let radiantTeam = [null, null, null, null, null]; // 5 slots for Hero objects
let direTeam = [null, null, null, null, null]; // 5 slots for Hero objects
let selectedHeroForModal = null; // Hero object
let clickedSlotTeam = null;
let clickedSlotIndex = null;

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
  fetchHeroes();
  fetchCurrentMatchup();
  checkConnection();
  setInterval(checkConnection, 3000);
});

// Fetch all heroes list from local GSI API
async function fetchHeroes() {
  try {
    const res = await fetch('/api/heroes');
    allHeroes = await res.json();
    renderHeroGrids();
  } catch (err) {
    console.error('Failed to fetch heroes:', err);
  }
}

// Fetch current synced matchup on page load (preserves state on refresh)
async function fetchCurrentMatchup() {
  try {
    const res = await fetch('/api/matchup');
    const draft = await res.json();
    if (draft) {
      // Find and assign active hero
      if (draft.myHeroId) {
        selectedActiveHero = allHeroes.find(h => h.id === draft.myHeroId) || { id: draft.myHeroId, name: `Hero ${draft.myHeroId}` };
      }

      // Assign Radiant slots
      if (Array.isArray(draft.radiantHeroIds)) {
        draft.radiantHeroIds.forEach((id, idx) => {
          if (id && idx < 5) {
            radiantTeam[idx] = allHeroes.find(h => h.id === id) || { id, name: `Hero ${id}` };
          }
        });
      }

      // Assign Dire slots
      if (Array.isArray(draft.direHeroIds)) {
        draft.direHeroIds.forEach((id, idx) => {
          if (id && idx < 5) {
            direTeam[idx] = allHeroes.find(h => h.id === id) || { id, name: `Hero ${id}` };
          }
        });
      }

      updateUI();
    }
  } catch (err) {
    console.warn('Failed to fetch initial matchup:', err);
  }
}

// Render hero grid by attribute
function renderHeroGrids() {
  const grids = {
    str: document.getElementById('strGrid'),
    agi: document.getElementById('agiGrid'),
    int: document.getElementById('intGrid'),
    uni: document.getElementById('uniGrid')
  };

  // Clear existing content
  Object.values(grids).forEach(g => { if (g) g.innerHTML = ''; });

  // Sort heroes alphabetically
  const sorted = [...allHeroes].sort((a, b) => a.name.localeCompare(b.name));

  sorted.forEach(hero => {
    const grid = grids[hero.attr];
    if (grid) {
      const card = document.createElement('div');
      card.className = 'hero-card';
      card.id = `hero-card-${hero.id}`;
      card.innerText = hero.name;
      card.onclick = () => openHeroOptions(hero);
      grid.appendChild(card);
    }
  });

  updateGridSelectionStates();
}

// Update card highlights in the grid based on current selection
function updateGridSelectionStates() {
  // Reset all
  document.querySelectorAll('.hero-card').forEach(c => {
    c.classList.remove('selected-active', 'selected-radiant', 'selected-dire');
  });

  // Active Hero
  if (selectedActiveHero) {
    const card = document.getElementById(`hero-card-${selectedActiveHero.id}`);
    if (card) card.classList.add('selected-active');
  }

  // Radiant slots
  radiantTeam.forEach(hero => {
    if (hero) {
      const card = document.getElementById(`hero-card-${hero.id}`);
      if (card) card.classList.add('selected-radiant');
    }
  });

  // Dire slots
  direTeam.forEach(hero => {
    if (hero) {
      const card = document.getElementById(`hero-card-${hero.id}`);
      if (card) card.classList.add('selected-dire');
    }
  });
}

// Search and filter heroes list
function filterHeroes() {
  const query = document.getElementById('heroSearch').value.toLowerCase();
  document.querySelectorAll('.hero-card').forEach(card => {
    const name = card.innerText.toLowerCase();
    if (name.includes(query)) {
      card.style.display = 'block';
    } else {
      card.style.display = 'none';
    }
  });
}

// Open modal options for selected hero
function openHeroOptions(hero) {
  selectedHeroForModal = hero;
  document.getElementById('modalHeroName').innerText = hero.name;
  document.getElementById('optionsModal').classList.add('open');
}

// Close options modal
function closeModal() {
  document.getElementById('optionsModal').classList.remove('open');
  selectedHeroForModal = null;
}

// Assign selected hero to Active/Radiant/Dire slot
function assignSelectedHero(type) {
  if (!selectedHeroForModal) return;

  const hero = selectedHeroForModal;
  
  // Clean up existing duplicates across all slots
  removeHeroFromAll(hero.id);

  if (type === 'active') {
    selectedActiveHero = hero;
  } else if (type === 'radiant') {
    // Find first empty Radiant slot or overwrite last slot if full
    const emptyIndex = radiantTeam.indexOf(null);
    if (emptyIndex !== -1) {
      radiantTeam[emptyIndex] = hero;
    } else {
      radiantTeam[4] = hero;
    }
  } else if (type === 'dire') {
    // Find first empty Dire slot or overwrite last slot if full
    const emptyIndex = direTeam.indexOf(null);
    if (emptyIndex !== -1) {
      direTeam[emptyIndex] = hero;
    } else {
      direTeam[4] = hero;
    }
  }

  closeModal();
  updateUI();
}

// Handle click on a Radiant/Dire team slot
function handleSlotClick(team, index) {
  const hero = team === 'radiant' ? radiantTeam[index] : direTeam[index];
  if (!hero) return; // Ignore empty slots

  clickedSlotTeam = team;
  clickedSlotIndex = index;
  document.getElementById('slotHeroName').innerText = hero.name;
  document.getElementById('slotModal').classList.add('open');
}

// Close slot options modal
function closeSlotModal() {
  document.getElementById('slotModal').classList.remove('open');
  clickedSlotTeam = null;
  clickedSlotIndex = null;
}

// Assign active hero from the clicked slot
function assignActiveFromSlot() {
  if (!clickedSlotTeam || clickedSlotIndex === null) return;
  const hero = clickedSlotTeam === 'radiant' ? radiantTeam[clickedSlotIndex] : direTeam[clickedSlotIndex];
  if (hero) {
    selectedActiveHero = hero;
  }
  closeSlotModal();
  updateUI();
}

// Remove the hero from the slot via the modal
function removeHeroFromSlot() {
  if (!clickedSlotTeam || clickedSlotIndex === null) return;
  removeHero(clickedSlotTeam, clickedSlotIndex);
  closeSlotModal();
}

// Remove a hero from a specific team slot
function removeHero(team, index) {
  const hero = team === 'radiant' ? radiantTeam[index] : direTeam[index];
  if (hero) {
    if (selectedActiveHero && selectedActiveHero.id === hero.id) {
      selectedActiveHero = null;
    }
  }
  if (team === 'radiant') {
    radiantTeam[index] = null;
  } else if (team === 'dire') {
    direTeam[index] = null;
  }
  updateUI();
}

// Clear active player hero selection
function clearActiveHero() {
  selectedActiveHero = null;
  updateUI();
}

// Remove hero from all selections if they are chosen in a new role
function removeHeroFromAll(heroId) {
  if (selectedActiveHero && selectedActiveHero.id === heroId) {
    selectedActiveHero = null;
  }
  radiantTeam.forEach((hero, index) => {
    if (hero && hero.id === heroId) {
      radiantTeam[index] = null;
    }
  });
  direTeam.forEach((hero, index) => {
    if (hero && hero.id === heroId) {
      direTeam[index] = null;
    }
  });
}

// Update DOM elements for the teams/slots and grid highlights
function updateUI() {
  // Update Active Hero display
  const activeDisplay = document.getElementById('activeHeroDisplay');
  if (selectedActiveHero) {
    activeDisplay.innerText = selectedActiveHero.name;
    activeDisplay.className = 'active-hero-display filled';
  } else {
    activeDisplay.innerHTML = '<div class="placeholder-text">Click a hero in the grid to select</div>';
    activeDisplay.className = 'active-hero-display';
  }

  // Update Radiant slots
  radiantTeam.forEach((hero, index) => {
    const slot = document.querySelector(`.slot[data-team="radiant"][data-index="${index}"]`);
    if (slot) {
      if (hero) {
        const isActive = selectedActiveHero && selectedActiveHero.id === hero.id;
        slot.innerText = hero.name + (isActive ? ' ⭐ (My Hero)' : '');
        slot.className = 'slot radiant-filled' + (isActive ? ' my-hero-slot' : '');
      } else {
        slot.innerText = 'Empty Slot';
        slot.className = 'slot empty';
      }
    }
  });

  // Update Dire slots
  direTeam.forEach((hero, index) => {
    const slot = document.querySelector(`.slot[data-team="dire"][data-index="${index}"]`);
    if (slot) {
      if (hero) {
        const isActive = selectedActiveHero && selectedActiveHero.id === hero.id;
        slot.innerText = hero.name + (isActive ? ' ⭐ (My Hero)' : '');
        slot.className = 'slot dire-filled' + (isActive ? ' my-hero-slot' : '');
      } else {
        slot.innerText = 'Empty Slot';
        slot.className = 'slot empty';
      }
    }
  });

  updateGridSelectionStates();
}

// POST current matchup configuration to backend Express server
async function syncMatchup() {
  const syncBtn = document.getElementById('syncBtn');
  syncBtn.innerText = 'Syncing...';
  syncBtn.disabled = true;

  const payload = {
    radiantHeroIds: radiantTeam.filter(Boolean).map(h => h.id),
    direHeroIds: direTeam.filter(Boolean).map(h => h.id),
    myHeroId: selectedActiveHero ? selectedActiveHero.id : 0
  };

  try {
    const res = await fetch('/api/matchup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      syncBtn.innerHTML = '✓ Synced Successfully!';
      syncBtn.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
      setTimeout(() => {
        syncBtn.innerHTML = '<span class="btn-glow"></span>Sync Matchup to Coach';
        syncBtn.style.background = '';
        syncBtn.disabled = false;
      }, 2000);
    } else {
      throw new Error('Sync returned error status');
    }
  } catch (err) {
    console.error('Error syncing matchup:', err);
    syncBtn.innerText = '⚠️ Sync Failed';
    syncBtn.style.background = 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)';
    setTimeout(() => {
      syncBtn.innerHTML = '<span class="btn-glow"></span>Sync Matchup to Coach';
      syncBtn.style.background = '';
      syncBtn.disabled = false;
    }, 3000);
  }
}

// Periodically check server GSI health
async function checkConnection() {
  const statusIndicator = document.getElementById('connectionStatus');
  const dot = statusIndicator.querySelector('.status-dot');
  const text = statusIndicator.querySelector('.status-text');

  try {
    const res = await fetch('/health');
    const data = await res.json();
    if (res.ok && data.status === 'ok') {
      dot.className = 'status-dot connected';
      if (data.connected) {
        text.innerText = 'CONNECTED (GAME RUNNING)';
      } else {
        text.innerText = 'CONNECTED (WAITING FOR GAME)';
      }
    } else {
      throw new Error();
    }
  } catch (err) {
    dot.className = 'status-dot disconnected';
    text.innerText = 'DISCONNECTED';
  }
}
