import { describe, it, expect } from 'vitest';
import { calculateTypingDelay, sendWithTypingSimulation } from '../src/utils/anti-ban';

describe('Anti-Ban Utilities', () => {
    describe('calculateTypingDelay', () => {
        it('should calculate delay based on message length', () => {
            const shortMessage = 'Hi';
            const mediumMessage = 'Hello, how are you today?';
            const longMessage = 'This is a much longer message that simulates a real conversation with multiple sentences and details.';

            const shortDelay = calculateTypingDelay(shortMessage, { typingMin: 1, typingMax: 3 });
            const mediumDelay = calculateTypingDelay(mediumMessage, { typingMin: 1, typingMax: 3 });
            const longDelay = calculateTypingDelay(longMessage, { typingMin: 1, typing Max: 3 });

            expect(shortDelay).toBeGreaterThanOrEqual(1000);
            expect(mediumDelay).toBeGreaterThan(shortDelay);
            expect(longDelay).toBeGreaterThan(mediumDelay);
        });

        it('should respect min and max bounds', () => {
            const message = 'Testing message';
            const config = { typingMin: 2, typingMax: 5 };

            // Run multiple times to test randomness
            for (let i = 0; i < 10; i++) {
                const delay = calculateTypingDelay(message, config);
                expect(delay).toBeGreaterThanOrEqual(2000);
                expect(delay).toBeLessThanOrEqual(message.length * 100 + 5000);
            }
        });

        it('should handle empty message', () => {
            const delay = calculateTypingDelay('', { typingMin: 1, typingMax: 3 });
            expect(delay).toBeGreaterThanOrEqual(1000);
            expect(delay).toBeLessThanOrEqual(3000);
        });

        it('should use default config when not provided', () => {
            const message = 'Test';
            const delay = calculateTypingDelay(message);

            expect(delay).toBeGreaterThanOrEqual(1000); // default min
            expect(delay).toBeDefined();
        });
    });

    describe('sendWithTypingSimulation', () => {
        it('should return a function that simulates typing', () => {
            const mockSendFn = async (msg: string) => ({ success: true, message: msg });
            const enhanced = sendWithTypingSimulation(mockSendFn);

            expect(typeof enhanced).toBe('function');
        });

        it('should add delay before sending', async () => {
            const mockSendFn = async (msg: string) => ({ success: true, message: msg });
            const enhanced = sendWithTypingSimulation(mockSendFn, { typingMin: 0.1, typingMax: 0.2 });

            const start = Date.now();
            await enhanced('Test message');
            const elapsed = Date.now() - start;

            // Should have at least some delay (minimum 100ms based on config)
            expect(elapsed).toBeGreaterThanOrEqual(100);
        });
    });
});
