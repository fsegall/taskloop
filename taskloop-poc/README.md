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

# Visão Geral

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

TaskLoop propõe um novo fluxo:

1. Empresas ou sistemas de IA criam tarefas.
2. Agentes distribuem tarefas para usuários via Telegram.
3. Usuários executam microtarefas pelo celular.
4. Um agente de validação aprova/rejeita a resposta.
5. O sistema executa pagamentos automáticos via Stellar.

---

# Objetivo do MVP

O MVP atual busca validar:

- distribuição de tarefas via Telegram
- fluxo humano-no-loop
- validação automatizada por agentes
- micropagamentos via Stellar Testnet
- integração inicial com Anchors
- monetização de APIs via x402

---

# Arquitetura

```text
Frontend (Lovable)
        ↓
TaskLoop API
        ↓
Agent Adapters
        ↓
CrewAI Webhooks / Local Agents
        ↓
Telegram Bot
        ↓
Payout Service
        ↓
Stellar Testnet / Anchor
```

---

# Estrutura do Projeto

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
```

---

# Componentes

## Frontend

Localização:
```text
apps/taskloop-web
```

Frontend gerado inicialmente com Lovable e integrado ao GitHub.

Responsabilidades:

- dashboard de tarefas
- visualização de status
- aprovação de tarefas
- visualização de pagamentos
- visualização de transações Stellar

---

## API

Localização:
```text
apps/api
```

Responsável por:

- gerenciamento de tarefas
- integração Telegram
- orquestração de agentes
- pagamentos Stellar
- integração x402
- integração com Anchors

---

## Agent Layer

Os agentes são tratados como adapters desacoplados da API principal.

### Task Agent

Responsável por:

- interpretar tarefas
- formatar mensagens
- distribuir tarefas via Telegram

### Validation Agent

Responsável por:

- validar respostas humanas
- aprovar/rejeitar tarefas
- retornar score/confiança

Exemplo de resposta:

```json
{
  "approved": true,
  "score": 0.92,
  "reason": "Resposta atende aos critérios da tarefa."
}
```

Atualmente, o backend aceita integração por webhooks e também fallback local-first para dar mais confiabilidade ao POC.

---

# Telegram Integration

O Telegram é o canal principal planejado para distribuição de tarefas.

Fluxo esperado:

1. Usuário recebe tarefa via bot.
2. Usuário responde diretamente no Telegram.
3. API recebe a submissão.
4. Validation Agent processa a resposta.
5. Sistema executa pagamento.

---

# Stellar Integration

TaskLoop utiliza Stellar como camada de liquidação financeira.

Benefícios:

- micropagamentos baratos
- liquidação rápida
- alcance global
- suporte a stablecoins
- ótima experiência mobile-first

A trilha atual do projeto prioriza payout automatizado em Testnet, mantendo a possibilidade de evoluir depois para fluxos mais próximos de produção.

---

# Anchor Integration

A arquitetura prevê integração com Anchors para ampliar os caminhos de entrada e saída de valor.

No contexto do POC, a camada de Anchor está sendo estruturada como adapter para permitir:

- integração inicial com Etherfuse sandbox/devnet
- suporte futuro a on/off-ramp
- separação clara entre fluxo principal e integrações externas

Quando necessário para a demo, o comportamento mockado deve ser documentado explicitamente.

---

# x402 Integration

TaskLoop também explora uma integração com x402 para APIs pagas por uso.

Objetivo:

Permitir que agentes ou sistemas externos realizem pagamentos para acessar recursos premium do TaskLoop.

Exemplo atual do POC:

```text
POST /x402/distribution/unlock
```

Fluxo esperado:

1. Cliente solicita desbloqueio de capacidade extra de distribuição.
2. API retorna `402 Payment Required` com instruções de pagamento em Stellar Testnet.
3. Cliente executa o pagamento e reenvía a requisição com `txHash`.
4. API verifica a transação no Horizon e libera o recurso premium.

Escolha de escopo do POC:

- implementação mínima própria usando `402 + txHash + Horizon`;
- sem dependência de Soroban neste estágio;
- com possibilidade de evoluir depois para uma stack mais aderente ao protocolo x402, como `@x402/stellar`, se isso passar a fazer sentido para o produto.

---

# Scripts e documentação

Documentos e materiais úteis do repositório:

- `checklists/stellar.md` — checklist da trilha Stellar, incluindo payout em Testnet, x402 e adapter Anchor/Etherfuse
- `checklists/telegram.md` — checklist da trilha Telegram
- `docs/architecture.md` — decisões de arquitetura
- `docsrchitecture_poc.md` — fluxo funcional do POC
- `docs/sprint2-delivery.md` — escopo de entrega da Sprint 2
- `docs/stellar-testnet-run.md` — registro de um payout real validado no explorer
- `docs/x402-decision.md` — decisão técnica do x402
- `docs/loom-script.md` — roteiro da demo

Scripts planejados/documentados:

- `scripts/demo-payout-stellar.ts`
- `scripts/demo-x402-client.ts`
- `scripts/demo-x402-e2e.ts`
- `scripts/demo-create-task.ts`

Comandos úteis para a demo x402:

- `npm run demo:x402 -- demo-client-001`
- `npm run demo:x402:e2e -- demo-client-001`
- `npm run demo:x402:e2e -- pay <amount> <destination> "<memo>"`

---

# Status Atual

## Sprint 1
- [x] Identificação do produto
- [x] Registro Técnico
- [x] Primeira transação Stellar Testnet
- [x] Definição de personas
- [x] Definição da hipótese principal

## Sprint 2
- [ ] MVP funcional
- [ ] Integração Telegram
- [ ] Integração Anchor
- [ ] Integração x402
- [ ] Loom demo
- [ ] GitHub commits

---

# Roadmap Futuro

- reputação de usuários
- pagamentos em stablecoins
- múltiplos agentes especializados
- dashboards corporativos
- validação distribuída
- ranking de qualidade
- pagamentos recorrentes
- integração MCP
- avaliar adoção de `@x402/stellar` caso o produto evolua para um fluxo x402 mais aderente ao protocolo e/ou passe a exigir capacidades baseadas em Soroban
- agentes autônomos consumidores de APIs

---

# Equipe

Projeto desenvolvido durante a aceleração Stellar 37º.

- Felipe Segall
- Paulo Marinato
- Conrado Niemeyer

---

# License

MIT