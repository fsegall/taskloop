import express from 'express';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// ============================================================
// Configuração
// ============================================================
const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 3001;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || '';

// ============================================================
// Estado em memória (compartilhado entre os usuários)
// ============================================================
let state = {
  businessDescription: '',
  logos: [],             // [{ name, svg, description }]
  votes: [],             // [{ userName, logoIndex, timestamp }]
  votingOpen: false,
  votingEndTime: null,
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
    const { description } = req.body;
    if (!description || typeof description !== 'string' || description.trim().length < 3) {
      return res.status(400).json({ error: 'Descreva seu negócio (mínimo 3 caracteres).' });
    }

    if (!DEEPSEEK_API_KEY) {
      // Modo demo: retorna SVGs simulados
      const demoLogos = generateDemoLogos(description.trim());
      resetState(description.trim(), demoLogos);
      return res.json({ logos: demoLogos });
    }

    const prompt = `Crie 3 logomarcas criativas para um negócio com a seguinte descrição: "${description.trim()}".

Para cada logomarca, forneça:
1. Nome da logo (um nome curto e estiloso)
2. Descrição (uma frase explicando o conceito)
3. SVG inline (código SVG puro, sem markdown, sem \`\`\`, apenas o elemento <svg>...</svg>)

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

    // Extrair JSON do conteúdo (entre colchetes [])
    const jsonMatch = content.match(/\[\s*\{[\s\S]*?\}\s*\]/);
    if (!jsonMatch) {
      console.error('Deepseek response without JSON:', content);
      return res.status(502).json({ error: 'Resposta inválida do gerador. Tente novamente.' });
    }

    let logos;
    try {
      logos = JSON.parse(jsonMatch[0]);
      if (!Array.isArray(logos) || logos.length === 0) {
        throw new Error('Empty array');
      }
      // Validar estrutura
      logos = logos.slice(0, 3).map(l => ({
        name: l.name || 'Logomarca',
        description: l.description || '',
        svg: l.svg || '',
      }));
    } catch {
      return res.status(502).json({ error: 'Formato inválido. Tente novamente.' });
    }

    resetState(description.trim(), logos);
    return res.json({ logos });

  } catch (error) {
    console.error('Generate logos error:', error);
    return res.status(500).json({ error: 'Erro interno ao gerar logomarcas.' });
  }
});

// ---------- Votar ----------
app.post('/api/vote', (req, res) => {
  const { userName, logoIndex } = req.body;

  if (!state.votingOpen) {
    return res.status(400).json({ error: 'Votação não está aberta.' });
  }
  if (!userName || typeof userName !== 'string' || userName.trim().length === 0) {
    return res.status(400).json({ error: 'Informe seu nome ou apelido.' });
  }
  if (typeof logoIndex !== 'number' || logoIndex < 0 || logoIndex >= state.logos.length) {
    return res.status(400).json({ error: 'Índice de logo inválido.' });
  }

  // Impedir múltiplos votos do mesmo usuário
  const alreadyVoted = state.votes.find(v => v.userName === userName.trim());
  if (alreadyVoted) {
    return res.status(409).json({ error: 'Você já votou! Cada pessoa pode votar apenas uma vez.' });
  }

  state.votes.push({
    userName: userName.trim(),
    logoIndex,
    timestamp: new Date().toISOString(),
  });

  return res.json({ success: true, voteCount: state.votes.length });
});

// ---------- Estado atual (para admin e atualização) ----------
app.get('/api/state', (_req, res) => {
  const { logos, votes, votingOpen, votingEndTime, businessDescription } = state;
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
    votingEndTime,
    totalVotes: votes.length,
    results,
    votes: votes.map(v => ({ userName: v.userName, logoIndex: v.logoIndex })),
  });
});

// ---------- Admin: abrir/fechar votação ----------
app.post('/api/admin/open', (req, res) => {
  const { password, durationMinutes } = req.body;
  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Senha incorreta.' });
  }
  if (state.logos.length === 0) {
    return res.status(400).json({ error: 'Gere as logomarcas primeiro.' });
  }

  const duration = (typeof durationMinutes === 'number' && durationMinutes > 0) ? durationMinutes : 5;
  state.votingOpen = true;
  state.votingEndTime = Date.now() + duration * 60 * 1000;
  state.votes = []; // limpar votos anteriores

  return res.json({ success: true, votingOpen: true, endTime: state.votingEndTime });
});

app.post('/api/admin/close', (req, res) => {
  const { password } = req.body;
  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Senha incorreta.' });
  }

  state.votingOpen = false;
  state.votingEndTime = null;

  return res.json({ success: true, votingOpen: false });
});

// ---------- Reset ----------
app.post('/api/reset', (req, res) => {
  state = {
    businessDescription: '',
    logos: [],
    votes: [],
    votingOpen: false,
    votingEndTime: null,
  };
  return res.json({ success: true });
});

// ============================================================
// Helpers
// ============================================================
function resetState(description, logos) {
  state.businessDescription = description;
  state.logos = logos;
  state.votes = [];
  state.votingOpen = false;
  state.votingEndTime = null;
}

function generateDemoLogos(description) {
  // SVGs criativos e variados gerados manualmente para modo demo
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
  console.log(`\n========================================`);
  console.log(`  TaskLoop Simulation`);
  console.log(`  Running on http://localhost:${PORT}`);
  console.log(`  Admin page: http://localhost:${PORT}/admin.html`);
  console.log(`========================================\n`);
});
