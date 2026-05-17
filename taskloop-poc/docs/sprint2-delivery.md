# Sprint 2 — escopo de entrega

Este documento detalha o que precisa ser demonstrado na Sprint 2 sem confundir o escopo do POC com uma versão final de produção.

A lógica central da entrega é simples:

**após a resposta humana ser validada por agente, o sistema executa automaticamente o pagamento.**

---

## Entrega principal

O coração da Sprint 2 é o fluxo abaixo:

1. criar task;
2. enviar task;
3. receber submissão humana;
4. validar a submissão;
5. se aprovada, disparar payout automático;
6. exibir evidência do pagamento.

Esse fluxo já está encaminhado no backend. O trabalho restante é ligar a liquidação real em Stellar Testnet e deixar as integrações periféricas bem documentadas.

---

## Entrega 1 — payout real em Stellar Testnet

### Objetivo

Substituir o mock financeiro por pagamento real em Stellar Testnet no backend TypeScript.

### Decisão técnica

O fluxo principal de payout da demo será:

- Stellar Testnet real;
- XLM como fluxo principal do POC;
- memo identificando task/submission;
- retorno de `txHash` real.

### Escopo mínimo aceito

- `POST /tasks/:id/approve` continua sendo o gatilho principal;
- aprovação bem-sucedida aciona payout automático;
- `POST /tasks/:id/payout` permanece como retry;
- backend persiste `provider`, `status`, `txHash` e `processedAt`.

### Evidência esperada na demo

- submissão aprovada;
- payout executado;
- `txHash` visível;
- explorer abrindo a transação.

---

## Entrega 2 — Anchor como adapter, não como gargalo

### Objetivo

Atender ao requisito de Anchor sem bloquear a demo principal por instabilidade de sandbox.

### Decisão técnica

A integração será estruturada como:

- adapter Etherfuse-ready;
- interface mínima para quote/order/status;
- fallback mockado e explícito se necessário.

### Mensagem recomendada quando houver mock

> A integração foi estruturada como adapter Etherfuse-ready. O ambiente sandbox/devnet será ativado com credenciais válidas. Para a demo, mantivemos fallback mockado preservando o mesmo contrato de integração.

### Situação encontrada nesta sprint

Na prática, não conseguimos concluir a ativação real da Etherfuse nesta sprint porque o fluxo necessário para geração de credenciais dependia de `bank accounts` ainda não disponíveis para o nosso contexto no Brasil.

Por isso, a decisão desta entrega é:

- manter a integração Anchor / Etherfuse implementada no código;
- documentar explicitamente que ela está operando em modo mock;
- tratar a validação com credenciais reais como próximo passo de sprint.

---

## Entrega 3 — x402 mínimo funcional

### Objetivo

Demonstrar monetização programática de API usando `402 Payment Required` com prova de pagamento em Stellar Testnet.

### Endpoint adotado

`POST /x402/distribution/unlock`

### Escopo mínimo aceito

Sem prova:

- retorna `402 Payment Required`;
- informa `amount`, `destination`, `memo/requestId` e `asset`;
- descreve o recurso premium a ser liberado após pagamento.

Com prova:

- cliente envia `accountId` e `txHash`;
- API consulta Horizon;
- valida destino, valor e memo;
- libera o unlock com `200`.

### Fluxo resumido

`cliente → POST /x402/distribution/unlock → 402 → pagamento → verificação → acesso liberado`

### Script de apoio para demo

- `npm run demo:x402 -- <accountId>` cobre o fluxo semi-manual;
- `npm run demo:x402:e2e -- <accountId>` cobre a demonstração ponta a ponta com pagamento automatizado;
- o script E2E usa `X402_CLIENT_SECRET` como conta pagadora da Testnet.

---

## Status por trilha

### Core do produto

- [x] criação de task
- [x] envio de task
- [x] submissão
- [x] aprovação
- [x] payout automático disparado pela aprovação
- [x] retry manual de payout

### Stellar

- [x] cliente real no backend
- [x] assinatura com source secret
- [x] pagamento real para `walletAddress`
- [x] `txHash` real persistido

### Anchor / Etherfuse

- [x] adapter preenchido
- [x] contrato mínimo definido em código
- [x] fallback documentado
- [ ] credenciais reais validadas na sandbox

### x402

- [x] rota protegida montada
- [x] resposta `402 Payment Required`
- [x] verificação de `txHash` via Horizon
- [x] cliente/script de teste

---

## Sugestão de commits

### Commit 1 — docs e narrativa

`docs: align sprint 2 narrative and delivery scope`

### Commit 2 — Stellar real

`feat: add real stellar testnet payout flow`

### Commit 3 — x402 + anchor adapter

`feat(x402): add protected API demo`

---

## Texto-base para RT

Para a Sprint 2, o TaskLoop demonstra o fluxo mínimo de uma microtarefa aprovada com pagamento automatizado. O lifecycle principal já está estruturado no backend, incluindo aprovação com gatilho automático de payout. A liquidação principal da entrega será feita em Stellar Testnet real, reaproveitando a lógica validada na Sprint 1 e expondo `txHash` como evidência auditável. A camada de Anchor foi estruturada via adapter Etherfuse-ready, com fallback explícito em modo mock nesta sprint porque não conseguimos concluir a geração de credenciais reais a partir do fluxo atual de onboarding/bank account da Etherfuse para o nosso contexto no Brasil. Para monetização entre agentes, o projeto adota um fluxo mínimo de x402 em `POST /x402/distribution/unlock`, baseado em `402 Payment Required`, pagamento em Stellar Testnet e verificação programática via Horizon.