/**
 * List Etherfuse orders accessible to this API key, group the processing ones
 * by ramp direction, and print a summary.
 *
 *   pnpm transactions
 *
 * "Processing" here means the raw Etherfuse status `funded` — for on-ramps that
 * is the window between fiat receipt and TESOURO mint, for off-ramps it is the
 * window between burn confirmation and PIX payout (which, per EXAMPLE_RUN.md,
 * never closes in the PIX sandbox).
 */

import 'dotenv/config';

import type {
    EtherfuseOrderResponse,
    EtherfuseOrderStatus,
} from './lib/anchors/etherfuse/types.ts';

const ETHERFUSE_API_KEY = required('ETHERFUSE_API_KEY');
const ETHERFUSE_BASE_URL = process.env.ETHERFUSE_BASE_URL || 'https://api.sand.etherfuse.com';

const PAGE_SIZE = 100;

interface PagedOrdersResponse {
    items: EtherfuseOrderResponse[];
    totalItems: number;
    pageSize: number;
    pageNumber: number;
    totalPages: number;
}

function required(name: string): string {
    const v = process.env[name];
    if (!v) {
        console.error(`Missing required env var: ${name}. Copy .env.example to .env and fill it in.`);
        process.exit(1);
    }
    return v;
}

async function fetchAllOrders(): Promise<EtherfuseOrderResponse[]> {
    const all: EtherfuseOrderResponse[] = [];
    let pageNumber = 0;
    while (true) {
        const url = `${ETHERFUSE_BASE_URL}/ramp/orders`;
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: ETHERFUSE_API_KEY,
            },
            body: JSON.stringify({ pageSize: PAGE_SIZE, pageNumber }),
        });
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`POST /ramp/orders failed ${response.status}: ${errorText}`);
        }
        const page = (await response.json()) as PagedOrdersResponse;
        all.push(...page.items);
        if (page.pageNumber + 1 >= page.totalPages || page.items.length === 0) break;
        pageNumber += 1;
    }
    return all;
}

function ageOf(iso: string): string {
    const ms = Date.now() - new Date(iso).getTime();
    if (!Number.isFinite(ms) || ms < 0) return '?';
    const s = Math.floor(ms / 1000);
    if (s < 60) return `${s}s`;
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    if (h < 48) return `${h}h${m % 60 ? `${m % 60}m` : ''}`;
    const d = Math.floor(h / 24);
    return `${d}d${h % 24 ? `${h % 24}h` : ''}`;
}

const STATUS_MAP: Record<EtherfuseOrderStatus, string> = {
    created: 'pending',
    funded: 'processing',
    completed: 'completed',
    failed: 'failed',
    refunded: 'refunded',
    canceled: 'cancelled',
};

function formatStatus(s: EtherfuseOrderStatus): string {
    const mapped = STATUS_MAP[s] ?? s;
    return mapped === s ? mapped : `${mapped}(${s})`;
}

function formatOnRamp(o: EtherfuseOrderResponse): string {
    const from = o.amountInFiat ? `${o.amountInFiat} BRL` : '? BRL';
    const to = o.amountInTokens ? `${o.amountInTokens} TESOURO` : '? TESOURO';
    return `  • ${o.orderId}  status=${formatStatus(o.status)}  ${from} → ${to}  age=${ageOf(o.createdAt)}  customer=${o.customerId}`;
}

function formatOffRamp(o: EtherfuseOrderResponse): string {
    const from = o.amountInTokens ? `${o.amountInTokens} TESOURO` : '? TESOURO';
    const to = o.amountInFiat ? `${o.amountInFiat} BRL` : '? BRL';
    const burn = o.confirmedTxSignature ? `  burn=${o.confirmedTxSignature.slice(0, 12)}…` : '';
    return `  • ${o.orderId}  status=${formatStatus(o.status)}  ${from} → ${to}  age=${ageOf(o.createdAt)}${burn}  customer=${o.customerId}`;
}

function countsByStatus(orders: EtherfuseOrderResponse[]): Record<string, number> {
    const out: Record<string, number> = {};
    for (const o of orders) out[o.status] = (out[o.status] ?? 0) + 1;
    return out;
}

async function main() {
    console.log(`Fetching orders from ${ETHERFUSE_BASE_URL}/ramp/orders …`);
    const orders = await fetchAllOrders();
    console.log(`Found ${orders.length} order(s) total.\n`);

    const processing = orders.filter((o) => o.status === ('funded' as EtherfuseOrderStatus));
    const processingOn = processing.filter((o) => o.orderType === 'onramp');
    const processingOff = processing.filter((o) => o.orderType === 'offramp');

    console.log(`=== Processing on-ramp orders (${processingOn.length}) ===`);
    if (processingOn.length === 0) console.log('  (none)');
    else for (const o of processingOn) console.log(formatOnRamp(o));

    console.log(`\n=== Processing off-ramp orders (${processingOff.length}) ===`);
    if (processingOff.length === 0) console.log('  (none)');
    else for (const o of processingOff) console.log(formatOffRamp(o));

    const counts = countsByStatus(orders);
    const summary = Object.entries(counts)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([s, n]) => `${s}=${n}`)
        .join('  ');
    console.log(`\nAll statuses: ${summary || '(empty)'}`);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
