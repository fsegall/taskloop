import 'dotenv/config';
import express from 'express';
import { createServer } from 'node:http';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  Keypair,
  Networks,
  TransactionBuilder,
  BASE_FEE,
  Operation,
  Asset,
  Horizon,
  StrKey,
} from '@stellar/stellar-sdk';

// ============================================================
// Configuração
// ============================================================
const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 3001;
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || '';
const STELLAR_SECRET_KEY = process.env.STELLAR_SECRET_KEY || '';
const STELLAR_PAYMENT_AMOUNT = process.env.STELLAR_PAYMENT_AMOUNT || '0.5';
const MAX_VOTES_PER_SESSION = parseInt(process.env.MAX_VOTES_PER_SESSION || '10', 10);
const TREASURY_MIN_RESERVE = parseFloat(process.env.TREASURY_MIN_RESERVE || '2');
const ORGANIZER_PASSWORD = process.env.ORGANIZER_PASSWORD || '';

const horizonServer = new Horizon.Server('https://horizon.stellar.org');

// ============================================================
// Rate limiting para tentativas de senha (anti brute-force)
// ============================================================
const MAX_PASSWORD_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutos
const passwordAttempts = new Map(); // ip -> { count, lockedUntil }

function checkPasswordRateLimit(ip) {
  const now = Date.now();
  const entry = passwordAttempts.get(ip) || { count: 0, lockedUntil: 0 };

  if (entry.lockedUntil > now) {
    const remainingMin = Math.ceil((entry.lockedUntil - now) / 60000);
    return { blocked: true, remainingMin };
  }

  // Resetar contador se o bloqueio já expirou
  if (entry.lockedUntil > 0 && entry.lockedUntil <= now) {
    passwordAttempts.delete(ip);
  }

  return { blocked: false };
}

function recordFailedAttempt(ip) {
  const entry = passwordAttempts.get(ip) || { count: 0, lockedUntil: 0 };
  entry.count += 1;
  if (entry.count >= MAX_PASSWORD_ATTEMPTS) {
    entry.lockedUntil = Date.now() + LOCKOUT_DURATION_MS;
    console.warn(`[Auth] IP ${ip} bloqueado por ${LOCKOUT_DURATION_MS / 60000} minutos após ${entry.count} tentativas.`);
  }
  passwordAttempts.set(ip, entry);
}

function clearAttempts(ip) {
  passwordAttempts.delete(ip);
}

// ============================================================
// Estado em memória (compartilhado entre os usuários)
// ============================================================
let state = {
  businessDescription: '',
  logos: [],   // [{ name, svg, description }]
  votes: [],   // [{ userName, walletAddress, logoIndex, txHash, timestamp }]
  votingOpen: false,
};

// ============================================================
// Servidor Express
// ============================================================
const app = express();
app.use(express.json());
app.use(express.static(resolve(__dirname, 'public')));

// ---------- Proxy: Gerar logomarcas via Deepseek ----------
app.post('/api/generate-logos', async (req, res) => {
  try {
    const { description, password } = req.body;
    const ip = req.ip;

    if (ORGANIZER_PASSWORD) {
      const rateCheck = checkPasswordRateLimit(ip);
      if (rateCheck.blocked) {
        return res.status(429).json({
          error: `Muitas tentativas. Tente novamente em ${rateCheck.remainingMin} minuto(s).`,
        });
      }

      if (password !== ORGANIZER_PASSWORD) {
        recordFailedAttempt(ip);
        const entry = passwordAttempts.get(ip) || { count: 0 };
        const remaining = MAX_PASSWORD_ATTEMPTS - entry.count;
        return res.status(401).json({
          error: remaining > 0
            ? `Senha incorreta. ${remaining} tentativa(s) restante(s).`
            : `Muitas tentativas. Tente novamente em ${LOCKOUT_DURATION_MS / 60000} minutos.`,
        });
      }

      clearAttempts(ip);
    }

    if (!description || typeof description !== 'string' || description.trim().length < 3) {
      return res.status(400).json({ error: 'Descreva seu negócio (mínimo 3 caracteres).' });
    }

    if (!DEEPSEEK_API_KEY) {
      const demoLogos = generateDemoLogos(description.trim());
      resetState(description.trim(), demoLogos);
      state.votingOpen = true;
      return res.json({ logos: demoLogos });
    }

    const prompt = `Crie 3 logomarcas criativas para um negocio com a seguinte descricao: "${description.trim()}".

Para cada logomarca, fornec,a:
1. Nome da logo (um nome curto e estiloso)
2. Descric,a~o (uma frase explicando o conceito)
3. SVG inline (co'digo SVG puro, sem markdown, sem \`\`\`, apenas o elemento <svg>...</svg>)

Formato EXATO de resposta (JSON array):
[
  {
    "name": "Nome da Logo 1",
    "description": "Conceito da logo 1",
    "svg": "<svg viewBox=\"0 0 200 200\" xmlns=\"http://www.w3.org/2000/svg\">... </svg>"
  },
  ...
]

Gere SVGs visualmente distintos entre si (cores, formas, estilos diferentes). Use cores vibrantes e gradientes. Os SVGs devem ser autossuficientes (sem fontes externas).`;

    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: prompt }],
        temperature: 1.2,
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Deepseek error:', response.status, errText);
      return res.status(502).json({ error: 'Falha ao gerar logomarcas. Tente novamente.' });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';

    const jsonMatch = content.match(/\[\s*\{[\s\S]*?\}\s*\]/);
    if (!jsonMatch) {
      console.error('Deepseek response without JSON:', content);
      return res.status(502).json({ error: 'Resposta inválida do gerador. Tente novamente.' });
    }

    let logos;
    try {
      logos = JSON.parse(jsonMatch[0]);
      if (!Array.isArray(logos) || logos.length === 0) throw new Error('Empty array');
      logos = logos.slice(0, 3).map(l => ({
        name: l.name || 'Logomarca',
        description: l.description || '',
        svg: l.svg || '',
      }));
    } catch {
      return res.status(502).json({ error: 'Formato inválido. Tente novamente.' });
    }

    resetState(description.trim(), logos);
    state.votingOpen = true;

    return res.json({ logos });

  } catch (error) {
    console.error('Generate logos error:', error);
    return res.status(500).json({ error: 'Erro interno ao gerar logomarcas.' });
  }
});

// ---------- Votar ----------
app.post('/api/vote', async (req, res) => {
  const { userName, logoIndex, walletAddress } = req.body;

  if (!state.votingOpen) {
    return res.status(400).json({ error: 'Votação não está aberta.' });
  }
  if (!userName || typeof userName !== 'string' || userName.trim().length === 0) {
    return res.status(400).json({ error: 'Informe seu nome ou apelido.' });
  }
  if (typeof logoIndex !== 'number' || logoIndex < 0 || logoIndex >= state.logos.length) {
    return res.status(400).json({ error: 'Índice de logo inválido.' });
  }

  const wallet = (walletAddress || '').trim();
  if (!wallet) {
    return res.status(400).json({ error: 'Informe sua wallet Stellar para receber o pagamento.' });
  }
  if (!StrKey.isValidEd25519PublicKey(wallet)) {
    return res.status(400).json({ error: 'Endereço de wallet Stellar inválido. Deve começar com G e ter 56 caracteres.' });
  }

  const alreadyVoted = state.votes.find(v => v.userName === userName.trim());
  if (alreadyVoted) {
    return res.status(409).json({ error: 'Você já votou! Cada pessoa pode votar apenas uma vez.' });
  }

  const walletAlreadyUsed = state.votes.find(v => v.walletAddress === wallet);
  if (walletAlreadyUsed) {
    return res.status(409).json({ error: 'Esta wallet já recebeu um pagamento nesta rodada.' });
  }

  if (state.votes.length >= MAX_VOTES_PER_SESSION) {
    return res.status(403).json({ error: `Limite de ${MAX_VOTES_PER_SESSION} participantes atingido para esta sessão.` });
  }

  // Enviar pagamento Stellar antes de registrar o voto
  let txHash = null;
  if (STELLAR_SECRET_KEY) {
    try {
      txHash = await sendStellarPayment(wallet);
      console.log(`[Stellar] Pagamento enviado para ${wallet}: ${txHash}`);
    } catch (err) {
      console.error('[Stellar] Erro ao enviar pagamento:', err.message);
      return res.status(502).json({
        error: `Falha ao enviar pagamento Stellar: ${err.message}`,
      });
    }
  } else {
    // Modo demo sem chave configurada
    txHash = 'DEMO_' + Math.random().toString(36).substring(2, 18).toUpperCase();
    console.log(`[Stellar] Modo demo — tx simulada: ${txHash}`);
  }

  state.votes.push({
    userName: userName.trim(),
    walletAddress: wallet,
    logoIndex,
    txHash,
    timestamp: new Date().toISOString(),
  });

  return res.json({
    success: true,
    voteCount: state.votes.length,
    txHash,
    paymentAmount: STELLAR_PAYMENT_AMOUNT,
    explorerUrl: txHash.startsWith('DEMO_')
      ? null
      : `https://stellar.expert/explorer/public/tx/${txHash}`,
  });
});

// ---------- Encerrar votação (organizer) ----------
app.post('/api/close-voting', (_req, res) => {
  state.votingOpen = false;
  return res.json({ success: true });
});

// ---------- Estado atual (para atualização) ----------
app.get('/api/state', (_req, res) => {
  const { logos, votes, votingOpen, businessDescription } = state;
  const counted = votes.reduce((acc, v) => {
    acc[v.logoIndex] = (acc[v.logoIndex] || 0) + 1;
    return acc;
  }, {});

  const results = logos.map((logo, i) => ({
    ...logo,
    votes: counted[i] || 0,
  }));

  return res.json({
    businessDescription,
    votingOpen,
    totalVotes: votes.length,
    results,
    votes: votes.map(v => ({
      userName: v.userName,
      logoIndex: v.logoIndex,
      walletAddress: v.walletAddress,
      txHash: v.txHash,
      explorerUrl: v.txHash && !v.txHash.startsWith('DEMO_')
        ? `https://stellar.expert/explorer/public/tx/${v.txHash}`
        : null,
    })),
  });
});

// ---------- Reset ----------
app.post('/api/reset', (_req, res) => {
  state = {
    businessDescription: '',
    logos: [],
    votes: [],
    votingOpen: false,
  };
  return res.json({ success: true });
});

// ============================================================
// Stellar Payment
// ============================================================
async function sendStellarPayment(destinationAddress) {
  const sourceKeypair = Keypair.fromSecret(STELLAR_SECRET_KEY);

  let sourceAccount;
  try {
    sourceAccount = await horizonServer.loadAccount(sourceKeypair.publicKey());
  } catch {
    throw new Error('Não foi possível carregar a conta treasury na Stellar mainnet.');
  }

  const xlmBalance = parseFloat(
    sourceAccount.balances.find(b => b.asset_type === 'native')?.balance ?? '0'
  );
  const afterPayment = xlmBalance - parseFloat(STELLAR_PAYMENT_AMOUNT);
  if (afterPayment < TREASURY_MIN_RESERVE) {
    throw new Error(`Saldo insuficiente na treasury. Disponível: ${xlmBalance.toFixed(2)} XLM, reserva mínima: ${TREASURY_MIN_RESERVE} XLM.`);
  }

  try {
    await horizonServer.loadAccount(destinationAddress);
  } catch {
    throw new Error('Wallet não encontrada na Stellar Mainnet. Use uma wallet já ativa (com saldo).');
  }

  const operation = Operation.payment({
    destination: destinationAddress,
    asset: Asset.native(),
    amount: STELLAR_PAYMENT_AMOUNT,
  });

  const transaction = new TransactionBuilder(sourceAccount, {
    fee: BASE_FEE,
    networkPassphrase: Networks.PUBLIC,
  })
    .addOperation(operation)
    .setTimeout(60)
    .build();

  transaction.sign(sourceKeypair);

  const result = await horizonServer.submitTransaction(transaction);
  return result.hash;
}

// ============================================================
// Helpers
// ============================================================
function resetState(description, logos) {
  state.businessDescription = description;
  state.logos = logos;
  state.votes = [];
  state.votingOpen = false;
}

function generateDemoLogos(description) {
  const colors = [
    ['#FF6B6B', '#C0392B', '#FFD93D'],
    ['#6C5CE7', '#A29BFE', '#00CEC9'],
    ['#00B894', '#00CEC9', '#0984E3'],
  ];

  return [
    {
      name: 'Aurora',
      description: 'Formas orgânicas que evocam crescimento e inovação',
      svg: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="g1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="${colors[0][0]}"/>
            <stop offset="100%" stop-color="${colors[0][1]}"/>
          </linearGradient>
        </defs>
        <circle cx="100" cy="100" r="90" fill="url(#g1)" opacity="0.9"/>
        <ellipse cx="85" cy="85" rx="40" ry="25" fill="${colors[0][2]}" opacity="0.3" transform="rotate(-20 85 85)"/>
        <ellipse cx="115" cy="120" rx="35" ry="20" fill="#fff" opacity="0.2" transform="rotate(15 115 120)"/>
        <path d="M60 140 Q100 60 140 140" stroke="#fff" stroke-width="4" fill="none" opacity="0.5"/>
        <circle cx="100" cy="65" r="8" fill="${colors[0][2]}"/>
      </svg>`,
    },
    {
      name: 'Geométrica',
      description: 'Precisão e modernidade com formas abstratas',
      svg: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="g2" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="${colors[1][0]}"/>
            <stop offset="100%" stop-color="${colors[1][1]}"/>
          </linearGradient>
        </defs>
        <rect x="10" y="10" width="180" height="180" rx="20" fill="url(#g2)" opacity="0.15"/>
        <polygon points="100,30 170,140 30,140" fill="url(#g2)" opacity="0.8"/>
        <polygon points="100,60 145,125 55,125" fill="${colors[1][2]}" opacity="0.6"/>
        <circle cx="100" cy="110" r="20" fill="#fff" opacity="0.3"/>
        <rect x="70" y="130" width="60" height="8" rx="4" fill="#fff" opacity="0.4"/>
      </svg>`,
    },
    {
      name: 'Natureza Viva',
      description: 'Conexão com sustentabilidade e frescor',
      svg: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="g3" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="${colors[2][0]}"/>
            <stop offset="100%" stop-color="${colors[2][2]}"/>
          </radialGradient>
        </defs>
        <circle cx="100" cy="100" r="90" fill="url(#g3)" opacity="0.2"/>
        <path d="M100 30 Q70 80 40 50 Q80 80 100 100 Q120 80 160 50 Q130 80 100 30Z" fill="${colors[2][0]}" opacity="0.8"/>
        <path d="M100 60 Q80 110 50 100 Q85 120 100 170 Q115 120 150 100 Q120 110 100 60Z" fill="${colors[2][1]}" opacity="0.7"/>
        <circle cx="100" cy="40" r="12" fill="${colors[2][2]}" opacity="0.9"/>
        <circle cx="95" cy="35" r="4" fill="#fff" opacity="0.8"/>
      </svg>`,
    },
  ];
}

// ============================================================
// Iniciar servidor
// ============================================================
const server = createServer(app);
server.listen(PORT, () => {
  const treasuryConfigured = STELLAR_SECRET_KEY ? 'CONFIGURADA' : 'NÃO CONFIGURADA (modo demo)';
  console.log(`\n========================================`);
  console.log(`  TaskLoop Simulation`);
  console.log(`  Running on http://localhost:${PORT}`);
  console.log(`  Treasury Stellar : ${treasuryConfigured}`);
  console.log(`  Pagamento por voto: ${STELLAR_PAYMENT_AMOUNT} XLM`);
  console.log(`  Limite de votos   : ${MAX_VOTES_PER_SESSION}`);
  console.log(`  Reserva mínima    : ${TREASURY_MIN_RESERVE} XLM`);
  console.log(`========================================\n`);
});
