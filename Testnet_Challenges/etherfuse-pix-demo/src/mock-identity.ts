/**
 * Mocked Brazilian identity data for the sandbox KYC flow.
 *
 * The Etherfuse sandbox auto-approves KYC submissions, so the document images
 * just need to be valid base64-encoded data URLs — content does not need to be
 * a real ID. We use a tiny 1x1 JPEG.
 */

// 1x1 white JPEG, base64-encoded
const PLACEHOLDER_JPEG_B64 =
    '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD3+iiigD//2Q==';

export const PLACEHOLDER_IMAGE = `data:image/jpeg;base64,${PLACEHOLDER_JPEG_B64}`;

export const MOCK = {
    /** Unique email per run so re-running on a fresh keypair doesn't collide. */
    email: () => `pix-demo-${Date.now()}@example.com`,
    firstName: 'João',
    familyName: 'Silva',
    dateOfBirth: '1990-05-15',
    /** 11-digit CPF — the example from the Etherfuse README. */
    cpf: '37155878661',
    address: {
        street: 'Av. Paulista, 1578',
        city: 'São Paulo',
        region: 'SP',
        postalCode: '01310-200',
        country: 'BR',
    },
    phone: '+5511987654321',
    /** PIX key used for the off-ramp payout. We use CPF as the PIX key. */
    pixKey: '37155878661',
    pixKeyType: 'cpf' as const,
    placeholderImage: PLACEHOLDER_IMAGE,
};

export type MockIdentity = typeof MOCK;
