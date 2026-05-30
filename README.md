# TaskLoop

> Automated payments for human-AI collaboration.

TaskLoop is a platform where AI agents can distribute microtasks to humans and execute automatic payments after response validation, using Stellar's infrastructure.

Built during the **Stellar 37º** acceleration program, focused on:

- Human-AI collaboration
- Global micropayments
- Telegram integration
- Automated payments
- Agent-based architecture
- Monetized APIs via x402

---

## Overview

The growth of generative AI has significantly increased the need for human validation in workflows such as:

- Data labeling
- Response review
- Content moderation
- Content validation
- Supervised training

Today, most of this work is intermediated by centralized platforms with:

- Slow payments
- Complex onboarding
- Low global accessibility
- Little flexibility
- High operational costs

TaskLoop proposes a new flow:

1. Companies or AI systems create tasks.
2. Agents distribute tasks to users.
3. Users complete microtasks on their phones.
4. A validation agent approves or rejects the response.
5. The system executes automatic payments via Stellar.

---

## Status — Sprint 4 (May 2026)

Product live on **Stellar Mainnet**: logo voting demo pays 0.5 XLM per completed task, with verifiable transaction hash on stellar.expert. Deployed via GitHub Codespaces.

## MVP Goals

The MVP validates:

- Task distribution and human-in-the-loop flow
- Automated validation by agents
- **Real micropayments via Stellar Mainnet**
- Anchor integration (Etherfuse PIX/BRL)
- API monetization via x402

---

## Running Locally

The entire project runs locally. No external infrastructure dependencies beyond the public Stellar Testnet.

### Prerequisites

- Node.js >= 18
- npm
- make (optional, for shortcuts)

### Quick Setup

```bash
# 1. Install dependencies
make install

# 2. Create .env from example
make env
# Edit taskloop-poc/.env with your Stellar Testnet keys

# 3. Start the API (terminal 1)
make api

# 4. Start the frontend (terminal 2)
make web
```

The API runs at `http://localhost:3000` and the frontend at the address shown by Vite.

### Without make

```bash
# Install
cd taskloop-poc && npm install
cd taskloop-poc/apps/api && npm install
cd taskloop-poc/apps/taskloop-web && npm install

# Copy env
cp taskloop-poc/.env.example taskloop-poc/.env

# API (terminal 1)
cd taskloop-poc/apps/api && npm run dev

# Frontend (terminal 2)
cd taskloop-poc/apps/taskloop-web && npm run dev
```

### Minimal `.env` Configuration

For real payouts on Stellar Testnet:

```env
STELLAR_SOURCE_PUBLIC=G...
STELLAR_SOURCE_SECRET=S...
STELLAR_USE_MOCK=false
```

Without these keys, the system runs normally with mocked payouts.

---

## Available Commands (Makefile)

| Command | Description |
|---------|-------------|
| `make install` | Install dependencies for all packages |
| `make env` | Create `.env` from `.env.example` |
| `make api` | Start the API (port 3000) |
| `make web` | Start the frontend |
| `make typecheck` | Type-check the API and frontend |
| `make build` | Production build of the frontend |
| `make test` | Typecheck + API health check |
| `make demo-seed` | Load demo data into the API |
| `make demo-reset` | Clear in-memory data |
| `make demo-health` | Check if the API is running |
| `make demo-lifecycle` | Full flow via API: create → send → submit → validate → pay |
| `make demo-anchor` | Etherfuse flow: assets → quote → order |
| `make demo-payout` | Standalone Stellar Testnet payout |
| `make demo-x402` | Semi-manual x402 demo |
| `make demo-x402-e2e` | Automated end-to-end x402 demo |
| `make clean` | Remove build artifacts and node_modules |

---

## Repository Structure

```text
TaskLoop/
  Makefile
  README.md
  README_BR.md          # Portuguese version
  sandbox/
  taskloop-poc/
    apps/
      api/              # Express + TypeScript backend
      taskloop-web/     # TanStack Start + React frontend
    checklists/         # Track checklists
    docs/               # Architecture and delivery docs
    scripts/            # Demo scripts (payout, x402)
    simulation/         # Standalone voting demo with real XLM payments (Mainnet)
  Testnet_Challenges/
    trilha_1_pix/       # PIX on/off-ramp scripts (Stellar Testnet War Room)
    trilha_2_soroban/   # Soroban deploy script (Contracts track)
    etherfuse-pix-demo/ # Reference 17-step end-to-end PIX demo
```

### Main Project

The main POC for this delivery is at:

- `taskloop-poc/`

Key documentation:

- `taskloop-poc/README.md`
- `taskloop-poc/docs/architecture.md`
- `taskloop-poc/docs/sprint2-delivery.md`
- `taskloop-poc/docs/anchor-etherfuse.md`
- `taskloop-poc/docs/x402-e2e-run.md`

### Live Voting Demo with Real Payments (Sprint 4)

The simulation at `taskloop-poc/simulation/` demonstrates the full TaskLoop flow on Mainnet:
a logo selection task automatically pays **0.5 XLM** to each voter via Stellar.

- Deploy runbook: `taskloop-poc/simulation/codespaces.md`
- First complete E2E run: `taskloop-poc/simulation/first_run.md`
- Tx #1 (Felipe): [de52f1cc…afc893](https://stellar.expert/explorer/public/tx/de52f1cc13d5fd211ff634d6100ed2b195f3d57a702be6c746c347bf31afc893)
- Tx #2 (Paulo): [4c1678a8…fc12c](https://stellar.expert/explorer/public/tx/4c1678a8900334f3f2d659b3762f251090bb508bf92c0bab179403a5a7efc12c)

---

## Demonstrated Stack

- **Stellar Mainnet** — real 0.5 XLM payments per completed task (voting demo)
- **Stellar Testnet** — real payout via full lifecycle
- **x402** — minimal functional implementation with `402 Payment Required`
- **Anchor / Etherfuse** — structured as an adapter
- **Telegram** — structured as an adapter (BotFather bot in upcoming sprints)
- **Explicit mock fallback** when external integration is not yet ready

### Etherfuse (Anchor)

The Etherfuse integration was implemented as a backend adapter with support for real mode and mock fallback.

**Current status:** real mode functional in sandbox. Programmatic onboarding completed (org + KYC + wallet + PIX/BRL bank account). Off-ramp flow validated: quote (50 USDC → 864 MXN) and order with anchor account + memo.

**Testnet War Room (Sprint 4):** PIX BRL ↔ TESOURO flow executed through on-ramp `funded` with trustline established on testnet. Logs and hashes documented in `Testnet_Challenges/trilha_1_pix/first_test.md`.

See `taskloop-poc/docs/anchor-etherfuse.md` for full integration details.

---

## Further Reading

For the complete POC overview, read:

- `taskloop-poc/README.md`

---

## Team

Project developed during the Stellar 37º acceleration program.

- Felipe Segall
- Paulo Marinato
- Conrado Niemeyer
