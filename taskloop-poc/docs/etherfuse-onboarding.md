"# Etherfuse — Onboarding Programático e Integração com TaskLoop

> Documento conceitual e técnico sobre o uso da Etherfuse como **Anchor** no ecossistema TaskLoop.
>
> Versão: Sprint 2 — Sandbox (Devnet) — **Onboarding funcional com dados reais**

---

## 📊 Resumo da Integração (válida em 22/05/2026)

| Item | Valor |
|------|-------|
| **Organização** | `24d15baf-76b5-4ae9-9018-96ac986f6ca8` |
| **Wallet Stellar** | `GBVVPVBXTPLXRVFPPR5OOYJZHHMIM4DAGXY6ROYTG43RLT2B7U7RVWLQ` |
| **Bank Account (PIX/BRL)** | `12051a49-c87a-45d0-a16d-3bb5fed97302` |
| **USDC no Stellar Testnet** | `USDC:GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5` |
| **Anchor Account (retornada)** | `GCUX6U4F5675FBA5LSVFCL7HGMRTMTXB4U2WSM5ZLUE4ORIHS6XNXY3X` |
| **Taxa de câmbio (50 USDC → MXN)** | `17.27` → `863.74 MXN` |

---

## 1. O papel da Anchor no TaskLoop

O TaskLoop lida com **micropagamentos em Stellar (XLM, USDC, EURC)** entre criadores de tarefas e workers.

O mundo real não vive em Stellar — vive em **PIX, TED, cartão, SPEI**.

A **Etherfuse** é a ponte entre esses dois mundos:

```
[ Mundo Real ]                    [ Stellar ]
PIX, TED, cartão, SPEI            XLM, USDC, EURC
       │                                │
       └──── Etherfuse FX API ──────────┘
            (on-ramp / off-ramp)
```

| Fluxo | Direção | Quem usa | Exemplo no TaskLoop |
|-------|---------|----------|---------------------|
| **On-ramp** | PIX/SPEI → XLM/USDC | Criador de tarefa | Empresa deposita R$ 100, recebe USDC na wallet, paga workers |
| **Off-ramp** | XLM/USDC → PIX/SPEI | Worker | Trabalhador saca 0.5 USDC recebidos, cai como PIX na conta |

---

## 2. Sandbox vs Produção

| Ambiente | URL | KYC | Fundos | Moedas |
|----------|-----|-----|--------|--------|
| **Sandbox (Devnet)** | `https://api.sand.etherfuse.com` | Auto-aprova com dados fictícios | Simulados — sem movimento real | CETES, TESOURO, USDC, EURC (testnet) |
| **Mainnet** | `https://api.etherfuse.com` | Análise real com documentos | Reais | USDC, EURC (mainnet) + moedas fiduciárias |

Na **sandbox**:
- KYC é **auto-aprovado** após submissão programática
- Dados bancários podem ser **fictícios** (CLABE, CURP, RFC) ou **PIX preenchido pela UI**
- Nenhum dinheiro real é movido
- Ideal para demonstração e validação de fluxo

**Nota importante:** O bank account pode ser criado pela UI em vez de programaticamente. A Etherfuse exige ativação (`status: "active"`) antes de criar orders. Na prática, a UI de devnet permite criar uma conta PIX (BRL) com dados de teste que já retorna ativa instantaneamente.

```bash
# Verificar status da conta bancária
curl -s https://api.sand.etherfuse.com/ramp/bank-account/BANK_ACCOUNT_ID \
  -H "Authorization: api_sand:<KEY>" | jq .
# expected: "status": "active_with_cep", "compliant": true
```

---

## 3. Fluxo de Onboarding Programático

Para usar a Etherfuse, todo usuário (pessoa física ou jurídica) precisa passar por este fluxo:

```
1. Criar organização (child org)
2. Submeter KYC (identidade + documentos)
3. Registrar wallet Stellar
4. Registrar conta bancária (CLABE)
5. Aceitar termos (presigned URL)
       ↓
   Organização apta a criar quotes e orders
```

Na sandbox, **apenas os passos 1, 2 e 4 são necessários** — KYC auto-aprova, e os agreements podem ser simulados.

### 3.1. Criar Organização

```
POST /ramp/organization
Authorization: api_sand:<KEY>

{
  "id": "<UUID do customer>",
  "displayName": "Ana García",
  "accountType": "personal",
  "userInfo": { "email": "ana@example.com", "displayName": "Ana García" },
  "wallets": [
    { "publicKey": "G...", "blockchain": "stellar" }
  ]
}
```

Retorna `organizationId` — usado em todos os passos seguintes.

### 3.2. Submeter KYC

```
POST /ramp/customer/{organizationId}/kyc

{
  "pubkey": "G...",
  "identity": {
    "email": "ana@example.com",
    "phoneNumber": "+525512345678",
    "name": { "givenName": "Ana", "familyName": "García" },
    "dateOfBirth": "1990-05-15",
    "address": { "street": "Av. Reforma 123", "city": "Mexico City", "region": "CDMX", "postalCode": "06600", "country": "MX" },
    "idNumbers": [
      { "value": "GAJU900515HDFRNN09", "type": "CURP" },
      { "value": "GAJU9005156V3", "type": "RFC" }
    ]
  }
}
```

> ⚡ Na sandbox, esta chamada já retorna `status: "approved"` — o KYC é automático.

### 3.3. Registrar Conta Bancária

```
POST /ramp/customer/{organizationId}/bank-account

{
  "account": {
    "transactionId": "<UUID>",
    "firstName": "Ana",
    "paternalLastName": "García",
    "maternalLastName": "López",
    "birthDate": "19900515",
    "birthCountryIsoCode": "MX",
    "curp": "GAJU900515HDFRNN09",
    "rfc": "GAJU9005156V3",
    "clabe": "012345678901234567"
  }
}
```

> Na sandbox, a CLABE pode ser fictícia (18 dígitos, não começando com `646`).

---

## 4. Fluxo de Negócio (Quote + Order)

Após o onboarding, o fluxo de negócio é:

### 4.1. Buscar Wallets da Organização

Antes de criar uma quote, é necessário buscar a wallet real da organização:

```
GET /ramp/customer/{organizationId}/wallets
```

```json
{
  "items": [
    {
      "walletId": "18781f1b-512b-4b0d-8fb3-3dd800ef0eb8",
      "customerId": "24d15baf-...",
      "publicKey": "GBVVPVBXTPLXRVFPPR5OOYJZHHMIM4DAGXY6ROYTG43RLT2B7U7RVWLQ",
      "blockchain": "stellar",
      "kycStatus": "approved"
    }
  ]
}
```

> ⚠️ A wallet registrada na Etherfuse **pode ser diferente** da wallet fixa configurada no `.env`. Sempre use a `publicKey` retornada pela API.

### 4.2. Listar Assets Disponíveis

```
GET /ramp/assets?blockchain=stellar&currency=mxn
```

Retorna os stablecoins e stablebonds disponíveis para a wallet consultada.

### 4.3. Criar Quote (Cotação)

```
POST /ramp/quote

{
  "quoteId": "<UUID>",
  "customerId": "<organizationId>",
  "blockchain": "stellar",
  "quoteAssets": {
    "type": "offramp",
    "sourceAsset": "USDC:GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
    "targetAsset": "MXN"
  },
  "sourceAmount": "50",
  "walletAddress": "GBVVPVBX..." <-- USAR A PUBLICKEY DA WALLET REAL
}
```

**Atenção:** O `walletAddress` deve ser a `publicKey` da wallet registrada na organização (retornada pelo passo 4.1), **não** um endereço externo. Se a wallet não coincidir, a order falha com `"Order wallet does not match the wallet used when generating this quote"`.

Retorna taxa de câmbio, valor destino, fee e validade.

### 4.4. Criar Order (Ordem de Pagamento)

```
POST /ramp/order

{
  "orderId": "<UUID>",
  "quoteId": "<UUID da quote>",
  "bankAccountId": "<UUID do bank account>",
  "cryptoWalletId": "<walletId da wallet registrada>",
  "useAnchor": true
}
```

**Obrigatório:**
- `cryptoWalletId` (UUID interno da wallet) **ou** `publicKey` — a Etherfuse exige que a wallet tenha KYC aprovado e termos aceitos
- `bankAccountId` deve ser uma conta ativa (`status: "active"`)

Para **offramp com `useAnchor: true`**, a resposta inclui:

```json
{
  "offramp": {
    "orderId": "<UUID>",
    "withdrawAnchorAccount": "GCUX6U4F5675FBA5LSVFCL7HGMRTMTXB4U2WSM5ZLUE4ORIHS6XNXY3X",
    "withdrawMemo": "EAd2cmZcRbWN2BMv5Bje3AAAAAAAAAAAAAAAAAAAAAA=",
    "withdrawMemoType": "hash"
  }
}
```

### 4.5. Enviar Pagamento para a Âncora

```
1. Worker (ou sistema) envia USDC/XLM para withdrawAnchorAccount
2. Inclui withdrawMemo como memo da transação Stellar
3. Etherfuse detecta, converte e deposita MXN na conta bancária do worker
```

---

## 5. Integração com o TaskLoop

No TaskLoop, a Etherfuse se conecta em dois pontos:

### On-ramp (entrada de fundos)

```
Criador de tarefa
    ↓  PIX/SPEI
Etherfuse (on-ramp)
    ↓  USDC/XLM
Wallet Stellar do criador
    ↓
TaskLoop: criar tarefas e pagar workers
```

### Off-ramp (saque do worker)

```
Worker recebe pagamento (USDC/XLM)
    ↓
Worker solicita saque via TaskLoop
    ↓
TaskLoop chama Etherfuse (off-ramp)
    ↓  quote → order → withdrawAnchorAccount + memo
Worker envia tokens para a Âncora
    ↓
Etherfuse deposita PIX/SPEI na conta do worker
```

### Adapter e Rotas

O TaskLoop possui um adapter Etherfuse em:

```
taskloop-poc/apps/api/src/services/etherfuse-adapter.ts
taskloop-poc/apps/api/src/routes/anchor.ts
```

Com as rotas:

| Rota | Função |
|------|--------|
| `GET /anchor/etherfuse/config` | Retorna configuração (real ou mock) com wallet, customerId, bankAccountId |
| `GET /anchor/etherfuse/assets` | Lista assets disponíveis |
| `POST /anchor/etherfuse/quote` | Cria cotação |
| `POST /anchor/etherfuse/order` | Cria ordem (onramp/offramp) |
| `GET /anchor/etherfuse/order/:orderId` | Consulta status da ordem |

O endpoint `/config` permite que o frontend descubra automaticamente se está em modo real ou mock:

```json
// Modo real (quando ETHERFUSE_API_KEY + ORGANIZATION_ID + BANK_ACCOUNT_ID estão configurados)
{
  "provider": "etherfuse",
  "mode": "real",
  "blockchain": "stellar",
  "currency": "mxn",
  "organizationId": "24d15baf-...",
  "walletAddress": "GBVVPVBX...",
  "customerId": "24d15baf-...",
  "bankAccountId": "12051a49-..."
}

// Modo mock (fallback)
{
  "provider": "etherfuse",
  "mode": "mock",
  "walletAddress": "GDEMO_TASKLOOP_WORKER",
  "customerId": "demo-customer",
  "bankAccountId": "demo-bank-account-mx"
}
```

### Componente Frontend

O componente `AnchorSettlement` (`taskloop-web/src/components/AnchorSettlement.tsx`) foi atualizado para:

1. Carregar `/anchor/etherfuse/config` ao montar
2. Usar os dados reais (walletAddress, customerId, bankAccountId) recebidos
3. Exibir badge **"live mode"** quando configurado, ou **"mock mode"** como fallback
4. Usar o identificador correto do USDC: `USDC:GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5`

---

## 6. Script de Onboarding

O repositório inclui o script `scripts/demo-onboarding-etherfuse.ts` que executa o onboarding completo de forma programática:

```bash
# Configurar no .env (apps/api/.env):
ETHERFUSE_API_KEY=api_sand:<sua_chave>
ETHERFUSE_ORGANIZATION_ID=24d15baf-...           # Opcional: usar organização existente
ETHERFUSE_BANK_ACCOUNT_ID=12051a49-...            # Opcional: usar bank account existente
ETHERFUSE_USE_MOCK=false

# Rodar onboarding (cria do zero ou usa IDs existentes)
make demo-onboarding
```

O script:
1. Cria organização com dados fictícios (ou usa existente via `.env`)
2. Submete KYC (auto-aprovado na sandbox)
3. Registra wallet Stellar
4. Registra bank account (ou usa existente)
5. Busca wallet real da organização (passo importante!)
6. Cria quote com a wallet correta
7. Cria order com `cryptoWalletId` da wallet real
8. Exibe `withdrawAnchorAccount` e memo

### Exemplo de saída (real, 22/05/2026)

```
═══ 4. Buscar wallet registrada ═══
Wallet ID: 18781f1b-512b-4b0d-8fb3-3dd800ef0eb8
Public key: GBVVPVBXTPLXRVFPPR5OOYJZHHMIM4DAGXY6ROYTG43RLT2B7U7RVWLQ
KYC: approved

═══ 5. Testar quote (offramp) ═══
Quote ID: 2f612b49-7373-4dfd-88cb-9a6942bd5af3
Source: 50 USDC:GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5
Destination: 863.73906 MXN
Exchange rate: 17.27478120
Expires: 2026-05-22T18:20:15.666118111Z

═══ 6. Testar order (offramp + anchor) ═══
✅ Order (offramp):
  Order ID: 10077672-665c-45b5-8dd8-132fe418dedc
  Withdraw anchor account: GCUX6U4F5675FBA5LSVFCL7HGMRTMTXB4U2WSM5ZLUE4ORIHS6XNXY3X
  Memo: EAd2cmZcRbWN2BMv5Bje3AAAAAAAAAAAAAAAAAAAAAA=
  Memo type: hash

═══ Onboarding concluído! ═══
Organization ID: 24d15baf-...
Bank Account ID: 12051a49-...
Próximo passo: enviar USDC/XLM para a withdrawAnchorAccount com o memo informado.
```

---

## 7. Próximos Passos (Mainnet)

Para produção (Mainnet), o fluxo é o mesmo, mas com dados reais:

| Etapa | Sandbox (atual) | Mainnet |
|-------|-----------------|---------|
| KYC | Auto-aprovado | Análise manual com documentos reais |
| Bank Account | PIX fictício (via UI) ou CLABE fictícia | CLABE/PIX real em nome do usuário |
| Fundos | Simulados — USDC testnet | Reais (PIX/SPEI → USDC mainnet) |
| API Key | `api_sand:<key>` | `api:<key>` |
| URL | `api.sand.etherfuse.com` | `api.etherfuse.com` |
| Wallet | Deve estar registrada na organização + KYC | Idem |

## 8. Checklist para Mainnet

- [ ] Criar conta em `https://etherfuse.com` (produção)
- [ ] Completar KYB (Business) da plataforma
- [ ] Gerar API key de produção (`api_...`)
- [ ] Criar child organizations para cada cliente final
- [ ] Cada cliente passa KYC completo (documentos reais)
- [ ] Cada cliente registra CLABE/PIX real
- [ ] Quotes e orders com valores reais

---

## 8. Referências

- [Script de Onboarding](taskloop-poc/scripts/demo-onboarding-etherfuse.ts)
- [Adapter Etherfuse](taskloop-poc/apps/api/src/services/etherfuse-adapter.ts)
- [Rotas Anchor](taskloop-poc/apps/api/src/routes/anchor.ts)
- [Componente Frontend AnchorSettlement](taskloop-poc/apps/taskloop-web/src/components/AnchorSettlement.tsx)
- [Documentação oficial Etherfuse](https://docs.etherfuse.com)
- [Onboarding Programático](https://docs.etherfuse.com/guides/onboarding-programmatic)
- [Test Environment (Sandbox)](https://docs.etherfuse.com/test-environment)
- [Stellar Expert — USDC Testnet](https://stellar.expert/explorer/testnet/asset/USDC-GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5)
"