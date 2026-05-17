# x402 — decisão técnica do POC

## Objetivo

O objetivo do x402 no TaskLoop não é implementar um ecossistema completo de pagamentos de API em produção nesta fase.

O objetivo é demonstrar, de forma clara, que uma API pode:

1. exigir pagamento antes de liberar um recurso;
2. responder com `402 Payment Required`;
3. receber uma prova de pagamento;
4. verificar essa prova programaticamente na Stellar Testnet;
5. liberar o recurso premium apenas quando a transação for válida.

---

## Decisão principal

Para a Sprint 2, o TaskLoop adotará um **x402 mínimo funcional** baseado em Stellar Testnet.

Aqui, `x402` deve ser entendido como um padrão/fluxo de monetização de API via HTTP `402 Payment Required`, e não como uma biblioteca nativa da Stellar.

A implementação será deliberadamente simples, mas real nos pontos que importam para a demo:

- resposta HTTP `402 Payment Required`;
- instruções de pagamento retornadas pela API;
- pagamento em Stellar Testnet;
- reenvio com `txHash` como prova;
- verificação do pagamento via Horizon.

Em outras palavras:

- o **x402** define a lógica de acesso pago ao recurso;
- a **Stellar** funciona como rail de pagamento;
- o **Horizon** é usado para verificar programaticamente a prova da transação.

---

## Motivo da decisão

Essa abordagem foi escolhida porque:

- é aderente ao conceito central do x402;
- cabe no escopo da Sprint 2;
- conversa diretamente com a proposta do projeto de APIs monetizadas para agentes;
- reaproveita a mesma base técnica da trilha Stellar Testnet;
- evita criar uma implementação complexa demais para o estágio atual do POC.

Ela também preserva uma separação conceitual importante:

- não dependemos de uma suposta "lib x402 da Stellar" para validar o conceito;
- usamos os componentes certos para cada papel: HTTP para o contrato de acesso, Stellar para pagamento e Horizon para verificação.

---

## Endpoint de referência

Endpoint adotado para a demo:

```text
POST /x402/distribution/unlock
```

Esse endpoint representa o desbloqueio de capacidade extra de distribuição para um cliente da plataforma.

---

## Comportamento esperado

### Sem prova de pagamento

A API responde com:

- status `402 Payment Required`;
- instruções de pagamento em formato legível por cliente;
- detalhes do recurso premium que será liberado após pagamento.

Campos mínimos esperados na resposta:

- `amount`
- `destination`
- `memo` ou `requestId`
- `asset`
- `network`
- `horizonUrl`

### Com prova de pagamento

O cliente reenvia a requisição com o identificador da transação, por exemplo:

- header dedicado; ou
- query param; ou
- body, dependendo da rota escolhida.

A API então:

1. consulta o Horizon;
2. localiza a transação/operação;
3. verifica destino;
4. verifica valor;
5. verifica memo/requestId;
6. libera o unlock de distribuição com `200` se tudo estiver correto.

---

## O que será validado

Para a prova ser aceita, a checagem mínima deve confirmar:

- rede correta: Stellar Testnet;
- destinatário correto;
- valor mínimo esperado;
- asset esperado;
- memo ou identificador compatível com a requisição protegida.

Esses critérios evitam aceitar uma transação qualquer sem relação com a chamada premium.

---

## Evolução possível de roadmap

Durante a pesquisa, identificamos que existe um ecossistema x402 mais estruturado, incluindo pacotes como `@x402/stellar` e integrações HTTP como `@x402/express`.

Para este POC, a escolha foi **não adotar essa stack agora**, por motivos de escopo, simplicidade e previsibilidade da demo.

Ainda assim, essa foi uma decisão intencional, não um desconhecimento da alternativa. Se houver necessidade futura de maior aderência ao protocolo x402 e/ou de capacidades baseadas em Soroban, o projeto poderá evoluir para:

- usar `@x402/stellar` como implementação de Stellar dentro do protocolo x402;
- avaliar middleware como `@x402/express` para rotas protegidas;
- aproximar o fluxo do padrão mais formal do ecossistema x402.

## O que é padrão e o que é decisão do POC

### Parte conceitualmente padrão do fluxo

- responder `402 Payment Required` quando o recurso premium exigir pagamento;
- retornar instruções de pagamento que o cliente consiga consumir;
- exigir uma prova de pagamento antes de liberar o recurso;
- verificar essa prova antes de responder `200`.

### Parte específica da implementação do TaskLoop

- usar Stellar Testnet como rail de pagamento;
- usar `txHash` como prova reenviada pelo cliente;
- consultar Horizon para verificar destino, valor, asset e memo;
- proteger o endpoint `POST /x402/distribution/unlock`;
- liberar um unlock simples de `distributionLimitGranted` sem assinatura, billing recorrente ou RBAC.

## Scripts de demonstração

Para facilitar a demo local do fluxo protegido, o repositório passa a ter três scripts complementares:

- `npm run demo:x402 -- <accountId>` para o fluxo semi-manual, em que a API responde `402` e o pagamento pode ser feito separadamente;
- `npm run demo:x402:e2e -- <accountId>` para o fluxo ponta a ponta automatizado;
- `npm run demo:x402:e2e -- pay <amount> <destination> "<memo>"` para enviar apenas o pagamento manualmente quando necessário.

Para o script E2E, a conta pagadora usa `X402_CLIENT_SECRET` como fonte principal. `X402_CLIENT_PUBLIC` pode ser mantida apenas como checagem opcional de consistência.

## O que não é objetivo agora

Fica fora do escopo desta sprint:

- settlement multi-asset completo;
- sistema avançado de invoices;
- prevenção exaustiva de replay em escala de produção;
- carteira embutida no frontend;
- experiência full self-custodial/polished.

Nada disso impede a demo do conceito central.

---

## Relação com o restante do POC

O x402 complementa a narrativa do TaskLoop em dois níveis:

1. **human-in-the-loop + payout automático**  
   mostra o pagamento saindo para o executor humano após validação.

2. **API monetizada para agentes**  
   mostra o caminho inverso: um agente ou sistema paga para consumir um recurso premium.

Assim, o projeto demonstra tanto pagamento de saída quanto pagamento de entrada dentro da economia de agentes.

---

## Mensagem curta para demo / RT

O x402 do TaskLoop será demonstrado com a rota `POST /x402/distribution/unlock`, em que o cliente recebe instruções de pagamento em Stellar Testnet e reenviará a requisição com `txHash` como prova. A API verificará o pagamento via Horizon antes de liberar o desbloqueio premium de distribuição.
