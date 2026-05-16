# Arquitetura funcional do POC

Este documento descreve o fluxo funcional esperado da Sprint 2 e separa claramente:

- o que já está implementado no core do produto;
- o que ainda está mockado;
- o que será ligado como integração real durante o checklist atual.

---

## Narrativa do produto

O POC quer demonstrar um ciclo simples e convincente:

1. uma empresa ou sistema cria uma microtask;
2. um agente prepara a distribuição;
3. a tarefa chega ao executor humano;
4. o humano responde;
5. um agente valida a resposta;
6. se aprovada, o sistema executa o pagamento automaticamente;
7. a transação pode ser auditada por `txHash`.

---

## Fluxo funcional alvo

```text
Empresa / Admin
   ↓
Frontend local (Lovable)
   ↓
TaskLoop API
   ↓
Task Agent
   ↓
Telegram adapter
   ↓
Usuário executor
   ↓
Validation Agent
   ↓
Payout Service
   ↓
Stellar Testnet
   ↓
Explorer / txHash
```

Camadas complementares da Sprint 2:

```text
Anchor adapter (Etherfuse-ready)
        e
x402 protected API
```

---

## Fluxo já suportado hoje no backend

### 1. Criação da task

A API já permite:

- criar task;
- listar task;
- consultar task por id.

Estado inicial:

- `task.status = created`

### 2. Envio da task

Ao chamar `POST /tasks/:id/send`:

- o Task Agent prepara a mensagem;
- o adapter de Telegram envia de forma simulada;
- a task passa para status `sent`.

### 3. Submissão humana

Ao chamar `POST /tasks/:id/submit`:

- uma submission é registrada;
- o sistema guarda usuário, resposta e `walletAddress` quando fornecida;
- a task passa para `submitted`.

### 4. Validação + payout automático

Ao chamar `POST /tasks/:id/approve`:

- o Validation Agent avalia a submission pendente;
- se rejeitar, a submissão é marcada como rejeitada;
- se aprovar, o backend já dispara automaticamente o `payout-service`.

Esse ponto é central para a narrativa da Sprint 2.

### 5. Retry manual de payout

Se necessário, `POST /tasks/:id/payout` continua existindo como fallback operacional.

---

## Estado atual das integrações

### Já integrado ao fluxo

- lifecycle de task;
- Task Agent com fallback local;
- Validation Agent com fallback local;
- payout automático após aprovação;
- persistência em memória de `submission.payout`, `submission.payoutId`, `submission.txHash` e `task.payouts[]`.

### Ainda mockado

- Telegram adapter.

### Já implementado como integração real

- Stellar adapter em `apps/api/src/services/stellar.ts`;
- rota de x402 com verificação de pagamento;
- script TypeScript equivalente ao teste da Sprint 1.

### Ainda por estruturar

- adapter Etherfuse em `apps/api/src/services/etherfuse.ts`.

---

## Fluxo financeiro alvo da Sprint 2

A liquidação principal da demo será:

- **Stellar Testnet real**;
- **XLM como fluxo principal do POC**;
- memo identificando task/submission;
- retorno de `txHash` real para API e frontend.

Resultado esperado do pagamento:

- `provider`
- `status`
- `txHash`
- `processedAt`

---

## Papel do Anchor no POC

A integração com Anchor não será o caminho crítico da demo principal.

Decisão prática:

- o payout principal roda em Stellar Testnet;
- Anchor entra como adapter compatível com Etherfuse;
- se o sandbox falhar, o fallback será documentado sem mascarar o estado da integração.

---

## Papel do x402 no POC

O x402 entra como demonstração de monetização programática entre agentes.

Endpoint adotado:

- `POST /x402/distribution/unlock`

Fluxo implementado:

1. cliente solicita desbloqueio de capacidade extra de distribuição;
2. API retorna `402 Payment Required`;
3. cliente executa pagamento em Stellar Testnet;
4. cliente reenviará a requisição com `accountId` e `txHash`;
5. API verifica destino, valor e memo no Horizon;
6. recurso premium é liberado com `200`.

Decisão de escopo:

- o POC usa uma implementação mínima própria com `402 + txHash + Horizon`;
- não depende de Soroban neste estágio;
- `@x402/stellar` fica como evolução possível caso o produto exija maior aderência ao protocolo e/ou capacidades baseadas em Soroban.

---

## Resumo executivo

O POC já tem o coração do produto funcionando: task, submit, validate e auto-payout no lifecycle.

O trabalho atual do checklist é transformar a camada financeira e a monetização em integrações demonstráveis:

- manter o pagamento real em Stellar Testnet como trilha principal de liquidação;
- manter o x402 mínimo funcional desacoplado do core de tasks;
- estruturar Anchor/Etherfuse como adapter sem travar a demo.