// ============================================================
// TaskLoop Simulation - Front-end Logic
// ============================================================

let selectedLogoIndex = -1;
let statePollInterval = null;

// ============================================================
// Screens
// ============================================================
function showScreen(screenId) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const screen = document.getElementById(`screen-${screenId}`);
  if (screen) screen.classList.add('active');
}

// Nav buttons
document.querySelectorAll('nav button[data-screen]').forEach(btn => {
  btn.addEventListener('click', () => {
    showScreen(btn.dataset.screen);
  });
});

// ============================================================
// Generate Logos
// ============================================================
async function generateLogos() {
  const input = document.getElementById('business-input');
  const description = input.value.trim();

  if (description.length < 3) {
    alert('Por favor, descreva o negócio (mínimo 3 caracteres).');
    return;
  }

  const btn = document.getElementById('btn-generate');
  const loading = document.getElementById('loading');
  btn.disabled = true;
  loading.classList.remove('hidden');

  try {
    const response = await fetch('/api/generate-logos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Erro ao gerar logomarcas.');
    }

    renderLogos(data.logos, description);
    showScreen('gallery');

  } catch (error) {
    alert(error.message);
  } finally {
    btn.disabled = false;
    loading.classList.add('hidden');
  }
}

// ============================================================
// Render Logos
// ============================================================
function renderLogos(logos, description) {
  document.getElementById('gallery-subtitle').textContent = `Negócio: ${description}`;

  const container = document.getElementById('logos-container');
  container.innerHTML = '';

  logos.forEach((logo, index) => {
    const card = document.createElement('div');
    card.className = 'logo-card';
    card.dataset.index = index;
    card.innerHTML = `
      ${logo.svg}
      <h3>${logo.name}</h3>
      <p>${logo.description}</p>
    `;
    card.addEventListener('click', () => selectLogo(index));
    container.appendChild(card);
  });

  selectedLogoIndex = -1;
  document.getElementById('voting-area').classList.remove('hidden');
  document.getElementById('vote-status').textContent = '👆 Clique em uma logomarca acima para votar';
  document.getElementById('vote-status').className = 'vote-prompt';
}

// ============================================================
// Select Logo
// ============================================================
function selectLogo(index) {
  selectedLogoIndex = index;

  document.querySelectorAll('.logo-card').forEach((card, i) => {
    card.classList.toggle('selected', i === index);
  });

  const status = document.getElementById('vote-status');
  const userName = document.getElementById('user-name').value.trim();

  if (userName.length > 0) {
    status.textContent = `✅ Pronto para votar em "${document.querySelectorAll('.logo-card h3')[index].textContent}"`;
    status.className = 'vote-prompt';
    submitVote(userName, index);
  } else {
    status.textContent = `👍 Logomarca "${document.querySelectorAll('.logo-card h3')[index].textContent}" selecionada. Digite seu nome e clique nela novamente para confirmar.`;
    status.className = 'vote-prompt';
  }
}

// ============================================================
// Submit Vote
// ============================================================
async function submitVote(userName, logoIndex) {
  try {
    const response = await fetch('/api/vote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userName, logoIndex }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Erro ao registrar voto.');
    }

    const status = document.getElementById('vote-status');
    status.textContent = `✅ Voto registrado! Total de ${data.voteCount} voto(s).`;
    status.className = 'vote-prompt';

    // Feedback visual nos cards
    document.querySelectorAll('.logo-card').forEach(card => {
      card.style.pointerEvents = 'none';
      card.style.opacity = '0.6';
    });

    document.getElementById('user-name').disabled = true;

  } catch (error) {
    alert(error.message);
  }
}

// Listen for name input + click on logo
document.getElementById('user-name').addEventListener('input', () => {
  const userName = document.getElementById('user-name').value.trim();
  if (selectedLogoIndex >= 0 && userName.length > 0) {
    submitVote(userName, selectedLogoIndex);
  }
});

// ============================================================
// Admin Panel
// ============================================================
document.getElementById('admin-password').addEventListener('input', async () => {
  const password = document.getElementById('admin-password').value.trim();
  if (password.length === 0) {
    document.getElementById('admin-area').classList.add('hidden');
    return;
  }

  // Try to fetch state as validation
  try {
    const response = await fetch('/api/state');
    if (response.ok) {
      document.getElementById('admin-area').classList.remove('hidden');
      document.getElementById('admin-error').classList.add('hidden');
      startPolling();
    }
  } catch {
    // Ignore
  }
});

async function adminOpenVote() {
  const password = document.getElementById('admin-password').value.trim();
  try {
    const response = await fetch('/api/admin/open', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password, durationMinutes: 5 }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);
    refreshAdmin();
  } catch (error) {
    showAdminError(error.message);
  }
}

async function adminCloseVote() {
  const password = document.getElementById('admin-password').value.trim();
  try {
    const response = await fetch('/api/admin/close', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);
    refreshAdmin();
  } catch (error) {
    showAdminError(error.message);
  }
}

async function refreshAdmin() {
  try {
    const response = await fetch('/api/state');
    const data = await response.json();
    updateAdminUI(data);
  } catch {
    // Ignore
  }
}

function updateAdminUI(data) {
  document.getElementById('stat-total').textContent = data.totalVotes;

  // Timer
  const timerEl = document.getElementById('stat-time');
  if (data.votingOpen && data.votingEndTime) {
    const remaining = data.votingEndTime - Date.now();
    if (remaining > 0) {
      const mins = Math.floor(remaining / 60000);
      const secs = Math.floor((remaining % 60000) / 1000);
      timerEl.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
      document.querySelector('.admin-stats').classList.remove('hidden');
    } else {
      timerEl.textContent = '00:00';
      // Auto-close when timer expires
      adminCloseVote();
    }
  } else {
    timerEl.textContent = '--:--';
  }

  // Results
  const resultsContainer = document.getElementById('admin-results');
  resultsContainer.innerHTML = '';

  if (data.results && data.results.length > 0) {
    data.results.forEach(r => {
      const div = document.createElement('div');
      div.className = 'result-item';
      div.innerHTML = `
        ${r.svg}
        <div>
          <strong>${r.name}</strong> - ${r.votes} voto(s)
        </div>
      `;
      resultsContainer.appendChild(div);
    });
  }
}

function showAdminError(msg) {
  const err = document.getElementById('admin-error');
  err.textContent = msg;
  err.classList.remove('hidden');
  setTimeout(() => err.classList.add('hidden'), 5000);
}

function startPolling() {
  if (statePollInterval) clearInterval(statePollInterval);
  statePollInterval = setInterval(refreshAdmin, 3000);
  refreshAdmin();
}

// ============================================================
// Reset
// ============================================================
async function resetAll() {
  try {
    await fetch('/api/reset', { method: 'POST' });
  } catch {}
  if (statePollInterval) {
    clearInterval(statePollInterval);
    statePollInterval = null;
  }
  location.reload();
}

// ============================================================
// Init
// ============================================================
showScreen('welcome');
console.log('🔁 TaskLoop Simulation loaded!');
