# Anchor / Etherfuse — adapter do POC

Este documento registra a estratégia atual do TaskLoop para a trilha de **Anchor / Etherfuse** na Sprint 2.

## Objetivo

Demonstrar um fluxo mínimo compatível com **Anchor mode** da Etherfuse em sandbox/testnet sem bloquear a demo principal do projeto.

No POC, o adapter cobre o contrato mínimo pedido no checklist:

- listar assets rampáveis;
- criar quote;
- criar order/payout;
- consultar status.

## Decisão de implementação

A integração foi exposta na API por uma camada isolada em rotas dedicadas:

- `GET /anchor/etherfuse/assets`
- `POST /anchor/etherfuse/quote`
- `POST /anchor/etherfuse/order`
- `GET /anchor/etherfuse/order/:orderId`

O cliente usa a sandbox da Etherfuse por padrão:

- base URL default: `https://api.sand.etherfuse.com`

Autenticação esperada:

- header `Authorization: <ETHERFUSE_API_KEY>`
- sem prefixo `Bearer`

## Estado atual da trilha

Nesta sprint, a integração foi **implementada como adapter e validada em modo mock**.

O motivo não foi ausência de estrutura técnica no código, mas uma limitação prática de onboarding no ambiente atual da Etherfuse: neste momento, **não conseguimos concluir a geração de credenciais reais** porque o fluxo de `bank account` necessário para o sandbox ainda não atende o nosso contexto no Brasil.

Com isso:

- o contrato técnico da integração foi estruturado no backend;
- as rotas de assets / quote / order / status foram expostas;
- o fallback mockado foi mantido como caminho oficial desta sprint;
- a validação com credenciais reais fica explicitamente adiada para a próxima sprint.

## Modo real vs. modo mock

### Modo real

Quando `ETHERFUSE_API_KEY` estiver configurada, o adapter tenta chamar a API real da Etherfuse sandbox.

Env principal esperado:

- `ETHERFUSE_API_KEY`
- `ETHERFUSE_BASE_URL` opcional
- `ETHERFUSE_USE_MOCK=false` ou ausente

No entanto, este modo ficou **pendente de credenciais reais** porque não conseguimos completar o onboarding exigido para gerar a chave no cenário atual.

### Modo mock

Se `ETHERFUSE_API_KEY` estiver ausente, ou se `ETHERFUSE_USE_MOCK=true`, a API usa um fallback mockado com o mesmo contrato de resposta.

Este é o modo oficialmente adotado nesta sprint.

Isso foi mantido deliberadamente para não bloquear a demo principal quando o sandbox ou as credenciais ainda não estiverem prontos.

## Fluxo-alvo para próxima sprint

Para a submissão “MVP com Âncora no Testnet”, o fluxo-alvo continua sendo:

1. obter os assets disponíveis para a wallet do cliente;
2. criar uma quote de `offramp` em `stellar`;
3. criar a order com `useAnchor: true`;
4. receber `withdrawAnchorAccount`, `withdrawMemo` e `withdrawMemoType`;
5. enviar o pagamento Stellar para a conta da âncora com o memo correto;
6. consultar `GET /anchor/etherfuse/order/:orderId` até confirmar progresso do status.

## Exemplos de uso

### 1. Consultar assets

```text
GET /anchor/etherfuse/assets?wallet=G...&blockchain=stellar&currency=mxn
```

### 2. Criar quote

```json
{
  "customerId": "uuid-do-cliente",
  "blockchain": "stellar",
  "type": "offramp",
  "sourceAsset": "USDC:GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN",
  "targetAsset": "MXN",
  "sourceAmount": "50",
  "walletAddress": "G..."
}
```

### 3. Criar order em anchor mode

```json
{
  "bankAccountId": "uuid-da-conta-bancaria",
  "cryptoWalletId": "uuid-da-wallet-registrada",
  "quoteId": "uuid-da-quote",
  "useAnchor": true
}
```

Resposta esperada para `offramp` com anchor mode:

```json
{
  "provider": "etherfuse",
  "mode": "order",
  "order": {
    "orderId": "uuid",
    "orderType": "offramp",
    "isAnchorOrder": true,
    "withdrawAnchorAccount": "G...",
    "withdrawMemo": "base64...",
    "withdrawMemoType": "hash"
  }
}
```

## Estado atual do checklist

Já coberto no código:

- contrato mínimo do adapter;
- rotas dedicadas para assets, quote, order e status;
- fallback mockado com o mesmo contrato;
- documentação explícita de quando o fluxo está mockado.

Limitação encontrada nesta sprint:

- não foi possível gerar `ETHERFUSE_API_KEY` real porque o fluxo necessário de `bank account` no ambiente atual não atende o nosso contexto no Brasil;
- por isso, não conseguimos concluir o onboarding completo exigido pela sandbox para validar o fluxo end-to-end com credenciais reais.

Decisão tomada:

- manter Etherfuse documentado e implementado como adapter pronto para ativação;
- preservar o modo mock como estado oficial desta sprint;
- mover a validação real com credenciais para a próxima sprint.

Próximos passos planejados:

- revisar disponibilidade e requisitos de onboarding da Etherfuse para nossa região;
- obter credenciais reais quando o fluxo estiver disponível;
- conectar wallet, customer e bank account válidos no sandbox;
- gravar um vídeo do fluxo completo em Anchor mode na testnet.
