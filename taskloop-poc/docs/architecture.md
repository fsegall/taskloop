# Architecture — Sprint 2 POC

## Princípios de arquitetura

O TaskLoop está sendo estruturado para a Sprint 2 com alguns princípios bem objetivos:

1. **local-first para a demo**  
   Frontend e API rodam localmente para reduzir dependência de infraestrutura externa.

2. **adapters em volta das integrações críticas**  
   Agentes, Telegram, Stellar, Anchor e x402 devem poder evoluir sem quebrar o core da API.

3. **mock explícito, nunca oculto**  
   Se uma integração externa estiver indisponível, o fallback precisa ser documentado.

4. **demo reliability > complexidade desnecessária**  
   CrewAI completo, Telegram real e Anchor completo ficam desacoplados do fluxo principal para não bloquear a entrega.

---

## Visão de alto nível

```text
Frontend (Lovable / local)
        ↓
TaskLoop API
        ↓
Task lifecycle routes
        ↓
Agent adapters
   ├── Task Agent
   └── Validation Agent
        ↓
Telegram adapter
        ↓
Payout Service
        ↓
Stellar adapter
        ↓
Horizon Testnet

Camadas paralelas planejadas:
- x402 protected routes
- Anchor adapter (Etherfuse-ready)
```

---

## Core da API

A API concentra a orquestração do fluxo e mantém o estado das tarefas.

Responsabilidades atuais:

- criar tasks;
- enviar tasks;
- receber submissions;
- aprovar/rejeitar submissions;
- disparar payout automático após aprovação;
- permitir retry manual de payout;
- expor endpoints de seed/reset para demo local.

Status atual do store:

- persistência em memória;
- suficiente para demo e iteração rápida;
- não é a camada final de produção.

---

## Agent Layer

O TaskLoop usa uma camada de agentes leve e substituível para orquestrar o trabalho human-in-the-loop.

### Task Agent

Responsável por:

- receber a definição da tarefa;
- formatar a mensagem de distribuição;
- preparar o payload para o canal humano.

Implementação atual:

- suporte opcional a webhook externo;
- fallback local com `PromptTemplate`;
- contrato principal orientado a simplicidade da demo.

### Validation Agent

Responsável por:

- receber task + submission;
- avaliar se a resposta atende ao critério mínimo;
- retornar `approved`, `score` e `reason`.

Implementação atual:

- suporte opcional a webhook externo;
- fallback local determinístico em TypeScript;
- comportamento previsível para facilitar testes de demo.

### Convenção de webhooks atual

O backend hoje espera estas variáveis:

- `TASK_AGENT_WEBHOOK_URL`
- `VALIDATION_AGENT_WEBHOOK_URL`

Decisão de arquitetura:

- a nomenclatura `CREWAI_*` não é o contrato principal atual;
- CrewAI permanece como opção de roadmap/integrador, não como dependência obrigatória da Sprint 2.

---

## Telegram adapter

O Telegram é o canal-alvo da experiência. Na Sprint 2, o adapter está mockado para confiabilidade da demo. Nas próximas sprints, será implementado com um bot real registrado via **BotFather**.

Responsabilidades atuais do adapter:

- enviar a task preparada pelo Task Agent;
- retornar recibo de envio;
- informar quantidade de destinatários e metadados do envio.

Status atual:

- adapter simulado;
- já integrado ao lifecycle da task;
- interface `TelegramService` definida como contrato do adapter;
- pronto para troca por implementação real sem alterar o restante do fluxo.

Responsabilidades planejadas do bot (próximas sprints):

- **distribuição de tarefas:** publicar tasks em grupo/canal ou enviar diretamente para workers;
- **recebimento de submissions:** escutar respostas dos workers e criar submissions na API;
- **notificações de status:** informar workers sobre aprovação, rejeição e pagamento;
- **registro de workers:** comandos `/start` para onboarding e `/wallet` para registrar endereço Stellar;
- **consulta de tarefas:** comandos `/tasks` e `/status` para workers acompanharem tarefas disponíveis.

Framework escolhido:

- Telegram Bot API via token do BotFather;
- recebimento de updates via webhook;
- mantém fallback mockado quando `TELEGRAM_BOT_TOKEN` não estiver configurado.

---

## Payout architecture

A arquitetura de payout foi desenhada para deixar a regra de negócio clara:

1. task é aprovada;
2. validation agent retorna resultado;
3. se aprovada, `payout-service` é chamado automaticamente;
4. o adapter financeiro executa o pagamento;
5. o resultado volta com metadados persistíveis.

Campos importantes do resultado:

- `provider`
- `status`
- `txHash`
- `processedAt`

### Status atual

- `payout-service.ts` já está conectado ao fluxo de aprovação;
- `POST /tasks/:id/approve` já dispara payout automático;
- `POST /tasks/:id/payout` foi mantido como retry/fallback;
- a implementação financeira já usa Stellar Testnet real em `services/stellar.ts`.

---

## Stellar adapter

A Sprint 2 terá como fluxo principal de liquidação o **Stellar Testnet real**.

Decisões já tomadas:

- usar Testnet;
- usar XLM como fluxo principal do POC;
- retornar `txHash` real para API e frontend;
- carregar conta-fonte via env;
- incluir memo com referência de task/submission.

Responsabilidades da implementação real:

- conectar ao Horizon Testnet;
- carregar a source account;
- montar transação;
- assinar com secret;
- enviar pagamento para a wallet da submission;
- tratar erros de rede/Horizon com mensagens claras.

Status atual:

- implementado com Horizon Testnet real;
- usado como fluxo principal de payout da Sprint 2;
- mantém possibilidade de fallback controlado para segurança da demo, quando necessário.

---

## Anchor adapter

A camada de Anchor será estruturada como adapter separado do fluxo principal.

Decisão:

- **não bloquear a demo principal por sandbox instável**;
- usar um adapter Etherfuse-ready;
- documentar claramente quando houver fallback mockado.

Contrato mínimo desejado:

- criar quote;
- criar payout/order;
- consultar status.

Status atual da sprint:

- o adapter e as rotas do backend foram implementados;
- o modo mock permanece como estado oficial da integração nesta sprint;
- a ativação real ficou pendente porque não conseguimos concluir a geração de credenciais da Etherfuse a partir do fluxo atual de onboarding com `bank account` para o nosso contexto no Brasil.

---

## x402 layer

A monetização da API é demonstrada via um fluxo mínimo de x402.

Objetivo arquitetural:

- proteger uma rota premium;
- responder `402 Payment Required` quando não houver prova de pagamento;
- receber `txHash` como prova;
- verificar a transação no Horizon antes de liberar o recurso.

Endpoint adotado no POC:

- `POST /x402/distribution/unlock`

Esse endpoint representa o desbloqueio de capacidade extra de distribuição para um cliente da plataforma.

Status atual:

- rota implementada;
- verificação de pagamento feita via Horizon;
- implementação desacoplada do core de tasks.

Decisão de escopo:

- o POC usa uma implementação mínima própria baseada em `402 + txHash + Horizon`;
- não depende de Soroban neste estágio;
- a adoção de uma stack mais aderente ao protocolo, como `@x402/stellar`, fica como evolução possível caso o produto passe a exigir maior aderência ao x402 e/ou capacidades baseadas em Soroban.

---

## Resumo das decisões

- frontend e API locais para a demo;
- agentes simples/local-first com webhook opcional;
- CrewAI como roadmap, não dependência do MVP;
- Telegram real não bloqueia a entrega;
- payout automático é parte central do produto;
- liquidação principal da Sprint 2 ocorre em Stellar Testnet real;
- Anchor entra via adapter Etherfuse-ready;
- x402 entra com escopo mínimo funcional baseado em `402 + txHash + Horizon`.