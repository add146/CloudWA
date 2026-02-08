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
    me?: {
        id: string; // e.g. "6285232364446@c.us"
        pushName?: string;
    };
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
        // WAHA API: POST /api/sessions/start with name in body
        const response = await fetch(`${this.config.baseUrl}/api/sessions/start`, {
            method: 'POST',
            headers: {
                'X-Api-Key': this.config.apiKey,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                name: sessionName,
                config: webhookUrl ? {
                    webhooks: [{
                        url: webhookUrl,
                        events: ['message', 'session.status'],
                    }]
                } : undefined,
            }),
        });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error('WAHA API Error:', response.status, errorBody);
            throw new Error(`WAHA API error: ${response.statusText} - ${errorBody}`);
        }

        return await response.json();
    }



    /**
     * Get QR code for scanning
     * WAHA returns QR in format: { mimetype: 'image/png', data: 'base64...' }
     */
    async getQRCode(sessionName: string): Promise<WAHAQRCode> {
        const response = await fetch(
            `${this.config.baseUrl}/api/${sessionName}/auth/qr`,
            {
                headers: {
                    'X-Api-Key': this.config.apiKey,
                    'Accept': 'application/json',
                },
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            console.error('WAHA QR Error:', response.status, errorText);
            throw new Error(`WAHA QR error: ${response.statusText} - ${errorText}`);
        }

        const data = await response.json() as { value?: string; data?: string; mimetype?: string };
        console.log('QR Response:', JSON.stringify(data).substring(0, 200));

        // Handle different response formats
        if (data.value) {
            // Format: { value: "base64..." }
            return { mimetype: 'image/png', data: data.value };
        } else if (data.data) {
            // Format: { mimetype: "...", data: "base64..." }
            return { mimetype: data.mimetype || 'image/png', data: data.data };
        }


        throw new Error('Unexpected QR response format');
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
