const t0 = Date.now();
const ts = () => `+${((Date.now() - t0) / 1000).toFixed(2)}s`;

export const section = (title: string) => {
    console.log(`\n=== ${title} ===  ${ts()}`);
};

export const step = (n: number, msg: string) => {
    console.log(`\n[${String(n).padStart(2, '0')}] ${msg}  ${ts()}`);
};

export const ok = (msg: string) => {
    console.log(`  ✓ ${msg}`);
};

export const info = (msg: string) => {
    console.log(`  · ${msg}`);
};

export const fail = (msg: string, err?: unknown) => {
    console.error(`  ✗ ${msg}`);
    if (err !== undefined) {
        if (err instanceof Error) {
            console.error(`    ${err.name}: ${err.message}`);
            if (err.stack) console.error(err.stack);
        } else {
            console.error(err);
        }
    }
};
