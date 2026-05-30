# pix-demo

End-to-end Brazilian PIX on/off-ramp demo against the Etherfuse sandbox on
Stellar testnet.

Runs as a single Node.js script. Every step prints to stdout, and the bundled
`EtherfuseClient` logs every HTTP request/response with an `[Etherfuse]`
prefix — so if any step fails, the trail in the terminal is sufficient to
diagnose it without re-running.

## What it does

1. Generates a fresh Stellar testnet keypair
2. Funds it via Friendbot
3. Creates an Etherfuse customer
4. Submits programmatic KYC (identity + placeholder document images + accepts agreements)
5. Polls until KYC is approved (the sandbox auto-approves)
6. Registers a PIX bank account (CPF key) against the customer's stub
   bankAccountId — required before either ramp will accept the stub
7. Resolves the TESOURO asset's testnet `CODE:ISSUER` via `/ramp/assets`
8. Establishes a TESOURO trustline (signs + submits with the local keypair)
9. Gets an on-ramp quote (BRL → TESOURO, 100 BRL)
10. Creates the on-ramp order
11. Calls `simulateFiatReceived` to mark the payment as received
12. Polls until the on-ramp order is `completed`
13. Verifies the TESOURO balance on Horizon
14. Gets an off-ramp quote (TESOURO → BRL, half the balance) and creates the order
15. Polls until Etherfuse returns the burn-transaction XDR (deferred signing)
16. Signs and submits the burn transaction on Stellar
17. Polls until the off-ramp order is `processing` (Etherfuse `funded` — burn
    confirmed) or `completed`

## Setup

```bash
cp .env.example .env
# Fill in ETHERFUSE_API_KEY (sandbox key from Etherfuse)
pnpm install
pnpm typecheck       # must pass with zero errors
```

## Run

```bash
pnpm dev
```

A successful run ends with a `=== Demo completed successfully ===` section
listing `customerId`, `publicKey`, both `orderId`s, and the burn transaction
hash.

A failed run ends with a `=== FAILED on step N ===` section showing the
`AnchorError` (or other error) and the failing step number. The last
`[Etherfuse] METHOD URL …` and `[Etherfuse] Response (NNN): …` lines above
that point identify the failing API call and Etherfuse's error body.

## Listing orders

`pnpm transactions` pages through `POST /ramp/orders` (the org-wide list
endpoint scoped to your API key), filters to orders whose raw Etherfuse
status is `funded` — the shared `processing` state, after the deposit/burn
is on-chain but before payout — and splits them into on-ramp vs off-ramp:

```
$ pnpm transactions
Fetching orders from https://api.sand.etherfuse.com/ramp/orders …
Found 15 order(s) total.

=== Processing on-ramp orders (5) ===
  • a9c7425b-…  status=processing(funded)  100 BRL → ? TESOURO  age=18m   customer=3ab993c9-…
  • 9f9d9c07-…  status=processing(funded)  100 BRL → ? TESOURO  age=52m   customer=3ab993c9-…
  • d024e7b8-…  status=processing(funded)  100 BRL → ? TESOURO  age=45h44m customer=3ab993c9-…
  • 4ce5cccb-…  status=processing(funded)  100 BRL → ? TESOURO  age=45h55m customer=3ab993c9-…
  • 8a85fc37-…  status=processing(funded)  100 BRL → ? TESOURO  age=46h9m  customer=3ab993c9-…

=== Processing off-ramp orders (3) ===
  • 0a79fbe3-…  status=processing(funded)  43.30 TESOURO → ? BRL  age=45h2m   burn=57dc629308…  customer=3ab993c9-…
  • 9870c1e0-…  status=processing(funded)  43.30 TESOURO → ? BRL  age=46h5m   burn=75877fccac…  customer=3ab993c9-…
  • 7901e473-…  status=processing(funded)  43.30 TESOURO → ? BRL  age=46h16m  burn=917cc09da8…  customer=3ab993c9-…

All statuses: canceled=1  completed=6  funded=8
```

Each line shows `status=<mapped>(<raw>)` (raw `funded` → shared `processing`);
when raw and mapped match (e.g. `completed`) it collapses to one word. The
on-ramp `→ TESOURO` and off-ramp `→ BRL` columns show `?` while the order
is still `funded` — the mint/burn amount only populates once the order
reaches `completed`.

## Sandbox quirks we hit (so future-you isn't surprised)

The Etherfuse sandbox + portable library have a few gaps that this demo
papers over. They're worth knowing about if you're integrating the library
elsewhere:

1. **`EtherfuseKycIdentityRequest` is missing fields.** The starter-pack type
   only declares `name`, `dateOfBirth`, `address`, `idNumbers`. The actual
   `/ramp/customer/{id}/kyc` endpoint *also* requires `email`, `phoneNumber`,
   and `occupation` — without them the customer-agreement step downstream
   rejects with `"Phone number not provided"`. We pass the extras via a cast
   in `src/main.ts`.

2. **`registerFiatAccount` is documented but unimplemented in
   `EtherfuseClient`.** The README on the starter pack shows the call; the
   `client.ts` doesn't implement it. We call `POST /ramp/bank-account`
   directly in `src/etherfuse-extras.ts`.

3. **The starter-pack's `EtherfusePixAccountBody` doesn't match the API.** It
   declares `{ pixKey, pixKeyType, firstName, lastName, cpf }`, but the
   actual endpoint also requires a `transactionId` (UUID). We probed shapes
   against the sandbox and the variant that works is
   `{ transactionId, firstName, lastName, pixKey, pixKeyType, cpf }`. PIX is
   not in the public Etherfuse OpenAPI / docs at all — only Mexican
   Personal/Business with CLABE — but the sandbox does accept this shape.

4. **The bank-account registration response doesn't match
   `EtherfuseBankAccountResponse`.** It returns
   `{ accountId, label, status, organizationId }`. Our extras file declares
   its own `EtherfusePixRegistrationResponse` type to match. The `accountId`
   equals the `bankAccountId` we generated in `createCustomer`, confirming
   the call fills in the existing stub rather than creating a new account.

5. **The bank-account stub is required by `createOnRamp`.** If you skip step
   17 and pass the auto-generated `bankAccountId` from `createCustomer`
   straight to `createOnRamp`, the API rejects with `"Proxy account not
   found"`. That's why we register the PIX details before either ramp.

6. **PIX off-ramps don't auto-complete in the Etherfuse sandbox.** The docs
   (`/guides/testing-offramps`) explicitly state: *"No fiat simulation
   needed. Unlike onramps, there is no `fiat_received` step for offramps.
   The sandbox processes the fiat payout automatically once the burn
   transaction is confirmed on-chain."* In practice this is true for
   MXN/SPEI but NOT for BRL/PIX. We verified the sandbox sees the burn —
   the order's `confirmedTxSignature` is populated and its status moves
   `created` → `funded` (mapped to `processing` in the shared types) — but
   it then sits there indefinitely. After 25+ minutes the order's
   `updatedAt` doesn't change and `completedAt` is `null`. `pnpm
   transactions` makes this directly observable across runs: in the sample
   output above, three independent off-ramp orders are still in `funded`
   45–46 hours after their burns were confirmed on-chain, each with a
   populated `confirmedTxSignature`. Other things we confirmed are correct
   (so it isn't a missing-prerequisite issue):
   - the bank account is `compliant: true`, `status: "active"`
   - the wallet is registered to the customer with `kycStatus: "approved"`
   - all order fields (`bankAccountId`, `walletId`, `confirmedTxSignature`,
     `sourceAsset`, `targetAsset`, `blockchain`) are populated
   - there is no `/ramp/order/{id}/complete` or `simulateFiatSent` endpoint
     in the documented surface (we checked the OpenAPI spec and the
     `/sandbox-api/` section)
   - the customer-facing status page has no admin controls
   - claiming wallet ownership via `POST /ramp/customer/{id}/wallet` with
     `claimOwnership: true` is rejected because the wallet is already
     registered to the parent org
   The auto-completion the docs describe is implemented for SPEI/Mexico
   but apparently not yet wired up for PIX/Brazil in sandbox. We accept
   `processing` (Etherfuse's `funded`) as the terminal demo state and
   print a note explaining this.

7. **On-ramp completion time varies, and can hang in `funded` too.** It
   usually settles in ~30s after `simulateFiatReceived`, but we've seen it
   sit in `processing` for several minutes — and `pnpm transactions` has
   surfaced something stronger: on-ramps that received `simulateFiatReceived`
   (so they reached `funded`, not just `created`) and then stayed there for
   45+ hours, never advancing to `completed`. In the sample output above
   that's the three oldest on-ramp rows (`d024e7b8…`, `4ce5cccb…`,
   `8a85fc37…`). Treat the 10 min on-ramp polling timeout as a best-effort
   bound, not a guarantee; the sandbox can drop on-ramps in the same
   `funded` limbo as off-ramps, just less often.

## Project layout

```
src/
├── main.ts                # 20-step orchestrator
├── list-transactions.ts   # `pnpm transactions` — list processing orders by ramp
├── logger.ts              # step / section / ok / info / fail helpers
├── stellar.ts             # Friendbot + sign-and-submit on testnet
├── etherfuse-extras.ts    # POST /ramp/bank-account (PIX shape) — gap above
├── mock-identity.ts       # Brazilian mock KYC payload
└── lib/                   # copied verbatim from regional-starter-pack
    ├── anchors/
    │   ├── types.ts
    │   └── etherfuse/{client,types,index}.ts
    └── wallet/{types,stellar}.ts
```
