/**
 * TaskLoop — Testnet War Room · Trilha PIX
 *
 * Fluxo completo BRL ↔ TESOURO na Etherfuse Sandbox / Stellar Testnet
 *
 *  ON-RAMP  (BRL → TESOURO)
 *   1. Criar customer + KYC (BR)
 *   2. Registrar conta PIX (transactionId UUID obrigatório!)
 *   3. Listar assets → descobrir identificador TESOURO
 *   4. Quote BRL → TESOURO
 *   5. createOnRamp
 *   6. simulateFiatReceived
 *   7. Poll até completed
 *   8. Verificar saldo TESOURO na Horizon testnet
 *
 *  OFF-RAMP (TESOURO → BRL)
 *   9.  Quote TESOURO → BRL (metade do saldo)
 *   10. createOffRamp
 *   11. Poll até burnTransactionXdr disponível
 *   12. Assinar XDR com keypair Stellar testnet
 *   13. Submeter ao Horizon → status processing = vitória ✅
 *
 * Executar:  npx tsx pix-ramp.ts
 * Pré-req:   cp .env.example .env  e preencher as variáveis
 */

import 'dotenv/config';
import { randomUUID } from 'crypto';
import {
  Keypair,
  Networks,
  TransactionBuilder,
  Horizon,
} from '@stellar/stellar-sdk';

// ============================================================
// Config
// ============================================================
const BASE_URL   = process.env.ETHERFUSE_BASE_URL?.trim() || 'https://api.sand.etherfuse.com';
const API_KEY    = process.env.ETHERFUSE_API_KEY?.trim() || '';
const PUBLIC_KEY = process.env.STELLAR_PUBLIC_KEY?.trim() || '';
const SECRET_KEY = process.env.STELLAR_SECRET_KEY?.trim() || '';

const HORIZON_TESTNET = 'https://horizon-testnet.stellar.org';
const horizon = new Horizon.Server(HORIZON_TESTNET);

if (!API_KEY)    throw new Error('ETHERFUSE_API_KEY ausente no .env');
if (!PUBLIC_KEY) throw new Error('STELLAR_PUBLIC_KEY ausente no .env');
if (!SECRET_KEY) throw new Error('STELLAR_SECRET_KEY ausente no .env');

// ============================================================
// Helpers
// ============================================================
async function api(method: string, path: string, body?: unknown): Promise<Record<string, unknown>> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: { Authorization: API_KEY, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) {
    let msg = text;
    try { msg = (JSON.parse(text) as { error?: string; message?: string }).error ?? msg; } catch {}
    throw new Error(`[Etherfuse] ${method} ${path} → HTTP ${res.status}: ${msg}`);
  }
  return JSON.parse(text) as Record<string, unknown>;
}

async function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function pollOrder(
  orderId: string,
  until: (status: string, body: Record<string, unknown>) => boolean,
  maxRetries = 20,
  intervalMs = 3_000,
): Promise<Record<string, unknown>> {
  for (let i = 1; i <= maxRetries; i++) {
    const body = await api('GET', `/ramp/order/${encodeURIComponent(orderId)}`);
    const status = body.status as string ?? 'unknown';
    console.log(`   poll ${i}/${maxRetries}: status=${status}`);
    if (until(status, body)) return body;
    if (['failed', 'refunded', 'canceled'].includes(status))
      throw new Error(`Order ${orderId} encerrou com status=${status}`);
    await sleep(intervalMs);
  }
  throw new Error(`Timeout: order ${orderId} não atingiu o status esperado.`);
}

function section(title: string) {
  console.log(`\n${'═'.repeat(50)}`);
  console.log(`  ${title}`);
  console.log('═'.repeat(50));
}

// ============================================================
// Main
// ============================================================
async function main() {
  console.log('\n🚀 TaskLoop — Trilha PIX · Etherfuse Sandbox + Stellar Testnet');
  console.log(`   BASE_URL : ${BASE_URL}`);
  console.log(`   WALLET   : ${PUBLIC_KEY}`);

  // Reutilizar sessão anterior se disponível
  let organizationId = process.env.ETHERFUSE_ORGANIZATION_ID?.trim() || '';
  let bankAccountId  = process.env.ETHERFUSE_BANK_ACCOUNT_ID?.trim() || '';

  // ──────────────────────────────────────────────────────────
  // 1. Customer + KYC
  // ──────────────────────────────────────────────────────────
  if (!organizationId) {
    section('1. Criar Customer (BR)');
    const customerId = randomUUID();

    const orgBody = await api('POST', '/ramp/organization', {
      id: customerId,
      displayName: 'Felipe Segall',
      accountType: 'personal',
      userInfo: {
        email: 'felipe.segall@taskloop.com',
        displayName: 'Felipe Segall',
        // Campos obrigatórios que o type do starter-pack omite (pegadinha #1)
        phoneNumber: '+5511999990000',
        occupation: 'Software Engineer',
      },
      wallets: [{ publicKey: PUBLIC_KEY, blockchain: 'stellar' }],
    });
    organizationId = orgBody.organizationId as string;
    console.log('✅ Organization ID:', organizationId);

    // KYC — aprovação automática na sandbox
    section('2. KYC (BR)');
    await api('POST', `/ramp/customer/${organizationId}/kyc`, {
      pubkey: PUBLIC_KEY,
      identity: {
        id: randomUUID(),
        email: 'felipe.segall@taskloop.com',
        phoneNumber: '+5511999990000',
        occupation: 'Software Engineer',
        name: { givenName: 'Felipe', familyName: 'Segall' },
        dateOfBirth: '1990-01-15',
        address: {
          street: 'Av. Paulista 1000',
          city: 'São Paulo',
          region: 'SP',
          postalCode: '01310100',
          country: 'BR',
        },
        idNumbers: [{ value: '12345678901', type: 'CPF' }],
      },
    });
    console.log('✅ KYC enviado (auto-aprovado na sandbox)');
  } else {
    section('1+2. Reutilizando organização existente');
    console.log('   Organization ID:', organizationId);
  }

  // ──────────────────────────────────────────────────────────
  // 3. PIX bank account
  //    transactionId UUID é OBRIGATÓRIO — sem ele, 400 sem explicação (pegadinha #3)
  // ──────────────────────────────────────────────────────────
  if (!bankAccountId) {
    section('3. Registrar conta PIX');
    const bankBody = await api('POST', `/ramp/customer/${organizationId}/bank-account`, {
      account: {
        transactionId: randomUUID(),   // ← OBRIGATÓRIO
        pixKey: '12345678901',         // chave PIX (CPF fictício para sandbox)
        pixKeyType: 'CPF',
        firstName: 'Felipe',
        lastName: 'Segall',
        taxId: '12345678901',          // CPF
        countryCode: 'BR',
      },
    });
    bankAccountId = (bankBody.id ?? bankBody.bankAccountId) as string;
    console.log('✅ Bank Account ID:', bankAccountId);
    console.log('   Aguardando ativação...');

    // Poll status da conta bancária
    for (let i = 0; i < 10; i++) {
      const b = await api('GET', `/ramp/bank-account/${encodeURIComponent(bankAccountId)}`);
      if (b.status === 'active') { console.log('✅ Conta ativa'); break; }
      console.log(`   tentativa ${i + 1}/10: status=${b.status}`);
      await sleep(2_000);
    }
  } else {
    section('3. Reutilizando bank account existente');
    console.log('   Bank Account ID:', bankAccountId);
  }

  // ──────────────────────────────────────────────────────────
  // 4. Listar assets → descobrir identificador TESOURO
  // ──────────────────────────────────────────────────────────
  section('4. Listar assets disponíveis (BRL/Stellar)');
  const assetsBody = await api('GET', `/ramp/assets?blockchain=stellar&currency=BRL&wallet=${PUBLIC_KEY}`);
  const assets = (assetsBody.assets ?? []) as Array<{ symbol: string; identifier: string; name: string }>;
  console.log(`   ${assets.length} asset(s) encontrado(s):`);
  assets.forEach(a => console.log(`   · ${a.symbol} — ${a.name} — ${a.identifier}`));

  const tesouroAsset = assets.find(a =>
    a.symbol?.toLowerCase().includes('tesouro') ||
    a.name?.toLowerCase().includes('tesouro')
  );
  if (!tesouroAsset) throw new Error('Asset TESOURO não encontrado. Verifique os assets disponíveis acima.');
  const TESOURO_ID = tesouroAsset.identifier;
  console.log('✅ TESOURO identificador:', TESOURO_ID);

  // ──────────────────────────────────────────────────────────
  // ON-RAMP: BRL → TESOURO
  // ──────────────────────────────────────────────────────────
  section('5. Quote ON-RAMP: BRL → TESOURO');
  const onQuote = await api('POST', '/ramp/quote', {
    quoteId: randomUUID(),
    customerId: organizationId,
    blockchain: 'stellar',
    quoteAssets: { type: 'onramp', sourceAsset: 'BRL', targetAsset: TESOURO_ID },
    sourceAmount: '50',
    walletAddress: PUBLIC_KEY,
  });
  console.log('✅ Quote:', onQuote.quoteId);
  console.log('   BRL 50 →', onQuote.destinationAmount, 'TESOURO');
  console.log('   Taxa:', onQuote.exchangeRate);

  section('6. createOnRamp');
  // Proxy account not found = bank account não registrado (pegadinha #2)
  const onRampBody = await api('POST', '/ramp/order', {
    orderId: randomUUID(),
    quoteId: onQuote.quoteId,
    bankAccountId,
    cryptoWalletId: undefined,
    publicKey: PUBLIC_KEY,
    useAnchor: false,
  });
  const onramp = (onRampBody.onramp ?? onRampBody) as Record<string, unknown>;
  const onRampOrderId = onramp.orderId as string;
  console.log('✅ On-ramp Order ID:', onRampOrderId);
  if (onramp.depositClabe)  console.log('   Deposit CLABE:', onramp.depositClabe);
  if (onramp.depositAmount) console.log('   Deposit amount:', onramp.depositAmount);

  section('7. simulateFiatReceived');
  await api('POST', `/ramp/simulate/fiat-received`, { orderId: onRampOrderId });
  console.log('✅ Fiat recebido simulado');

  section('8. Poll on-ramp até completed');
  await pollOrder(onRampOrderId, s => s === 'completed');
  console.log('✅ On-ramp completed!');

  section('9. Verificar saldo TESOURO na Horizon Testnet');
  const account = await horizon.loadAccount(PUBLIC_KEY);
  const tesouroBalance = account.balances.find(b =>
    'asset_code' in b && b.asset_code === tesouroAsset.symbol
  );
  console.log('✅ Saldo TESOURO:', tesouroBalance?.balance ?? '0', tesouroAsset.symbol);

  // ──────────────────────────────────────────────────────────
  // OFF-RAMP: TESOURO → BRL
  // ──────────────────────────────────────────────────────────
  const tesouroAmt = parseFloat(tesouroBalance?.balance ?? '0');
  const offRampAmount = (tesouroAmt / 2).toFixed(7);
  console.log(`   Usando ${offRampAmount} TESOURO para o off-ramp`);

  section('10. Quote OFF-RAMP: TESOURO → BRL');
  const offQuote = await api('POST', '/ramp/quote', {
    quoteId: randomUUID(),
    customerId: organizationId,
    blockchain: 'stellar',
    quoteAssets: { type: 'offramp', sourceAsset: TESOURO_ID, targetAsset: 'BRL' },
    sourceAmount: offRampAmount,
    walletAddress: PUBLIC_KEY,
  });
  console.log('✅ Quote:', offQuote.quoteId);
  console.log('  ', offRampAmount, 'TESOURO → BRL', offQuote.destinationAmount);

  section('11. createOffRamp');
  const offRampBody = await api('POST', '/ramp/order', {
    orderId: randomUUID(),
    quoteId: offQuote.quoteId,
    bankAccountId,
    publicKey: PUBLIC_KEY,
    useAnchor: true,
  });
  const offramp = (offRampBody.offramp ?? offRampBody) as Record<string, unknown>;
  const offRampOrderId = offramp.orderId as string;
  console.log('✅ Off-ramp Order ID:', offRampOrderId);

  section('12. Poll off-ramp até burnTransactionXdr');
  const offRampOrder = await pollOrder(
    offRampOrderId,
    (_, b) => Boolean(b.burnTransactionXdr),
    30,
    4_000,
  );
  const burnXdr = offRampOrder.burnTransactionXdr as string;
  console.log('✅ burnTransactionXdr recebido');

  section('13. Assinar XDR e submeter ao Horizon Testnet');
  const keypair = Keypair.fromSecret(SECRET_KEY);
  const tx = TransactionBuilder.fromXDR(burnXdr, Networks.TESTNET);
  tx.sign(keypair);
  const result = await horizon.submitTransaction(tx as any);
  console.log('✅ Transação submetida!');
  console.log('   TX Hash:', result.hash);
  console.log(`   Explorer: https://stellar.expert/explorer/testnet/tx/${result.hash}`);

  section('14. Poll off-ramp → processing (estado terminal no sandbox)');
  // O sandbox PIX não auto-completa — funded/processing é a vitória (pegadinha #6)
  const finalOrder = await pollOrder(offRampOrderId, s => ['processing', 'funded', 'completed'].includes(s), 10, 3_000);
  console.log('✅ Off-ramp status:', finalOrder.status);

  console.log('\n' + '🏆'.repeat(20));
  console.log('  TRILHA PIX CONCLUÍDA!');
  console.log(`  TX Hash (submeter na plataforma): ${result.hash}`);
  console.log('🏆'.repeat(20));
}

main().catch(err => {
  console.error('\n❌ Erro:', err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
