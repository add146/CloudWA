/**
 * WAHA (WhatsApp HTTP API) Client
 * 
 * WAHA is a Docker container that runs WhatsApp libraries (Baileys, etc)
 * and exposes HTTP REST API that we can call from Workers.
 * 
 * Deploy WAHA on Railway/VPS, then use this client to communicate.
 * Docs: https://waha.devlike.pro/docs/
 */

export interface WAHAConfig {
    baseUrl: string; // e.g., https://waha.railway.app
    apiKey: string;
}

export interface WAHASession {
    name: string; // Same as device.id
    status: 'STOPPED' | 'STARTING' | 'SCAN_QR_CODE' | 'WORKING' | 'FAILED';
    config?: {
        webhooks?: {
            url: string;
            events: ('message' | 'session.status')[];
        }[];
    };
}

export interface WAHAQRCode {
    mimetype: string;
    data: string; // base64
}

export interface WAHASendMessageRequest {
    chatId: string; // phone number with @c.us suffix
    text: string;
    session?: string;
}

export class WAHAClient {
    constructor(private config: WAHAConfig) { }

    /**
     * Start a new WhatsApp session (get QR code)
     */
    async startSession(sessionName: string, webhookUrl?: string): Promise<WAHASession> {
        const response = await fetch(`${this.config.baseUrl}/api/sessions/${sessionName}/start`, {
            method: 'POST',
            headers: {
                'X-Api-Key': this.config.apiKey,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                webhooks: webhookUrl ? [{
                    url: webhookUrl,
                    events: ['message', 'session.status'],
                }] : undefined,
            }),
        });

        if (!response.ok) {
            throw new Error(`WAHA API error: ${response.statusText}`);
        }

        return await response.json();
    }

    /**
     * Get QR code for scanning
     */
    async getQRCode(sessionName: string): Promise<WAHAQRCode> {
        const response = await fetch(
            `${this.config.baseUrl}/api/sessions/${sessionName}/qr`,
            {
                headers: {
                    'X-Api-Key': this.config.apiKey,
                },
            }
        );

        if (!response.ok) {
            throw new Error(`WAHA API error: ${response.statusText}`);
        }

        return await response.json();
    }

    /**
     * Get session status
     */
    async getSessionStatus(sessionName: string): Promise<WAHASession> {
        const response = await fetch(
            `${this.config.baseUrl}/api/sessions/${sessionName}`,
            {
                headers: {
                    'X-Api-Key': this.config.apiKey,
                },
            }
        );

        if (!response.ok) {
            throw new Error(`WAHA API error: ${response.statusText}`);
        }

        return await response.json();
    }

    /**
     * Send text message
     */
    async sendMessage(params: WAHASendMessageRequest): Promise<any> {
        const response = await fetch(
            `${this.config.baseUrl}/api/sendText`,
            {
                method: 'POST',
                headers: {
                    'X-Api-Key': this.config.apiKey,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    session: params.session,
                    chatId: params.chatId.includes('@') ? params.chatId : `${params.chatId}@c.us`,
                    text: params.text,
                }),
            }
        );

        if (!response.ok) {
            throw new Error(`WAHA API error: ${response.statusText}`);
        }

        return await response.json();
    }

    /**
     * Stop session (logout)
     */
    async stopSession(sessionName: string): Promise<void> {
        const response = await fetch(
            `${this.config.baseUrl}/api/sessions/${sessionName}/stop`,
            {
                method: 'POST',
                headers: {
                    'X-Api-Key': this.config.apiKey,
                },
            }
        );

        if (!response.ok) {
            throw new Error(`WAHA API error: ${response.statusText}`);
        }
    }

    /**
     * Delete session (logout + delete auth)
     */
    async deleteSession(sessionName: string): Promise<void> {
        const response = await fetch(
            `${this.config.baseUrl}/api/sessions/${sessionName}`,
            {
                method: 'DELETE',
                headers: {
                    'X-Api-Key': this.config.apiKey,
                },
            }
        );

        if (!response.ok) {
            throw new Error(`WAHA API error: ${response.statusText}`);
        }
    }
}
