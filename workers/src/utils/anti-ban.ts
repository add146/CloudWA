import type { WASocket } from '@whiskeysockets/baileys';

export interface AntiBanConfig {
    enabled: boolean;
    typingMin: number; // seconds
    typingMax: number; // seconds
}

/**
 * Send message with anti-ban protection (typing simulation)
 */
export async function sendWithTypingSimulation(
    sock: WASocket,
    jid: string,
    message: string,
    config: AntiBanConfig
): Promise<void> {
    if (!config.enabled) {
        await sock.sendMessage(jid, { text: message });
        return;
    }

    try {
        // 1. Subscribe to presence updates for this contact
        await sock.presenceSubscribe(jid);

        // 2. Set ourselves as online
        await sock.sendPresenceUpdate('available');

        // 3. Start typing indicator
        await sock.sendPresenceUpdate('composing', jid);

        // 4. Calculate natural typing delay
        const delay = calculateTypingDelay(message, config);
        await sleep(delay);

        // 5. Send the actual message
        await sock.sendMessage(jid, { text: message });

        // 6. Stop typing indicator
        await sock.sendPresenceUpdate('paused', jid);

    } catch (error) {
        console.error('Anti-ban send failed:', error);
        // Fallback to direct send
        await sock.sendMessage(jid, { text: message });
    }
}

/**
 * Calculate natural typing delay based on message length
 */
function calculateTypingDelay(
    message: string,
    config: AntiBanConfig
): number {
    const { typingMin, typingMax } = config;

    // Calculate based on message length
    const words = message.split(/\s+/).length;
    const chars = message.length;

    // Average typing speed: 40 words/min or 200 chars/min
    const wordBasedMs = (words / 40) * 60 * 1000;
    const charBasedMs = (chars / 200) * 60 * 1000;

    // Use average of both methods
    const baseMs = (wordBasedMs + charBasedMs) / 2;

    // Clamp to min-max range
    const minMs = typingMin * 1000;
    const maxMs = typingMax * 1000;
    const clampedMs = Math.max(minMs, Math.min(baseMs, maxMs));

    // Add ±20% randomness for natural feel
    const randomFactor = 0.8 + Math.random() * 0.4;

    return Math.round(clampedMs * randomFactor);
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Calculate message gap for broadcast (rate limiting)
 */
export function calculateMessageGap(
    minGap: number,
    maxGap: number
): number {
    // Random gap between min and max (in seconds)
    let gap = minGap + Math.random() * (maxGap - minGap);

    // 10% chance of longer pause (2x) for more natural pattern
    if (Math.random() < 0.1) {
        gap *= 2;
    }

    return gap * 1000; // Convert to ms
}
