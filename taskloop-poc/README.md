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

# Overview

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
2. Agents distribute tasks to users via Telegram.
3. Users complete microtasks on their phones.
4. A validation agent approves or rejects the response.
5. The system executes automatic payments via Stellar.

---

# MVP Goals

The current MVP validates:

- Task distribution via Telegram
- Human-in-the-loop flow
- Automated validation by agents
- Micropayments via Stellar Testnet
- Initial Anchor integration
- API monetization via x402

---

# Architecture

```text
Frontend (TanStack Start / React)
        ↓
TaskLoop API (Express + TypeScript)
        ↓
Agent Adapters
        ↓
CrewAI Webhooks / Local Agents
        ↓
Telegram Bot
        ↓
Payout Service
        ↓
Stellar Mainnet / Testnet / Anchor
```

---

# Project Structure

```text
taskloop-poc/
  apps/
    api/
      src/
        agents/
        routes/
        services/
        store/

    taskloop-web/

  checklists/
  docs/
  scripts/
  simulation/       # Standalone Mainnet voting demo
```

---

# Components

## Frontend

Location:
```text
apps/taskloop-web
```

Initially generated with Lovable and integrated to GitHub.

Responsibilities:

- Task dashboard
- Status visualization
- Task approval
- Payment visualization
- Stellar transaction visualization

---

## API

Location:
```text
apps/api
```

Responsible for:

- Task management
- Telegram integration
- Agent orchestration
- Stellar payments
- x402 integration
- Anchor integration

---

## Agent Layer

Agents are treated as adapters decoupled from the main API.

### Task Agent

Responsible for:

- Interpreting tasks
- Formatting messages
- Distributing tasks via Telegram

### Validation Agent

Responsible for:

- Validating human responses
- Approving/rejecting tasks
- Returning score/confidence

Example response:

```json
{
  "approved": true,
  "score": 0.92,
  "reason": "Response meets the task criteria."
}
```

The backend currently accepts webhook-based integration and also supports a local-first fallback for increased POC reliability.

---

# Telegram Integration

Telegram is the primary planned channel for task distribution and human response collection.

## Status in Sprint 2

In Sprint 2, the Telegram adapter is **deliberately mocked**. The full task lifecycle flow works end-to-end with simulated sending and receiving. This sprint focused on consolidating Stellar Testnet, x402 and Anchor/Etherfuse.

## Plan for upcoming sprints — Bot via BotFather

The real implementation will use the **Telegram Bot API** with a bot registered via **BotFather**.

Target flow:

1. User registers with the bot via `/start`.
2. User registers their Stellar wallet via `/wallet <address>`.
3. Bot publishes task to group/channel.
4. User replies directly in Telegram.
5. Bot creates submission in the API automatically.
6. Validation Agent processes the response.
7. System executes automatic payment via Stellar.
8. Bot notifies the worker about approval and payment.

Planned bot responsibilities:

- **Distribution:** publish Task Agent-formatted tasks to a group/channel or directly to workers.
- **Submissions:** listen for responses and create submissions via API.
- **Notifications:** inform workers about approval, rejection and executed payment (with txHash).
- **Onboarding:** `/start` for registration and `/wallet` to link a Stellar address.
- **Query:** `/tasks` to list available tasks, `/status <id>` to track progress.

Full details in `checklists/telegram.md`.

---

# Stellar Integration

TaskLoop uses Stellar as its financial settlement layer.

Benefits:

- Cheap micropayments
- Fast settlement
- Global reach
- Stablecoin support
- Great mobile-first experience

The project currently prioritizes automated payout on Testnet, with a path to evolve towards production-closer flows.

**Sprint 4:** Real 0.5 XLM payments on Stellar **Mainnet** confirmed — see `simulation/first_run.md`.

---

# Anchor Integration

The architecture includes Anchor integration to expand value entry and exit paths.

In the POC context, the Anchor layer is structured as an adapter to allow:

- Initial integration with Etherfuse sandbox/devnet
- Future support for on/off-ramp
- Clear separation between main flow and external integrations

**Testnet War Room (Sprint 4):** PIX BRL ↔ TESOURO flow executed through on-ramp `funded` with trustline established on testnet. Logs in `../Testnet_Challenges/trilha_1_pix/first_test.md`.

---

# x402 Integration

TaskLoop also explores x402 integration for pay-per-use APIs.

Goal: Allow agents or external systems to make payments to access premium TaskLoop resources.

Current POC example:

```text
POST /x402/distribution/unlock
```

Expected flow:

1. Client requests extra distribution capacity unlock.
2. API returns `402 Payment Required` with Stellar Testnet payment instructions.
3. Client executes payment and resends request with `txHash`.
4. API verifies the transaction on Horizon and releases the premium resource.

POC scope choice:

- Minimal custom implementation using `402 + txHash + Horizon`
- No Soroban dependency at this stage
- Compatible stack with x402 protocol, such as `@x402/stellar`, can be adopted if the product evolves towards a more protocol-adherent x402 flow

---

# Scripts and Documentation

Useful documents and materials in the repository:

- `checklists/stellar.md` — Stellar track checklist, including Testnet payout, x402 and Anchor/Etherfuse adapter
- `checklists/telegram.md` — Telegram track checklist
- `docs/architecture.md` — Architecture decisions
- `docs/architecture_poc.md` — POC functional flow
- `docs/sprint2-delivery.md` — Sprint 2 delivery scope
- `docs/stellar-testnet-run.md` — Record of a real payout validated on the explorer
- `docs/anchor-etherfuse.md` — Etherfuse/Anchor adapter, routes and real/mock mode
- `docs/x402-e2e-run.md` — Record of an end-to-end x402 flow validated on Testnet
- `docs/x402-decision.md` — x402 technical decision
- `docs/loom-script.md` — Demo script
- `simulation/first_run.md` — First complete E2E cycle on Stellar Mainnet

Planned/documented scripts:

- `scripts/demo-payout-stellar.ts`
- `scripts/demo-x402-client.ts`
- `scripts/demo-x402-e2e.ts`
- `scripts/demo-create-task.ts`

Useful demo commands for x402:

- `npm run demo:x402 -- demo-client-001`
- `npm run demo:x402:e2e -- demo-client-001`
- `npm run demo:x402:e2e -- pay <amount> <destination> "<memo>"`

---

# Current Status

## Sprint 1
- [x] Product identification
- [x] Technical registration
- [x] First Stellar Testnet transaction
- [x] Persona definition
- [x] Main hypothesis definition

## Sprint 2
- [x] Functional MVP
- [ ] Telegram integration (mocked)
- [x] Anchor integration (sandbox)
- [x] x402 integration
- [x] GitHub commits

## Sprint 4
- [x] Live on Stellar Mainnet (voting simulation)
- [x] Real XLM payments per task (0.5 XLM)
- [x] Deploy via GitHub Codespaces
- [x] Testnet War Room — PIX BRL ↔ TESOURO flow

---

# Future Roadmap

- User reputation system
- Stablecoin payments
- Multiple specialized agents
- Corporate dashboards
- Distributed validation
- Quality ranking
- Recurring payments
- MCP integration
- Autonomous agent API consumers
- Adopt `@x402/stellar` if product evolves to a more protocol-adherent x402 flow

---

# Team

Project developed during the Stellar 37º acceleration program.

- Felipe Segall
- Paulo Marinato
- Conrado Niemeyer

---

# License

MIT
