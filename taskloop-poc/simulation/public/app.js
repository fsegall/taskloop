// ============================================================
// TaskLoop Simulation - Front-end Logic
// ============================================================

let selectedLogoIndex = -1;
let statePollInterval = null;

// ============================================================
// localStorage helpers
// ============================================================
const LS_KEY = 'taskloop_simulation';
function loadLocalState() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '{}'); } catch { return {}; }
}
function saveLocalState(data) {
  localStorage.setItem(LS_KEY, JSON.stringify({ ...loadLocalState(), ...data }));
}
function clearLocalState() {
  localStorage.removeItem(LS_KEY);
}

// ============================================================
// Stellar address validation (client-side, no SDK)
// ============================================================
function isValidStellarAddress(address) {
  return typeof address === 'string' && /^G[A-Z2-7]{55}$/.test(address.trim());
}

// ============================================================
// Init — detectar estado do servidor ao abrir a página
// ============================================================
async function initApp() {
  try {
    const res = await fetch('/api/state');
    const data = await res.json();

    if (data.results && data.results.length > 0) {
      // Logos já existem — esconder seção de criação
      document.getElementById('section-description').classList.add('hidden');
      document.getElementById('section-gallery').classList.remove('hidden');

      renderLogos(data.results, data.businessDescription);

      if (!data.votingOpen && data.totalVotes > 0) {
        // Votação já encerrada — mostrar resultado direto
        showResults(data);
        document.getElementById('section-result').classList.remove('hidden');
        showOrganizerControls(false);
      } else if (data.votingOpen) {
        startPolling();
        showOrganizerControls(true);
      }
    }
    // else: sem logos — mostrar seção de criação (estado padrão)
  } catch {
    // falha silenciosa — mostra seção de criação
  }
}

function showOrganizerControls(votingOpen) {
  const local = loadLocalState();
  if (!local.isOrganizer) return;

  const controls = document.getElementById('organizer-controls');
  controls.style.display = 'block';

  const btnClose = document.getElementById('btn-close-voting');
  btnClose.style.display = votingOpen ? 'inline-block' : 'none';

  const btnReset = document.getElementById('btn-reset-result');
  btnReset.style.display = 'inline-block';
}

// ============================================================
// Generate Logos (organizer only)
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
      body: JSON.stringify({ description, password: document.getElementById('organizer-password').value }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Erro ao gerar logomarcas.');

    clearLocalState();
    saveLocalState({ isOrganizer: true });

    renderLogos(data.logos, description);
    document.getElementById('section-description').classList.add('hidden');
    document.getElementById('section-gallery').classList.remove('hidden');
    showOrganizerControls(true);
    startPolling();

  } catch (error) {
    alert(error.message);
    btn.disabled = false;
  } finally {
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
    card.innerHTML = `${logo.svg}<h3>${logo.name}</h3><p>${logo.description}</p>`;
    card.addEventListener('click', () => selectLogo(index));
    container.appendChild(card);
  });

  selectedLogoIndex = -1;

  const local = loadLocalState();
  if (local.hasVoted) {
    renderVotedState(local.votedLogoName, null, local.txHash, local.explorerUrl);
  } else {
    document.getElementById('voting-area').classList.remove('hidden');
    document.getElementById('vote-status').textContent = '👆 Clique em uma logomarca acima para votar';
    if (local.userName) document.getElementById('user-name').value = local.userName;
    if (local.walletAddress) document.getElementById('wallet-address').value = local.walletAddress;
  }
}

// ============================================================
// Select Logo / Vote
// ============================================================
function selectLogo(index) {
  selectedLogoIndex = index;
  document.querySelectorAll('.logo-card').forEach((card, i) => {
    card.classList.toggle('selected', i === index);
  });
  const logoName = document.querySelectorAll('.logo-card h3')[index].textContent;
  const status = document.getElementById('vote-status');
  status.textContent = `👍 "${logoName}" selecionada. Preencha seu nome e wallet, depois clique em "Votar".`;
  updateVoteButton();
}

async function submitVote(userName, logoIndex, walletAddress) {
  const btn = document.getElementById('btn-vote');
  const status = document.getElementById('vote-status');

  btn.disabled = true;
  btn.textContent = '⏳ Enviando pagamento…';
  status.textContent = '⏳ Registrando voto e enviando XLM na Stellar Mainnet…';

  try {
    const response = await fetch('/api/vote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userName, logoIndex, walletAddress }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Erro ao registrar voto.');

    const votedName = document.querySelectorAll('.logo-card h3')[logoIndex].textContent;
    saveLocalState({
      hasVoted: true,
      votedLogoIndex: logoIndex,
      votedLogoName: votedName,
      txHash: data.txHash,
      explorerUrl: data.explorerUrl,
    });

    renderVotedState(votedName, data.voteCount, data.txHash, data.explorerUrl);
    showReceipt(votedName, walletAddress, data.txHash, data.explorerUrl, data.paymentAmount);

  } catch (error) {
    status.textContent = `❌ Erro: ${error.message}`;
    btn.disabled = false;
    btn.textContent = '🗳️ Votar e Receber XLM';
  }
}

function updateVoteButton() {
  const btn = document.getElementById('btn-vote');
  const userName = document.getElementById('user-name').value.trim();
  const wallet = document.getElementById('wallet-address').value.trim();
  btn.disabled = !(selectedLogoIndex >= 0 && userName.length > 0 && isValidStellarAddress(wallet));
}

document.getElementById('user-name').addEventListener('input', () => {
  if (document.getElementById('user-name').value.trim()) {
    saveLocalState({ userName: document.getElementById('user-name').value.trim() });
  }
  updateVoteButton();
});

document.getElementById('wallet-address').addEventListener('input', () => {
  const wallet = document.getElementById('wallet-address').value.trim();
  const hint = document.getElementById('wallet-hint');
  if (wallet.length > 0 && !isValidStellarAddress(wallet)) {
    hint.textContent = '⚠️ Endereço inválido. Deve começar com G e ter 56 caracteres.';
    hint.style.color = '#ff6b6b';
  } else {
    hint.textContent = '💡 Cole sua chave pública Stellar (começa com G). Você receberá 0.5 XLM ao votar.';
    hint.style.color = '';
  }
  if (isValidStellarAddress(wallet)) saveLocalState({ walletAddress: wallet });
  updateVoteButton();
});

async function voteFromButton() {
  const userName = document.getElementById('user-name').value.trim();
  const wallet = document.getElementById('wallet-address').value.trim();
  if (selectedLogoIndex >= 0 && userName.length > 0 && isValidStellarAddress(wallet)) {
    await submitVote(userName, selectedLogoIndex, wallet);
  }
}

// ============================================================
// Estado após votar
// ============================================================
function renderVotedState(votedName, voteCount, txHash, explorerUrl) {
  const status = document.getElementById('vote-status');
  status.textContent = `✅ Você votou em "${votedName}"!${voteCount ? ` Total: ${voteCount} voto(s).` : ''}`;

  document.querySelectorAll('.logo-card').forEach(card => {
    card.style.pointerEvents = 'none';
    card.style.opacity = '0.6';
  });

  document.getElementById('user-name').disabled = true;
  document.getElementById('wallet-address').disabled = true;
  document.getElementById('btn-vote').disabled = true;
  document.getElementById('btn-vote').textContent = '✅ Votado';
}

// ============================================================
// Recibo de Pagamento
// ============================================================
function showReceipt(logoName, walletAddress, txHash, explorerUrl, paymentAmount) {
  const section = document.getElementById('section-receipt');
  const content = document.getElementById('receipt-content');
  const shortWallet = walletAddress.slice(0, 6) + '…' + walletAddress.slice(-6);
  const shortHash = txHash ? txHash.slice(0, 8) + '…' + txHash.slice(-8) : '—';
  const isDemo = !explorerUrl;

  content.innerHTML = `
    <div class="receipt-box">
      <div class="receipt-row">
        <span class="receipt-label">Voto em</span>
        <span class="receipt-value">${logoName}</span>
      </div>
      <div class="receipt-row">
        <span class="receipt-label">Pagamento</span>
        <span class="receipt-value receipt-amount">${paymentAmount || '0.5'} XLM ${isDemo ? '(modo demo)' : '✅ Mainnet'}</span>
      </div>
      <div class="receipt-row">
        <span class="receipt-label">Wallet</span>
        <span class="receipt-value receipt-mono">${shortWallet}</span>
      </div>
      <div class="receipt-row">
        <span class="receipt-label">Tx Hash</span>
        <span class="receipt-value receipt-mono">${shortHash}</span>
      </div>
      ${explorerUrl
        ? `<div style="text-align:center; margin-top:16px;">
             <a href="${explorerUrl}" target="_blank" rel="noopener" class="btn-explorer">🔍 Ver no Stellar Expert</a>
           </div>`
        : `<p style="text-align:center; font-size:0.85rem; opacity:0.6; margin-top:8px;">(Modo demo: configure STELLAR_SECRET_KEY para transações reais)</p>`
      }
    </div>
  `;

  section.classList.remove('hidden');
  section.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ============================================================
// Organizer: Encerrar Votação
// ============================================================
async function closeVoting() {
  if (!confirm('Encerrar a votação agora? Isso mostrará o resultado para todos.')) return;
  try {
    await fetch('/api/close-voting', { method: 'POST' });
    document.getElementById('btn-close-voting').style.display = 'none';
  } catch {}
}

// ============================================================
// Polling — detectar fim de votação
// ============================================================
function startPolling() {
  if (statePollInterval) clearInterval(statePollInterval);
  statePollInterval = setInterval(async () => {
    try {
      const res = await fetch('/api/state');
      const data = await res.json();
      if (!data.votingOpen && data.totalVotes > 0) {
        clearInterval(statePollInterval);
        statePollInterval = null;
        showResults(data);
        document.getElementById('section-result').classList.remove('hidden');
        document.getElementById('voting-area').classList.add('hidden');
        document.getElementById('voting-closed-msg').classList.remove('hidden');
        showOrganizerControls(false);
        document.getElementById('section-result').scrollIntoView({ behavior: 'smooth' });
      }
    } catch {}
  }, 3000);
}

// ============================================================
// Resultado Final
// ============================================================
function showResults(data) {
  const sorted = [...data.results].sort((a, b) => b.votes - a.votes);
  const winner = sorted[0];

  document.getElementById('winner-container').innerHTML = `
    <h3>🏆 ${winner.name}</h3>
    ${winner.svg}
    <p>${winner.description}</p>
  `;

  const list = document.getElementById('results-list');
  list.innerHTML = '';
  sorted.forEach((r, i) => {
    const div = document.createElement('div');
    div.className = 'result-item';
    div.innerHTML = `
      <span>${['🥇', '🥈', '🥉'][i] || ''}</span>
      ${r.svg}
      <div><strong>${r.name}</strong> — ${r.votes} voto(s)</div>
    `;
    list.appendChild(div);
  });

  if (data.votes && data.votes.length > 0) {
    const paymentsList = document.getElementById('payments-list');
    paymentsList.innerHTML = '<h3 style="margin-top:24px;">💸 Pagamentos Realizados</h3>';
    data.votes.forEach(v => {
      const div = document.createElement('div');
      div.className = 'payment-item';
      const shortWallet = v.walletAddress
        ? v.walletAddress.slice(0, 6) + '…' + v.walletAddress.slice(-6) : '—';
      const shortHash = v.txHash
        ? v.txHash.slice(0, 8) + '…' + v.txHash.slice(-8) : '—';
      div.innerHTML = `
        <div class="payment-row">
          <strong>${v.userName}</strong>
          <span class="receipt-mono">${shortWallet}</span>
          ${v.explorerUrl
            ? `<a href="${v.explorerUrl}" target="_blank" rel="noopener" class="btn-explorer-sm">🔍 ${shortHash}</a>`
            : `<span class="receipt-mono" style="opacity:0.6">${shortHash}</span>`
          }
        </div>
      `;
      paymentsList.appendChild(div);
    });
  }
}

// ============================================================
// Reset
// ============================================================
async function resetAll() {
  if (!confirm('Iniciar nova simulação? Isso apaga todos os votos e logos atuais.')) return;
  try { await fetch('/api/reset', { method: 'POST' }); } catch {}
  clearLocalState();
  if (statePollInterval) { clearInterval(statePollInterval); statePollInterval = null; }
  location.reload();
}

// ============================================================
// Init
// ============================================================
initApp();
console.log('TaskLoop Simulation loaded!');
