# TaskLoop — Roadmap

> Current status: **Sprint 4 complete** — Live on Stellar Mainnet with real XLM payments.
>
> Acceleration: Stellar 37º (4 sprints total)

---

## Sprint 2 — MVP Assessment

### What's solid ✅

| Aspect | Status | Details |
|--------|--------|---------|
| **Functional lifecycle** | Done | Create → send → submit → validate → pay. Real payout on Stellar Testnet with verifiable txHash on Explorer. |
| **Architecture** | Done | Separated adapters, services and routes. Conventional commits. Makefile. E2E scripts in TypeScript. |
| **Documentation** | Done | Architecture, sprint scope, checklists, .env.example, dual README (root + POC), changelogs in chat_contexts. |
| **Stellar tracks** | Covered | Stellar Testnet payout (real), x402 (402 + txHash + Horizon), Anchor/Etherfuse (real mode in sandbox), Telegram (BotFather plan). |
| **Demo experience** | Robust | `make demo-lifecycle` delivers real txHash in the terminal in seconds. `make demo-anchor-e2e` shows Anchor flow. `make demo-payout` tests Stellar in isolation. |
| **Frontend** | Functional | Dashboard with full cycle, StellarPayoutReceipt with txHash reveal, AnchorSettlement with 3 animated steps. |

### What needs to evolve ⚠️

| Aspect | Priority | Problem | Planned solution |
|--------|----------|---------|-----------------|
| **Persistence** | 🔴 High | In-memory data (`store/memory.ts`). Server restart wipes everything. | Migrate to SQLite (lightweight) or PostgreSQL. Keep store adapter for future swap. |
| **Real Telegram** | 🔴 High | Main distribution channel is mocked. | Implement BotFather bot with distribution, webhook submissions, notifications and commands (`/start`, `/tasks`, `/wallet`, `/status`). |
| **Authentication** | 🟡 Medium | Zero authentication. Anyone can create tasks, submit, pay. | Add wallet-based auth (Stellar signature) or JWT. Without this, no real operation. |
| **Automated tests** | 🟡 Medium | No unit or integration tests. | Create at minimum core lifecycle tests (create → send → submit → approve → payout). Jest + Supertest. |
| **Real Anchor** | ✅ Done | Etherfuse in real mode on sandbox. Functional onboarding with wallet KYC + PIX/BRL bank account. | Migrate to Mainnet in Sprint 4. |
| **Security** | 🟢 Low | `STELLAR_SOURCE_SECRET` in .env without encryption. | Add encryption at rest or HashiCorp Vault. For MVP, .env + .gitignore is acceptable. |
| **Advanced frontend** | 🟢 Low | No onboarding, worker profile, payment history, search. | Add based on first user demand. |

---

## Sprint 4 — Mainnet & Launch

**Goal:** Run on Stellar Mainnet with security and real Anchor.

Delivered:

- [x] **Live on Mainnet** — logo voting simulation with real 0.5 XLM payment per voter (`taskloop-poc/simulation/`)
- [x] **Testnet War Room** — PIX BRL ↔ TESOURO flow executed via Etherfuse sandbox: KYC approved, trustline established, on-ramp created and fiat simulated (`Testnet_Challenges/`)
- [x] **Rate limiting and treasury protection** — MAX_VOTES_PER_SESSION, TREASURY_MIN_RESERVE, organizer password with anti brute-force
- [x] **Deploy via GitHub Codespaces** — runbook documented in `taskloop-poc/simulation/codespaces.md`
- [x] **First complete E2E cycle** — 2 real Mainnet payments confirmed on 2026-05-30 (`taskloop-poc/simulation/first_run.md`)

Pending:

- [ ] Fully functional PIX Anchor (on-ramp stuck at `funded` in sandbox — known Etherfuse limitation)
- [ ] Soroban Contracts track (dropped — project does not use Soroban, no ROI for this sprint)
- [ ] Permanent production deploy (Fly.io, Railway or similar)
- [ ] Real Telegram bot via BotFather
- [ ] 5 real users on Mainnet via voting demo

---

## Current Architecture

```text
Frontend (TanStack Start / React)
        ↓
TaskLoop API (Express + TypeScript)
        ↓
Adapters
  ├── Task Agent (mock/local-first)
  ├── Validation Agent (mock/local-first)
  ├── Telegram (mock → BotFather in Sprint 3)
  ├── Payout Service
  │     └── Stellar (Horizon Testnet → Mainnet ✅)
  ├── Anchor (Etherfuse sandbox → PIX real pending)
  └── x402 (functional, 402 + txHash + Horizon)
        ↓
Store (in-memory → SQLite/PostgreSQL next)
```

---

## Demo Commands

```bash
make install             # Install dependencies
make env                 # Create .env
make api                 # Terminal 1: API
make web                 # Terminal 2: Frontend
make demo-lifecycle      # Full flow with real payout
make demo-anchor-video   # Anchor/Etherfuse flow (prepares recording env)
make demo-onboarding     # Programmatic Etherfuse onboarding
make demo-payout         # Standalone Stellar payout
make demo-x402-e2e       # End-to-end x402
make test                # Typecheck + health check
```

---

## Team

Project developed during the **Stellar 37º** acceleration program.

- Felipe Segall
- Paulo Marinato
- Conrado Niemeyer
