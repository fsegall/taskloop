# TaskLoop

> Pagamentos automatizados para colaboração entre humanos e IA.

TaskLoop é uma plataforma onde agentes de IA podem distribuir microtarefas para humanos e executar pagamentos automáticos após a validação das respostas utilizando a infraestrutura da Stellar.

O projeto está sendo desenvolvido durante a aceleração **Stellar 37º** com foco em:

- colaboração humano-IA
- micropagamentos globais
- integração com Telegram
- pagamentos automatizados
- arquitetura baseada em agentes
- APIs monetizadas via x402

---

## Visão geral

O crescimento da IA generativa aumentou significativamente a necessidade de validação humana em fluxos como:

- classificação de dados
- revisão de respostas
- moderação
- validação de conteúdo
- treinamento supervisionado

Hoje, grande parte desse trabalho é intermediado por plataformas centralizadas com:

- pagamentos lentos
- onboarding complexo
- baixa acessibilidade global
- pouca flexibilidade
- altos custos operacionais

O TaskLoop propõe um novo fluxo:

1. Empresas ou sistemas de IA criam tarefas.
2. Agentes distribuem tarefas para usuários.
3. Usuários executam microtarefas pelo celular.
4. Um agente de validação aprova ou rejeita a resposta.
5. O sistema executa pagamentos automáticos via Stellar.

---

## Status — Sprint 4 (mai/2026)

Produto ao vivo na **Stellar Mainnet**: demo de votação de logomarca paga 0.5 XLM por tarefa concluída, com hash verificável no stellar.expert. Deploy via GitHub Codespaces.

## Objetivo do MVP

O MVP busca validar:

- distribuição de tarefas e fluxo human-in-the-loop
- validação automatizada por agentes
- **micropagamentos reais via Stellar Mainnet**
- integração com Anchors (Etherfuse PIX/BRL)
- monetização de APIs via x402

---

## Rodando localmente

Todo o projeto roda localmente. Não há dependência de infraestrutura externa além da Stellar Testnet pública.

### Pré-requisitos

- Node.js >= 18
- npm
- make (opcional, para atalhos)

### Setup rápido

```bash
# 1. Instalar dependências
make install

# 2. Criar .env a partir do exemplo
make env
# Editar taskloop-poc/.env com suas chaves Stellar Testnet

# 3. Subir a API (terminal 1)
make api

# 4. Subir o frontend (terminal 2)
make web
```

A API roda em `http://localhost:3000` e o frontend no endereço indicado pelo Vite.

### Sem make

```bash
# Instalar
cd taskloop-poc && npm install
cd taskloop-poc/apps/api && npm install
cd taskloop-poc/apps/taskloop-web && npm install

# Copiar env
cp taskloop-poc/.env.example taskloop-poc/.env

# API (terminal 1)
cd taskloop-poc/apps/api && npm run dev

# Frontend (terminal 2)
cd taskloop-poc/apps/taskloop-web && npm run dev
```

### Configuração mínima do `.env`

Para payout real na Stellar Testnet:

```env
STELLAR_SOURCE_PUBLIC=G...
STELLAR_SOURCE_SECRET=S...
STELLAR_USE_MOCK=false
```

Sem essas chaves, o sistema funciona normalmente com payout mockado.

---

## Comandos disponíveis (Makefile)

| Comando | Descrição |
|---------|----------|
| `make install` | Instala dependências de todos os pacotes |
| `make env` | Cria `.env` a partir do `.env.example` |
| `make api` | Inicia a API (porta 3000) |
| `make web` | Inicia o frontend |
| `make typecheck` | Verifica tipos da API e do frontend |
| `make build` | Build de produção do frontend |
| `make test` | Typecheck + health check da API |
| `make demo-seed` | Carrega dados de demo na API |
| `make demo-reset` | Limpa dados em memória |
| `make demo-health` | Verifica se a API está rodando |
| `make demo-lifecycle` | Fluxo completo via API: criar → enviar → submit → validar → pagar |
| `make demo-anchor` | Fluxo Etherfuse: assets → quote → order |
| `make demo-payout` | Payout standalone na Stellar Testnet |
| `make demo-x402` | Demo x402 semi-manual |
| `make demo-x402-e2e` | Demo x402 end-to-end automatizado |
| `make clean` | Remove build artifacts e node_modules |

---

## Estrutura do repositório

```text
TaskLoop/
  Makefile
  README.md
  sandbox/
  taskloop-poc/
    apps/
      api/           # Backend Express + TypeScript
      taskloop-web/  # Frontend TanStack Start + React
    checklists/      # Checklists por trilha
    docs/            # Documentação de arquitetura e entrega
    scripts/         # Scripts de demo (payout, x402)
    simulation/      # Demo standalone de votação (tarefa) com pagamento real em XLM (Mainnet)
  Testnet_Challenges/
    etherfuse-pix-demo/  # Script 17 passos PIX on/off-ramp (Stellar Testnet War Room)
    pix-ramp.ts          # Versão adaptada para integração com TaskLoop
    soroban-deploy.sh    # Script de deploy Soroban (Trilha Contratos)
```

### Onde está o projeto principal

O POC principal desta entrega está em:

- `taskloop-poc/`

Documentação principal:

- `taskloop-poc/README.md`
- `taskloop-poc/docs/architecture.md`
- `taskloop-poc/docs/sprint2-delivery.md`
- `taskloop-poc/docs/anchor-etherfuse.md`
- `taskloop-poc/docs/x402-e2e-run.md`

### Demo de votação com pagamento real (Sprint 4)

A simulação em `taskloop-poc/simulation/` demonstra o fluxo TaskLoop na Mainnet:
uma tarefa de escolha de logomarca paga **0.5 XLM** automaticamente a cada votante via Stellar.

- Runbook de deploy: `taskloop-poc/simulation/codespaces.md`
- Transação de exemplo na Mainnet: verificável em stellar.expert

---

## Stack demonstrada nesta entrega

- **Stellar Mainnet** — pagamentos reais de 0.5 XLM por tarefa concluída (simulação de votação)
- **Stellar Testnet** — payout real via lifecycle completo
- **x402 mínimo funcional** com `402 Payment Required`
- **Anchor / Etherfuse** estruturado como adapter
- **Telegram** estruturado como adapter (bot via BotFather nas próximas sprints)
- **fallback mockado explícito** quando a integração externa ainda não está pronta

### Etherfuse (Anchor)

A integração com a Etherfuse foi implementada como adapter no backend com suporte a modo real e fallback mock.

**Status atual:** modo real funcional na sandbox. Onboarding programático concluído (org + KYC + wallet + bank account PIX/BRL). Fluxo de off-ramp validado: quote (50 USDC → 864 MXN) e order com anchor account + memo.

**Testnet War Room (Sprint 4):** fluxo PIX BRL ↔ TESOURO executado até on-ramp `funded` com trustline estabelecida no testnet. Logs e hashes documentados em `Testnet_Challenges/first_test.md`.

Ver `taskloop-poc/docs/anchor-etherfuse.md` para detalhes completos da integração.

---

## Próximo passo para leitura

Para a visão completa do POC, leia:

- `taskloop-poc/README.md`

---

## Equipe

Projeto desenvolvido durante a aceleração Stellar 37º.

- Felipe Segall
- Paulo Marinato
- Conrado Niemeyer
