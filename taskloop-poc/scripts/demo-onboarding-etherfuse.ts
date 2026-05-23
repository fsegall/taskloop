import dotenv from "dotenv";
import { randomUUID } from "crypto";
import path from "path";

// Carrega .env da raiz do POC primeiro, depois do apps/api (sobrescreve)
const envRoot = path.resolve(__dirname, "..", ".env");
const envApi = path.resolve(__dirname, "..", "apps", "api", ".env");
console.error("[env] Carregando:", envRoot);
dotenv.config({ path: envRoot });
console.error("[env] Carregando:", envApi);
dotenv.config({ path: envApi });
console.error("[env] ETHERFUSE_API_KEY=", process.env.ETHERFUSE_API_KEY ? "✅ presente" : "❌ ausente");

const DEFAULT_BASE_URL = "https://api.sand.etherfuse.com";

/**
 * Etherfuse — Onboarding Programático (Sandbox)
 *
 * Fluxo:
 * 1. Criar organização (child org) com wallet Stellar
 * 2. Submeter KYC (auto-aprovado na sandbox)
 * 3. Registrar conta bancária (CLABE fictícia)
 * 4. Testar quote (offramp)
 * 5. Testar order (offramp com useAnchor)
 *
 * Documentação: https://docs.etherfuse.com/guides/onboarding-programmatic
 */

async function main(): Promise<void> {
  const baseUrl = process.env.ETHERFUSE_BASE_URL?.trim() || DEFAULT_BASE_URL;
  const apiKey = process.env.ETHERFUSE_API_KEY?.trim();

  if (!apiKey) {
    throw new Error("ETHERFUSE_API_KEY is required in .env");
  }

  console.log("Etherfuse — Onboarding Programático (Sandbox)");
  console.log("API URL:", baseUrl);
  console.log("");

  // ──────────────────────────────────────────────
  // 0. Gerar IDs
  // ──────────────────────────────────────────────
  const customerId = randomUUID();
  const bankAccountTransactionId = randomUUID();
  const walletPublicKey = process.env.ETHERFUSE_PUBLIC_KEY?.trim() || process.env.STELLAR_SOURCE_PUBLIC?.trim() || "GDEMO_TASKLOOP_WORKER";

  console.log("═══ 0. IDs gerados ═══");
  console.log("Customer ID:", customerId);
  console.log("Wallet:", walletPublicKey);
  console.log("");

  // ──────────────────────────────────────────────
  // 1. Obter organização e conta bancária
  // ──────────────────────────────────────────────
  let organizationId: string;
  let bankAccountId: string;

  const existingOrgId = process.env.ETHERFUSE_ORGANIZATION_ID?.trim();
  const existingBankId = process.env.ETHERFUSE_BANK_ACCOUNT_ID?.trim();

  if (existingOrgId && existingBankId) {
    organizationId = existingOrgId;
    bankAccountId = existingBankId;

    console.log("═══ 1. Usando organização e bank account existentes ═══");
    console.log("Organization ID:", organizationId);
    console.log("Bank Account ID:", bankAccountId);
    console.log("(Para criar do zero, remova ETHERFUSE_ORGANIZATION_ID e ETHERFUSE_BANK_ACCOUNT_ID do .env)");
    console.log("");
  } else {
    // ──────────────────────────────────────────────
    // 1a. Criar organização
    // ──────────────────────────────────────────────
    console.log("═══ 1. Criar organização ═══");

    const orgPayload = {
      id: customerId,
      displayName: "Ana García",
      accountType: "personal",
      userInfo: {
        email: "ana.garcia@example.com",
        displayName: "Ana García",
      },
      wallets: [
        {
          publicKey: walletPublicKey,
          blockchain: "stellar",
        },
      ],
    };

  console.log("Request:", JSON.stringify(orgPayload, null, 2));

    const orgRes = await fetch(`${baseUrl}/ramp/organization`, {
      method: "POST",
      headers: {
        Authorization: apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(orgPayload),
    });

    const orgBody = await parseResponse(orgRes, "Criar organização");
    organizationId = orgBody.organizationId as string;
    console.log("✅ Organização criada:", organizationId);
    console.log("");

    // ──────────────────────────────────────────────
    // 2. Submeter KYC
    // ──────────────────────────────────────────────
    console.log("═══ 2. Submeter KYC ═══");

    const kycPayload = {
      pubkey: walletPublicKey,
      identity: {
        id: randomUUID(),
        email: "ana.garcia@example.com",
        phoneNumber: "+525512345678",
        occupation: "Software Engineer",
        name: {
          givenName: "Ana",
          familyName: "García",
        },
        dateOfBirth: "1990-05-15",
        address: {
          street: "Av. Reforma 123",
          city: "Mexico City",
          region: "CDMX",
          postalCode: "06600",
          country: "MX",
        },
        idNumbers: [
          {
            value: "GAJU900515HDFRNN09",
            type: "CURP",
          },
          {
            value: "GAJU9005156V3",
            type: "RFC",
          },
        ],
      },
    };

  console.log("KYC payload:", JSON.stringify(kycPayload, null, 2).slice(0, 500) + "...");

    const kycRes = await fetch(`${baseUrl}/ramp/customer/${organizationId}/kyc`, {
      method: "POST",
      headers: {
        Authorization: apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(kycPayload),
    });

    const kycBody = await parseResponse(kycRes, "KYC");
    console.log("✅ KYC status:", kycBody.status ?? "approved (sandbox auto-approve)");
    console.log("");

    // ──────────────────────────────────────────────
    // 3. Registrar conta bancária
    // ──────────────────────────────────────────────
    console.log("═══ 3. Registrar conta bancária ═══");

    const bankPayload = {
      account: {
        transactionId: bankAccountTransactionId,
        firstName: "Ana",
        paternalLastName: "García",
        maternalLastName: "López",
        birthDate: "19900515",
        birthCountryIsoCode: "MX",
        curp: "GAJU900515HDFRNN09",
        rfc: "GAJU9005156V3",
        clabe: "012345678901234567",
      },
    };

  console.log("Bank account payload:", JSON.stringify(bankPayload, null, 2));

    const bankRes = await fetch(`${baseUrl}/ramp/customer/${organizationId}/bank-account`, {
      method: "POST",
      headers: {
        Authorization: apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(bankPayload),
    });

    const bankBody = await parseResponse(bankRes, "Registrar bank account");
    bankAccountId = bankBody.id ?? bankBody.bankAccountId as string;
    console.log("✅ Bank account ID:", bankAccountId);

    // Aguardar ativação da conta bancária
    console.log("⏳ Aguardando ativação da conta bancária...");
    await waitForBankAccountActive(baseUrl, apiKey, bankAccountId);
    console.log("");
  }

  // ──────────────────────────────────────────────
  // 4. Buscar wallet da organização
  // ──────────────────────────────────────────────
  console.log("═══ 4. Buscar wallet registrada ═══");

  const walletsRes = await fetch(
    `${baseUrl}/ramp/customer/${encodeURIComponent(organizationId)}/wallets`,
    { headers: { Authorization: apiKey } },
  );
  const walletsBody = await parseResponse(walletsRes, "Listar wallets");
  const wallets = (walletsBody.items as Array<{ walletId: string; publicKey: string; blockchain: string; kycStatus: string }>) ?? [];

  let cryptoWalletId: string | undefined;
  let actualPublicKey: string;

  if (wallets.length > 0) {
    const stellarWallet = wallets.find((w) => w.blockchain === "stellar") ?? wallets[0];
    cryptoWalletId = stellarWallet.walletId;
    actualPublicKey = stellarWallet.publicKey;
    console.log("Wallet ID:", cryptoWalletId);
    console.log("Public key:", actualPublicKey);
    console.log("KYC:", stellarWallet.kycStatus);
  } else {
    console.log("⚠️ Nenhuma wallet encontrada. Usando wallet do .env.");
    actualPublicKey = walletPublicKey;
  }
  console.log("");

  // ──────────────────────────────────────────────
  // 5. Testar quote (offramp)
  // ──────────────────────────────────────────────
  console.log("═══ 5. Testar quote (offramp) ═══");

  const quotePayload = {
    quoteId: randomUUID(),
    customerId: organizationId,
    blockchain: "stellar",
    quoteAssets: {
      type: "offramp",
      sourceAsset: "USDC:GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
      targetAsset: "MXN",
    },
    sourceAmount: "50",
    walletAddress: actualPublicKey,
  };

  console.log("Quote payload:", JSON.stringify(quotePayload, null, 2));

  const quoteRes = await fetch(`${baseUrl}/ramp/quote`, {
    method: "POST",
    headers: {
      Authorization: apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(quotePayload),
  });

  const quoteBody = await parseResponse(quoteRes, "Quote");
  console.log("✅ Quote:");
  console.log("   Quote ID:", quoteBody.quoteId);
  console.log("   Source:", quoteBody.sourceAmount, quoteBody.quoteAssets?.sourceAsset ?? "USDC");
  console.log("   Destination:", quoteBody.destinationAmount, quoteBody.quoteAssets?.targetAsset ?? "MXN");
  console.log("   Exchange rate:", quoteBody.exchangeRate);
  console.log("   Expires:", quoteBody.expiresAt);
  console.log("");

  // ──────────────────────────────────────────────
  // 6. Testar order (offramp com useAnchor)
  // ──────────────────────────────────────────────
  console.log("═══ 6. Testar order (offramp + anchor) ═══");

  const orderPayload: Record<string, unknown> = {
    orderId: randomUUID(),
    quoteId: quoteBody.quoteId as string,
    bankAccountId: bankAccountId as string,
    useAnchor: true,
  };

  if (cryptoWalletId) {
    orderPayload.cryptoWalletId = cryptoWalletId;
  } else {
    orderPayload.publicKey = walletPublicKey;
  }

  console.log("Order payload:", JSON.stringify(orderPayload, null, 2));

  const orderRes = await fetch(`${baseUrl}/ramp/order`, {
    method: "POST",
    headers: {
      Authorization: apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(orderPayload),
  });

  const orderBody = await parseResponse(orderRes, "Order");

  let orderData: Record<string, unknown>;
  if (orderBody.offramp) {
    orderData = orderBody.offramp as Record<string, unknown>;
    console.log("✅ Order (offramp):");
    console.log("   Order ID:", orderData.orderId);
    console.log("   Withdraw anchor account:", orderData.withdrawAnchorAccount ?? "N/A");
    console.log("   Memo:", orderData.withdrawMemo ?? "N/A");
    console.log("   Memo type:", orderData.withdrawMemoType ?? "N/A");
  } else if (orderBody.onramp) {
    orderData = orderBody.onramp as Record<string, unknown>;
    console.log("✅ Order (onramp):");
    console.log("   Order ID:", orderData.orderId);
    console.log("   Deposit CLABE:", orderData.depositClabe ?? "N/A");
    console.log("   Deposit amount:", orderData.depositAmount ?? "N/A");
    console.log("   Bank:", orderData.depositBankName ?? "N/A");
  } else {
    console.log("✅ Order response:", JSON.stringify(orderBody, null, 2));
  }

  console.log("");
  console.log("═══ Onboarding concluído! ═══");
  console.log("Organization ID:", organizationId);
  console.log("Bank Account ID:", bankAccountId);
  console.log("");
  console.log("Próximo passo: enviar USDC/XLM para a withdrawAnchorAccount com o memo informado.");
}

async function waitForBankAccountActive(
  baseUrl: string,
  apiKey: string,
  bankAccountId: string,
  maxRetries = 10,
  delayMs = 2_000,
): Promise<void> {
  for (let i = 0; i < maxRetries; i++) {
    const res = await fetch(`${baseUrl}/ramp/bank-account/${encodeURIComponent(bankAccountId)}`, {
      headers: { Authorization: apiKey },
    });
    const body = await parseResponse(res, "Bank account status");
    const status = body.status as string | undefined;
    const compliant = body.compliant as boolean | undefined;

    if (status === "active") {
      console.log(`✅ Bank account ativa após ${i + 1} tentativa(s)`);
      return;
    }

    if (i < maxRetries - 1) {
      console.log(`   Tentativa ${i + 1}/${maxRetries}: status=${status ?? "N/A"}, compliant=${compliant ?? "N/A"}`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  throw new Error("Bank account não ativou após as tentativas.");
}

async function parseResponse(res: Response, label: string): Promise<Record<string, unknown>> {
  const text = await res.text();

  if (!res.ok) {
    let detail = text;
    try {
      const json = JSON.parse(text) as Record<string, unknown>;
      detail = (json.error as string) ?? (json.message as string) ?? text;
    } catch {
      // text is fine
    }

    throw new Error(`❌ ${label} failed (HTTP ${res.status}): ${detail}`);
  }

  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    throw new Error(`❌ ${label} returned invalid JSON: ${text}`);
  }
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown onboarding error.";
  console.error("\n❌ Onboarding failed:", message);
  process.exitCode = 1;
});
