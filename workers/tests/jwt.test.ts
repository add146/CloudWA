import { describe, it, expect } from 'vitest';
import { createToken, verifyToken } from '../src/auth/jwt';

describe('JWT Utilities', () => {
    const mockSecret = 'test-secret-key-for-jwt-testing-only';

    it('should create a valid JWT token', async () => {
        const payload = {
            userId: 'test-user-123',
            tenantId: 'tenant-456',
            role: 'tenant_admin' as const,
            email: 'test@example.com',
        };

        const token = await createToken(payload, mockSecret);

        expect(token).toBeDefined();
        expect(typeof token).toBe('string');
        expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    });

    it('should verify a valid JWT token', async () => {
        const payload = {
            userId: 'test-user-123',
            tenantId: 'tenant-456',
            role: 'super_admin' as const,
            email: 'admin@example.com',
        };

        const token = await createToken(payload, mockSecret);
        const verified = await verifyToken(token, mockSecret);

        expect(verified).toBeDefined();
        expect(verified?.userId).toBe(payload.userId);
        expect(verified?.tenantId).toBe(payload.tenantId);
        expect(verified?.role).toBe(payload.role);
        expect(verified?.email).toBe(payload.email);
    });

    it('should return null for invalid token', async () => {
        const invalidToken = 'invalid.token.here';
        const verified = await verifyToken(invalidToken, mockSecret);

        expect(verified).toBeNull();
    });

    it('should return null for expired token', async () => {
        const payload = {
            userId: 'test-user-123',
            tenantId: 'tenant-456',
            role: 'tenant_admin' as const,
            email: 'test@example.com',
        };

        // Create token with negative expiry (already expired)
        const token = await createToken(payload, mockSecret, '-1s');

        // Wait a bit to ensure expiry
        await new Promise(resolve => setTimeout(resolve, 100));

        const verified = await verifyToken(token, mockSecret);
        expect(verified).toBeNull();
    });

    it('should return null for token signed with different secret', async () => {
        const payload = {
            userId: 'test-user-123',
            tenantId: 'tenant-456',
            role: 'tenant_admin' as const,
            email: 'test@example.com',
        };

        const token = await createToken(payload, mockSecret);
        const verified = await verifyToken(token, 'different-secret-key');

        expect(verified).toBeNull();
    });
});
