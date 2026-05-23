fsegall@fsegall-Inspiron-5502-HD2:~/Desktop/Projects/TaskLoop$ make demo-onboarding
cd taskloop-poc && npm run demo:onboarding-etherfuse

> demo:onboarding-etherfuse
> tsx scripts/demo-onboarding-etherfuse.ts

[env] Carregando: /home/fsegall/Desktop/Projects/TaskLoop/taskloop-poc/.env
◇ injected env (10) from .env // tip: ⌁ auth for agents [www.vestauth.com]
[env] Carregando: /home/fsegall/Desktop/Projects/TaskLoop/taskloop-poc/apps/api/.env
◇ injected env (3) from apps/api/.env // tip: ⌘ enable debugging { debug: true }
[env] ETHERFUSE_API_KEY= ✅ presente
Etherfuse — Onboarding Programático (Sandbox)
API URL: https://api.sand.etherfuse.com

═══ 0. IDs gerados ═══
Customer ID: 00e803d0-153e-4789-86cf-bbfe72c83d80
Wallet: GDOSRWE3TQSNU26XLKSHJIVWH3FKREUMRDC2CK4LTME6NEFQUQ4Z73WW

═══ 1. Usando organização e bank account existentes ═══
Organization ID: 24d15baf-76b5-4ae9-9018-96ac986f6ca8
Bank Account ID: 12051a49-c87a-45d0-a16d-3bb5fed97302
(Para criar do zero, remova ETHERFUSE_ORGANIZATION_ID e ETHERFUSE_BANK_ACCOUNT_ID do .env)

═══ 4. Buscar wallet registrada ═══
Wallet ID: 18781f1b-512b-4b0d-8fb3-3dd800ef0eb8
Public key: GBVVPVBXTPLXRVFPPR5OOYJZHHMIM4DAGXY6ROYTG43RLT2B7U7RVWLQ
KYC: approved

═══ 5. Testar quote (offramp) ═══
Quote payload: {
  "quoteId": "2f612b49-7373-4dfd-88cb-9a6942bd5af3",
  "customerId": "24d15baf-76b5-4ae9-9018-96ac986f6ca8",
  "blockchain": "stellar",
  "quoteAssets": {
    "type": "offramp",
    "sourceAsset": "USDC:GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
    "targetAsset": "MXN"
  },
  "sourceAmount": "50",
  "walletAddress": "GBVVPVBXTPLXRVFPPR5OOYJZHHMIM4DAGXY6ROYTG43RLT2B7U7RVWLQ"
}
✅ Quote:
   Quote ID: 2f612b49-7373-4dfd-88cb-9a6942bd5af3
   Source: 50 USDC:GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5
   Destination: 863.73906 MXN
   Exchange rate: 17.27478120
   Expires: 2026-05-22T18:20:15.666118111Z

═══ 6. Testar order (offramp + anchor) ═══
Order payload: {
  "orderId": "10077672-665c-45b5-8dd8-132fe418dedc",
  "quoteId": "2f612b49-7373-4dfd-88cb-9a6942bd5af3",
  "bankAccountId": "12051a49-c87a-45d0-a16d-3bb5fed97302",
  "useAnchor": true,
  "cryptoWalletId": "18781f1b-512b-4b0d-8fb3-3dd800ef0eb8"
}
✅ Order (offramp):
   Order ID: 10077672-665c-45b5-8dd8-132fe418dedc
   Withdraw anchor account: GCUX6U4F5675FBA5LSVFCL7HGMRTMTXB4U2WSM5ZLUE4ORIHS6XNXY3X
   Memo: EAd2cmZcRbWN2BMv5Bje3AAAAAAAAAAAAAAAAAAAAAA=
   Memo type: hash

═══ Onboarding concluído! ═══
Organization ID: 24d15baf-76b5-4ae9-9018-96ac986f6ca8
Bank Account ID: 12051a49-c87a-45d0-a16d-3bb5fed97302

Próximo passo: enviar USDC/XLM para a withdrawAnchorAccount com o memo informado.

BOOM! 🚀 Funcionou! 🎉

O fluxo completo de onboarding programático + off-ramp com anchor está rodando na Etherfuse Sandbox com dados reais. Aqui está o resumo:

✅ Resultado Final
Etapa	Status
Organização (existente)	✅ 24d15baf-76b5-4ae9-9018-96ac986f6ca8
Wallet registrada	✅ GBVVPVBX... (KYC approved)
Bank Account (via UI)	✅ 12051a49-c87a-45d0-a16d-3bb5fed97302 (PIX, BRL)
Quote (50 USDC → MXN)	✅ Taxa: 17.27 → 863.74 MXN
Order (offramp + anchor)	✅ Sucesso!
Dados da Order

Apply
Withdraw Anchor Account: GCUX6U4F5675FBA5LSVFCL7HGMRTMTXB4U2WSM5ZLUE4ORIHS6XNXY3X
Memo (hash):             EAd2cmZcRbWN2BMv5Bje3AAAAAAAAAAAAAAAAAAAAAA=
👉 Este é o pagamento que o worker faria: enviar USDC para a conta da Âncora com esse memo, e a Etherfuse deposita BRL na conta PIX.

📋 O que já está pronto
Script de onboarding: scripts/demo-onboarding-etherfuse.ts
Documentação conceitual: docs/etherfuse-onboarding.md
Make target: make demo-onboarding
Adapter no backend: rotas /anchor/etherfuse/* com suporte a mode real e mock
🔜 Próximos passos para a Sprint
Gravar o vídeo da demo mostrando o fluxo do worker:

make demo-lifecycle (payout Stellar real)
make demo-onboarding (quote → order → anchor account + memo)
Atualizar o adapter do backend para usar a wallet correta (a da organização, não a fixa do .env) quando estiver no modo real.

Integrar off-ramp no frontend: o AnchorSettlement step já tem o visual — agora conecta com a API real.

Adicionar o walletAddress correto no adapter (substituir o GDEMO_TASKLOOP_WORKER fixo pelo GBVVPVBX... ou buscar da API).