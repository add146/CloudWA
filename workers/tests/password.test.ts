import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword } from '../src/auth/password';

describe('Password Utilities', () => {
    it('should hash a password', async () => {
        const password = 'MySecurePassword123!';
        const hash = await hashPassword(password);

        expect(hash).toBeDefined();
        expect(typeof hash).toBe('string');
        expect(hash).not.toBe(password);
        expect(hash.startsWith('$2a$') || hash.startsWith('$2b$')).toBe(true); // bcrypt format
    });

    it('should verify correct password', async () => {
        const password = 'MySecurePassword123!';
        const hash = await hashPassword(password);

        const isValid = await verifyPassword(password, hash);
        expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
        const password = 'MySecurePassword123!';
        const wrongPassword = 'WrongPassword456!';
        const hash = await hashPassword(password);

        const isValid = await verifyPassword(wrongPassword, hash);
        expect(isValid).toBe(false);
    });

    it('should generate different hashes for same password', async () => {
        const password = 'MySecurePassword123!';
        const hash1 = await hashPassword(password);
        const hash2 = await hashPassword(password);

        // bcrypt uses salt, so hashes should be different
        expect(hash1).not.toBe(hash2);

        // But both should verify correctly
        expect(await verifyPassword(password, hash1)).toBe(true);
        expect(await verifyPassword(password, hash2)).toBe(true);
    });

    it('should handle empty password', async () => {
        const password = '';
        const hash = await hashPassword(password);

        expect(hash).toBeDefined();
        expect(await verifyPassword('', hash)).toBe(true);
        expect(await verifyPassword('not-empty', hash)).toBe(false);
    });
});
