# Anchor / Etherfuse — Integração com API Sandbox (Modo Real)

> **Status:** ✅ Funcional — fluxo completo validado com dados reais na sandbox.
> **Data da validação:** 22/05/2026

---

## 1. Objetivo

Demonstrar o fluxo de **off-ramp com Anchor mode** da Etherfuse em sandbox, conectando o ecossistema Stellar (USDC) ao sistema bancário mexicano (MXN via PIX).

Fluxo completo:

```
[Frontend] → API (adapter) → Etherfuse Sandbox → quote → order → anchor account + memo
```

---

## 2. Dados da Integração (Sandbox Real)

| Item | Valor |
|------|-------|
| **Organização** | `24d15baf-76b5-4ae9-9018-96ac986f6ca8` |
| **Wallet Stellar (registrada)** | `GBVVPVBXTPLXRVFPPR5OOYJZHHMIM4DAGXY6ROYTG43RLT2B7U7RVWLQ` |
| **Wallet ID (cryptoWalletId)** | `18781f1b-512b-4b0d-8fb3-3dd800ef0eb8` |
| **Bank Account (PIX/BRL)** | `12051a49-c87a-45d0-a16d-3bb5fed97302` |
| **USDC no Stellar Testnet** | `USDC:GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5` |
| **Anchor Account (retornada)** | `GCUX6U4F5675FBA5LSVFCL7HGMRTMTXB4U2WSM5ZLUE4ORIHS6XNXY3X` |
| **Taxa de câmbio (50 USDC → MXN)** | `17.27` → `863.74 MXN` |
| **API Base URL** | `https://api.sand.etherfuse.com` |
| **API Key** | `api_sand:...` |

---

## 3. Arquitetura

```
[React Frontend]                [Express API]                   [Etherfuse Sandbox]
     │                              │                              │
     ├── GET  /config ──────────────┤                              │
     │                              ├── GET /ramp/customer/{id}/wallets ──┤
     │                              │                              │
     ├── GET  /assets ──────────────┤                              │
     │                              ├── GET /ramp/assets ──────────┤
     │                              │                              │
     ├── POST /quote ──────────────┤                              │
     │                              ├── POST /ramp/quote ──────────┤
     │                              │                              │
     ├── POST /order ──────────────┤                              │
     │                              ├── POST /ramp/order ──────────┤
```

### Componentes

| Camada | Arquivo | Função |
|--------|---------|--------|
| **Adapter (API)** | `apps/api/src/services/etherfuse-adapter.ts` | Cliente HTTP com mock fallback |
| **Rotas (API)** | `apps/api/src/routes/anchor.ts` | Endpoints REST + logs de auditoria |
| **Componente (Frontend)** | `apps/taskloop-web/src/components/AnchorSettlement.tsx` | UI do fluxo com 3 steps animados |
| **Script de Onboarding** | `scripts/demo-onboarding-etherfuse.ts` | Criação programática de org + KYC + bank |

---

## 4. Endpoints da API

### `GET /anchor/etherfuse/config`

Retorna a configuração dinâmica para o frontend. Busca a wallet real da organização via API da Etherfuse.

```json
{
  "provider": "etherfuse",
  "mode": "real",
  "blockchain": "stellar",
  "currency": "mxn",
  "organizationId": "24d15baf-...",
  "walletAddress": "GBVVPVBX...",
  "cryptoWalletId": "18781f1b-...",
  "customerId": "24d15baf-...",
  "bankAccountId": "12051a49-..."
}
```

> ⚠️ O `cryptoWalletId` é essencial para a order. Sem ele, a Etherfuse rejeita com `"Terms and conditions have not been completed for the selected wallet"`.

### `GET /anchor/etherfuse/assets?wallet=...&blockchain=...&currency=...`

Lista os assets disponíveis para a wallet consultada.

### `POST /anchor/etherfuse/quote`

```json
{
  "customerId": "24d15baf-...",
  "blockchain": "stellar",
  "type": "offramp",
  "sourceAsset": "USDC:GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
  "targetAsset": "MXN",
  "sourceAmount": "50",
  "walletAddress": "GBVVPVBX..."
}
```

> **Atenção:** `walletAddress` deve ser a `publicKey` **da wallet registrada na organização**, não um endereço externo. Se a wallet não coincidir, a order falha com `"Order wallet does not match the wallet used when generating this quote"`.

### `POST /anchor/etherfuse/order`

```json
{
  "bankAccountId": "12051a49-...",
  "quoteId": "2f612b49-...",
  "cryptoWalletId": "18781f1b-...",
  "useAnchor": true
}
```

Resposta:

```json
{
  "order": {
    "orderId": "10077672-...",
    "orderType": "offramp",
    "isAnchorOrder": true,
    "withdrawAnchorAccount": "GCUX6U4F5675FBA5LSVFCL7HGMRTMTXB4U2WSM5ZLUE4ORIHS6XNXY3X",
    "withdrawMemo": "EAd2cmZcRbWN2BMv5Bje3AAAAAAAAAAAAAAAAAAAAAA=",
    "withdrawMemoType": "hash"
  }
}
```

---

## 5. Modo Real vs. Modo Mock

| Característica | Modo Mock | Modo Real |
|----------------|-----------|-----------|
| **Variável de controle** | `ETHERFUSE_USE_MOCK=true` | `ETHERFUSE_USE_MOCK=false` |
| **Requer API Key?** | Não | Sim (`ETHERFUSE_API_KEY`) |
| **Requer Org + Bank IDs?** | Não | Sim |
| **Dados retornados** | Fictícios | Reais da sandbox |
| **Badge no frontend** | `mock mode` (amarelo) | `live mode` (verde) |
| **Útil para** | Desenvolvimento / testes off-line | Demos / validação E2E |

### Fallback automático

O frontend descobre o modo automaticamente via `GET /anchor/etherfuse/config`:

```typescript
// Em AnchorSettlement.tsx
const config = await fetch(`${base}/anchor/etherfuse/config`);
if (config.mode === "real") {
  // usa dados reais: walletAddress, customerId, bankAccountId, cryptoWalletId
} else {
  // usa fallback mock: GDEMO_TASKLOOP_WORKER, demo-bank-account-mx
}
```

---

## 6. Onboarding Programático

O script `scripts/demo-onboarding-etherfuse.ts` automatiza a criação de:

1. Organização (child org) com wallet Stellar
2. KYC (auto-aprovado na sandbox)
3. Bank account (CLABE fictícia ou PIX via UI)
4. Quote + Order com anchor mode

```bash
# Usar organização e bank account existentes (criados pela UI)
make demo-onboarding
```

O script busca automaticamente a wallet real da organização via API e usa `cryptoWalletId` na order.

---

## 7. Gravação de Vídeo Demo

```bash
make demo-anchor-video
```

Este target:
1. Verifica se `.env` está configurado com dados reais
2. Mostra instruções para abrir frontend em paralelo
3. Inicia a API com logging visível

Os logs aparecem no terminal em tempo real:

```
[14:32:15] [Etherfuse] GET /config
[14:32:20] [Etherfuse] GET /assets  wallet=GBVVPVBX...
[14:32:22] [Etherfuse] POST /quote  50 USDC → MXN  customer=24d15baf...
[14:32:24] [Etherfuse] POST /order  quote=2f612b49...  bank=12051a49...  wallet=18781f1b...
```

---

## 8. Checklist de Integração

### ✅ Concluído

- [x] Adapter com cliente real e mock fallback
- [x] Rotas REST: assets, quote, order, status, config
- [x] Descoberta automática de modo (real vs mock)
- [x] Logs de auditoria com timestamp no terminal
- [x] Componente frontend com 3 steps animados
- [x] Suporte a `cryptoWalletId` (necessário para wallets com KYC)
- [x] Onboarding programático (script autônomo)
- [x] Documentação atualizada
- [x] Validação E2E com dados reais na sandbox
- [x] Badge dinâmico (live mode / mock mode)

### 🔜 Pendente (Mainnet)

- [ ] Obter credenciais de produção (`api:...`)
- [ ] KYB (Know Your Business) da plataforma TaskLoop
- [ ] KYC individual para cada cliente final
- [ ] Contas bancárias reais (CLABE/PIX)
- [ ] Transações com valores reais

---

## 9. Variáveis de Ambiente

```env
# .env (taskloop-poc/apps/api/.env)
ETHERFUSE_API_KEY=api_sand:6602e7f2-...
ETHERFUSE_BASE_URL=https://api.sand.etherfuse.com
ETHERFUSE_USE_MOCK=false
ETHERFUSE_ORGANIZATION_ID=24d15baf-76b5-4ae9-9018-96ac986f6ca8
ETHERFUSE_BANK_ACCOUNT_ID=12051a49-c87a-45d0-a16d-3bb5fed97302
ETHERFUSE_PUBLIC_KEY=GBVVPVBXTPLXRVFPPR5OOYJZHHMIM4DAGXY6ROYTG43RLT2B7U7RVWLQ
```

---

## 10. Referências

- [Documentação oficial Etherfuse](https://docs.etherfuse.com)
- [Onboarding Programático](https://docs.etherfuse.com/guides/onboarding-programmatic)
- [Test Environment (Sandbox)](https://docs.etherfuse.com/test-environment)
- [Documentação completa no repositório](etherfuse-onboarding.md)
- [Adapter (código)](../apps/api/src/services/etherfuse-adapter.ts)
- [Rotas (código)](../apps/api/src/routes/anchor.ts)
- [Componente frontend (código)](../apps/taskloop-web/src/components/AnchorSettlement.tsx)
- [Script de onboarding (código)](../scripts/demo-onboarding-etherfuse.ts)
