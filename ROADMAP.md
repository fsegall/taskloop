# TaskLoop — Roadmap

> Status atual: **Sprint 2 concluída** — MVP funcional com payout real em Stellar Testnet.
>
> Aceleração: Stellar 37º (4 sprints no total)
>
> Meta: Mainnet até o final da aceleração.

---

## Avaliação do MVP (Sprint 2)

### O que está sólido ✅

| Aspecto | Status | Detalhes |
|---------|--------|----------|
| **Lifecycle funcional** | Concluído | Criar → enviar → submeter → validar → pagar. Payout real na Stellar Testnet com txHash verificável no Explorer. |
| **Arquitetura** | Concluída | Adapters, services e routes separados. Commits convencionais. Makefile. Scripts E2E em TypeScript. |
| **Documentação** | Concluída | Architecture, sprint scope, checklists, .env.example, README duplo (raiz + POC), changelogs em chat_contexts. |
| **Trilhas Stellar** | Cobertas | Payout Stellar Testnet (real), x402 (402 + txHash + Horizon), Anchor/Etherfuse (modo real na sandbox), Telegram (plano BotFather). |
| **Experiência de demo** | Robusta | `make demo-lifecycle` entrega txHash real no terminal em segundos. `make demo-anchor-e2e` mostra fluxo Anchor. `make demo-payout` testa Stellar isoladamente. |
| **Frontend** | Funcional | Dashboard com ciclo completo, StellarPayoutReceipt com reveal de txHash, AnchorSettlement com 3 steps animados. |

### O que precisa evoluir ⚠️

| Aspecto | Prioridade | Problema | Solução planejada |
|---------|------------|----------|-------------------|
| **Persistência** | 🔴 Alta | Dados em memória (`store/memory.ts`). Se o servidor reiniciar, tudo some. | Migrar para SQLite (leve) ou PostgreSQL. Manter adapter de store para troca futura. |
| **Telegram real** | 🔴 Alta | Canal principal de distribuição está mockado. | Implementar bot via BotFather com distribuição, submissions via webhook, notificações e comandos (`/start`, `/tasks`, `/wallet`, `/status`). |
| **Autenticação** | 🟡 Média | Zero autenticação. Qualquer um pode criar tasks, submeter, pagar. | Adicionar auth wallet-based (assinatura Stellar) ou JWT. Sem isso não há operação real. |
| **Testes automatizados** | 🟡 Média | Nenhum teste unitário ou de integração. | Criar ao menos testes do core lifecycle (criar → enviar → submit → approve → payout). Jest + Supertest. |
| **Anchor real** | ✅ Concluído | Etherfuse em modo real na sandbox. Onboarding funcional com wallet KYC + bank account PIX/BRL. | Migrar para Mainnet na Sprint 4. |
| **Segurança** | 🟢 Baixa | `STELLAR_SOURCE_SECRET` em .env sem criptografia. | Adicionar criptografia em repouso ou HashiCorp Vault. Para MVP, .env + .gitignore é aceitável. |
| **Frontend avançado** | 🟢 Baixa | Sem onboarding, perfil de worker, extrato de pagamentos, busca. | Adicionar conforme demanda dos primeiros usuários. |

---

## Roadmap — Próximas Sprints

### Sprint 3 — Base para Mainnet

**Objetivo:** Substituir mocks críticos e adicionar persistência.

```
make demo-lifecycle   # continua funcionando, agora com banco de dados
make demo-telegram    # NOVO: task → BotFather → worker responde → payout
make test             # passa com testes unitários do core
```

Entregas esperadas:

- [ ] Banco de dados (SQLite ou PostgreSQL)
- [ ] Telegram real com BotFather (distribuição + submissions + notificações)
- [ ] Testes automatizados do lifecycle
- [ ] Autenticação wallet-based (Stellar)
- [ ] Onboarding de workers via `/start` no Telegram
- [ ] Deploy da API em ambiente de staging

---

### Sprint 4 — Mainnet e Lançamento

**Objetivo:** Rodar em Stellar Mainnet com segurança e Anchor real.

Entregas realizadas:

- [x] **Demo na Mainnet** — simulação de votação de logomarca com pagamento real de 0.5 XLM por votante (`taskloop-poc/simulation/`)
- [x] **Testnet War Room** — fluxo PIX BRL ↔ TESOURO executado via Etherfuse sandbox: KYC aprovado, trustline estabelecida, on-ramp criado e fiat simulado (`Testnet_Challenges/`)
- [x] **Rate limiting e proteção de treasury** — MAX_VOTES_PER_SESSION, TREASURY_MIN_RESERVE, senha de organizador com anti brute-force
- [x] **Deploy via GitHub Codespaces** — runbook documentado em `taskloop-poc/simulation/codespaces.md`

Pendente:

- [ ] Anchor PIX real funcional (on-ramp travou em `funded` no sandbox — limitação conhecida da Etherfuse)
- [ ] Trilha Contratos Soroban (descartada — projeto não usa Soroban, sem ROI para a sprint)
- [ ] Deploy permanente em produção (Fly.io, Railway ou similar)
- [ ] Telegram real com BotFather
- [ ] 5 usuários reais na Mainnet via demo de votação

---

## Resumo da arquitetura atual

```text
Frontend (TanStack Start / React)
        ↓
TaskLoop API (Express + TypeScript)
        ↓
Adapters
  ├── Task Agent (mock/local-first)
  ├── Validation Agent (mock/local-first)
  ├── Telegram (mock → BotFather na Sprint 3)
  ├── Payout Service
  │     └── Stellar (Horizon Testnet → Mainnet na Sprint 4)
  ├── Anchor (Etherfuse mock → real na Sprint 4)
  └── x402 (funcional, 402 + txHash + Horizon)
        ↓
Store (memória → SQLite/PostgreSQL na Sprint 3)
```

---

## Comandos de demonstração

```bash
make install             # Instalar dependências
make env                 # Criar .env
make api                 # Terminal 1: API
make web                 # Terminal 2: Frontend
make demo-lifecycle      # Fluxo completo com payout real
make demo-anchor-video   # Fluxo Anchor/Etherfuse (prepara ambiente para gravação)
make demo-onboarding     # Onboarding programático Etherfuse
make demo-payout         # Payout Stellar standalone
make demo-x402-e2e       # x402 end-to-end
make test                # Typecheck + health check
```

---

## Equipe

Projeto desenvolvido durante a aceleração **Stellar 37º**.

- Felipe Segall
- Paulo Marinato
- Conrado Niemeyer

---

*Documento gerado ao final da Sprint 2 — Maio de 2025.*
"
