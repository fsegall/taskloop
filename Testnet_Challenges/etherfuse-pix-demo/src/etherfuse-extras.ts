/**
 * Direct calls to Etherfuse endpoints that aren't exposed on `EtherfuseClient`.
 *
 * The PIX bank-account variant of `POST /ramp/bank-account` is NOT in the
 * public Etherfuse docs (which only document the Mexican Personal / Business
 * variants with CLABE). Probing against the sandbox shows the variant the
 * deserializer accepts is:
 *
 *   { transactionId, firstName, lastName, pixKey, pixKeyType, cpf }
 *
 * Notable differences from the starter-pack's `EtherfusePixAccountBody` type
 * (which is documented but never implemented in `EtherfuseClient`):
 *   - `transactionId` is REQUIRED
 *   - it's a single `lastName`, not `paternalLastName`/`maternalLastName`
 *
 * The response shape is also different from what the starter-pack types
 * declare (`EtherfuseBankAccountResponse`) — it returns `accountId` /
 * `organizationId` / `label` / `status`, not the documented fields. The
 * `accountId` equals the `bankAccountId` we generated in `createCustomer`,
 * confirming this call fills in the bank-account stub.
 */

export interface RegisterPixBankAccountInput {
    apiKey: string;
    baseUrl: string;
    /** Presigned URL from `EtherfuseClient.getKycUrl(customerId, publicKey, bankAccountId)`. */
    presignedUrl: string;
    pixKey: string;
    pixKeyType: 'evp' | 'cpf' | 'cnpj' | 'email' | 'phone';
    firstName: string;
    lastName: string;
    /** 11-digit CPF, no punctuation. */
    cpf: string;
}

export interface EtherfusePixRegistrationResponse {
    accountId: string;
    label: string;
    status: string;
    organizationId: string;
}

export async function registerPixBankAccount(
    input: RegisterPixBankAccountInput,
): Promise<EtherfusePixRegistrationResponse> {
    const url = `${input.baseUrl}/ramp/bank-account`;
    const body = {
        presignedUrl: input.presignedUrl,
        account: {
            transactionId: crypto.randomUUID(),
            firstName: input.firstName,
            lastName: input.lastName,
            pixKey: input.pixKey,
            pixKeyType: input.pixKeyType,
            cpf: input.cpf,
        },
    };

    console.log(`[Etherfuse] POST ${url}`, JSON.stringify(body));

    const res = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: input.apiKey,
        },
        body: JSON.stringify(body),
    });
    const text = await res.text();
    console.log(`[Etherfuse] Response (${res.status}):`, text || '(empty)');

    if (!res.ok) {
        throw new Error(
            `Etherfuse /ramp/bank-account failed (${res.status}): ${text || '(empty)'}`,
        );
    }

    return JSON.parse(text) as EtherfusePixRegistrationResponse;
}
