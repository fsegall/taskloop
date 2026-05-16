# Loom script — Sprint 2 demo

## Objetivo do vídeo

Demonstrar, de forma curta e objetiva, que o TaskLoop fecha o ciclo:

**task criada → resposta humana validada → payout automático executado**

Também mostrar rapidamente que o projeto está sendo estruturado para:

- Stellar Testnet real como liquidação principal do POC;
- Anchor via adapter Etherfuse-ready;
- x402 como camada de monetização de API.

---

## Duração sugerida

Entre 3 e 5 minutos.

---

## Estrutura sugerida

### 1. Abertura — problema e proposta

Fala sugerida:

> O TaskLoop é um POC criado durante a aceleração Stellar 37º para mostrar como agentes de IA podem distribuir microtarefas para humanos e executar pagamentos automáticos após validação.

> A ideia central é simples: depois que uma resposta humana é validada por agente, o sistema faz o payout automaticamente.

---

### 2. Visão rápida da arquitetura

Mostrar:

- README ou diagrama em `docs/architecture_poc.md`
- frontend local
- API local
- agentes/adapters
- payout em Stellar Testnet

Fala sugerida:

> A arquitetura foi pensada de forma local-first para a demo. O core fica na API, os agentes entram como adapters, e o payout financeiro segue para Stellar Testnet. Anchor e x402 entram como camadas complementares do POC.

---

### 3. Mostrar o frontend / dashboard

Mostrar:

- lista de tasks
- status das tasks
- possibilidade de aprovar submissão
- eventual exibição de payout/txHash

Fala sugerida:

> Aqui está o dashboard do TaskLoop, onde conseguimos acompanhar o lifecycle das tarefas, submissões e pagamentos.

---

### 4. Demonstrar o fluxo principal

#### 4.1 Criar ou selecionar uma task

Mostrar:

- task existente ou criada via API/frontend

Fala sugerida:

> Primeiro, criamos uma task com instruções, recompensa e quantidade de respostas esperadas.

#### 4.2 Enviar a task

Mostrar:

- ação de send
- mudança de status

Fala sugerida:

> O Task Agent prepara a mensagem de distribuição e o adapter de Telegram executa o envio. No POC atual, o Telegram pode estar simulado para garantir confiabilidade da demo.

#### 4.3 Submeter uma resposta humana

Mostrar:

- submit com `walletAddress`
- mudança para `submitted`

Fala sugerida:

> Em seguida, registramos uma resposta humana com wallet de destino para o pagamento.

#### 4.4 Aprovar e disparar payout automático

Mostrar:

- ação de approve
- resultado da validação
- payout acontecendo automaticamente

Fala sugerida:

> Quando a submissão é aprovada, o sistema não depende de um passo manual separado. O payout já é disparado automaticamente como parte do lifecycle.

#### 4.5 Mostrar evidência do pagamento

Mostrar:

- `txHash`
- status pago
- explorer aberto, se já estiver disponível

Fala sugerida:

> Aqui vemos a evidência do pagamento: provider, status, timestamp e o hash da transação, que pode ser auditado no explorer da Stellar Testnet.

---

### 5. Mostrar o papel do Anchor

Mostrar:

- `docs/sprint2-delivery.md` ou `docs/architecture.md`
- referência ao adapter Etherfuse

Fala sugerida:

> Para o requisito de Anchor, estruturamos a integração como um adapter Etherfuse-ready. Assim, a demo principal não fica bloqueada por eventual instabilidade do sandbox, mas a arquitetura continua pronta para a integração real.

---

### 6. Mostrar o x402

Mostrar:

- documentação em `docs/x402-decision.md`
- rota planejada/protegida

Fala sugerida:

> Além do payout para humanos, o projeto também demonstra monetização de APIs para agentes. A rota premium responde com 402 Payment Required, recebe a prova do pagamento e libera o recurso após verificação na Testnet.

---

### 7. Encerramento

Fala sugerida:

> Em resumo, o TaskLoop demonstra um fluxo human-in-the-loop com payout automático sobre Stellar, além de preparar o caminho para integrações com Anchor e APIs monetizadas via x402.

> Esse é o núcleo do que queremos validar nesta fase da aceleração Stellar 37º.

---

## Checklist rápido antes de gravar

- [ ] frontend local aberto
- [ ] API local rodando
- [ ] task de demo pronta
- [ ] submission com wallet válida
- [ ] approve funcionando
- [ ] payout retornando metadados
- [ ] `txHash` visível ou mock explicitamente explicado
- [ ] docs abertas para Anchor e x402
- [ ] explorer preparado se houver transação real

---

## Plano B para a gravação

Se alguma integração externa falhar na hora do vídeo:

- manter o foco no lifecycle principal;
- explicar claramente o que está real e o que está mockado;
- mostrar a documentação do adapter Etherfuse;
- mostrar a decisão técnica do x402;
- nunca mascarar fallback como integração plenamente ativa.
