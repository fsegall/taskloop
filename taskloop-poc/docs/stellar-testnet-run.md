# Stellar Testnet run — payout automático validado

Este documento registra uma execução real de payout em **Stellar Testnet** dentro do fluxo da Sprint 2 do TaskLoop.

Objetivo do registro:

- guardar a evidência da transação real;
- demonstrar que o backend executou payout automático após aprovação;
- registrar o `txHash` e os metadados principais para referência futura na demo e no RT.

---

## Contexto do teste

Fluxo validado:

1. criação da task na API;
2. envio da task;
3. submissão com `walletAddress` válida;
4. aprovação da submission;
5. disparo automático do payout;
6. validação do resultado no Stellar Expert.

Task utilizada:

- `taskId`: `task_mp7tc02o_0t126e`
- título: `Stellar payout validation task`
- reward: `1.5 XLM`

Submission aprovada:

- `submissionId`: `sub_mp7tf94l_1cpu70`
- usuário: `Felipe`
- handle: `@fsegall`
- destination wallet: `GDYGS6A5ZVHUEJWLYBMRUBM75DUYPKJFUYZVYLUV75AF37XL3ICAZTY6`

Payout gerado pela API:

- `payoutId`: `payout_mp7th584_p3rlj8`
- `provider`: `stellar-testnet`
- `status`: `paid`
- `txHash`: `d4b870fb96525c7e5f973bf27960c1738f6b254902359fd2aa2ad94837e23978`

---

## Explorer

- Stellar Expert:  
  `https://stellar.expert/explorer/testnet/tx/d4b870fb96525c7e5f973bf27960c1738f6b254902359fd2aa2ad94837e23978`

---

## Dados da transação no explorer

### Summary

- Status: `Successful`
- Ledger: `2578990`
- Source Account: `GDUIPC…FJOD74`
- Sequence Number: `10821530879524867`
- Transaction size: `248 bytes`
- Processed: `2026-05-16 03:59:00 UTC`
- Max Fee: `0.00001 XLM`
- Fee Charged: `0.00001 XLM`
- Memo (TEXT): `TaskLoop payout for task_mp7`

### Preconditions

- Valid before: `2026-05-16 03:59:23`

### Payment operation

- `GDUI…OD74` sent `1.5 XLM` to `GDYG…ZTY6`

### Signature

- `GDUIPC…FJOD74`:  
  `c0oaECCDLnN8VEjDySwGzDGc277noRBs4UTn4yN/NmZFAgGdK+gXrqulHHl9fZCADdMsLdLydQuDtBfcGxRrCQ==`

---

## O que este run comprova

Este run comprova que o TaskLoop já demonstrou, no backend:

- payout real em Stellar Testnet;
- uso de XLM como fluxo principal do POC;
- retorno e persistência de `txHash`;
- integração do payout ao lifecycle de aprovação;
- evidência auditável da transação em explorer público.

Em termos de narrativa de produto, este teste valida a frase-guia da Sprint 2:

> Após a resposta humana ser validada por agente, o sistema executa automaticamente o pagamento.

---

## Observações

- o `Validation Agent` usado neste run ainda foi o fallback local/mock, mas o payout foi real;
- o `Telegram adapter` permaneceu simulado neste fluxo;
- isso é aceitável para a Sprint 2 porque a trilha crítica da demo é a liquidação automática em Stellar Testnet.
