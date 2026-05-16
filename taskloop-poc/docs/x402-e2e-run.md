# x402 E2E run — API protegida validada em Stellar Testnet

Este documento registra uma execução real do fluxo **x402 mínimo funcional** do TaskLoop com pagamento em **Stellar Testnet** e liberação programática de recurso após verificação de `txHash`.

Objetivo do registro:

- guardar a evidência do fluxo protegido por `402 Payment Required`;
- demonstrar que o script `demo-x402-e2e.ts` executa o ciclo completo de request → pagamento → prova → unlock;
- registrar o `txHash`, os dados do pagamento e a resposta final da API para referência futura na demo e no RT.

---

## Contexto do teste

Comando executado:

```text
npm run demo:x402:e2e -- demo-client-001
```

Fluxo validado:

1. cliente chama `POST /x402/distribution/unlock` com `accountId`;
2. API responde `402 Payment Required`;
3. API retorna instruções de pagamento em Stellar Testnet;
4. script envia o pagamento com a conta pagadora configurada em `X402_CLIENT_SECRET`;
5. script captura o `txHash` da transação;
6. script reenvía a requisição com `accountId + txHash`;
7. API valida a transação no Horizon;
8. API libera o recurso premium com `200`.

Identificador do cliente usado no run:

- `accountId`: `demo-client-001`

---

## Resposta inicial da API

Status retornado:

- `HTTP 402`

Payload relevante:

- `error`: `Payment required.`
- `payment.amount`: `0.1`
- `payment.asset`: `XLM`
- `payment.destination`: `GDUIPC7QY3EPLAHSQRFHWZKAK6GDPRUQKH7PKMXWPVTDF2SVKMFJOD74`
- `payment.memo`: `taskloop-x402-6db85d96a8`
- `payment.network`: `testnet`
- `payment.horizonUrl`: `https://horizon-testnet.stellar.org`
- `resource.type`: `distribution_unlock`
- `resource.distributionLimitGranted`: `100`

---

## Pagamento executado

Conta pagadora usada no script:

- `payerPublicKey`: `GDG3UXKOJYWDQ42USJACZW6E2R4RWKEUBOPRKHQI44DJROPVYTX6APQP`

Dados do pagamento:

- destino: `GDUIPC7QY3EPLAHSQRFHWZKAK6GDPRUQKH7PKMXWPVTDF2SVKMFJOD74`
- valor: `0.1 XLM`
- memo: `taskloop-x402-6db85d96a8`

Transação gerada:

- `txHash`: `4d6057e17e35c97e0585c53ae3ee104e5013edb4ed695a616158199ee063518a`

---

## Explorer

- Stellar Expert:
  `https://stellar.expert/explorer/testnet/tx/4d6057e17e35c97e0585c53ae3ee104e5013edb4ed695a616158199ee063518a`

---

## Resposta verificada da API

Status retornado após reenviar com prova:

- `HTTP 200`

Payload relevante:

- `premiumUnlocked`: `true`
- `accountId`: `demo-client-001`
- `distributionLimitGranted`: `100`
- `txHash`: `4d6057e17e35c97e0585c53ae3ee104e5013edb4ed695a616158199ee063518a`
- `payment.amount`: `0.1`
- `payment.asset`: `XLM`
- `payment.destination`: `GDUIPC7QY3EPLAHSQRFHWZKAK6GDPRUQKH7PKMXWPVTDF2SVKMFJOD74`
- `payment.memo`: `taskloop-x402-6db85d96a8`
- `payment.network`: `testnet`

Mensagem final do script:

- `✅ x402 E2E flow completed successfully.`

---

## O que este run comprova

Este run comprova que o TaskLoop já demonstrou, de ponta a ponta:

- uma rota protegida por `402 Payment Required`;
- instruções de pagamento legíveis por cliente;
- pagamento real em Stellar Testnet;
- reenvio de prova com `txHash`;
- verificação programática via Horizon;
- liberação do recurso premium apenas após validação da transação.

Em termos de narrativa de produto, este teste valida que o TaskLoop já consegue demonstrar uma **API monetizada** com pagamento real e unlock programático de capacidade premium.

---

## Observações

- o fluxo registrado aqui é um **x402 mínimo funcional** do POC, não uma implementação completa do ecossistema x402 em produção;
- a prova usada neste modelo é o `txHash`, validado contra destino, valor, asset e memo esperados;
- o script E2E automatiza a demo, mas o repositório também mantém o cliente semi-manual `demo-x402-client.ts` para inspeção mais didática do fluxo.
