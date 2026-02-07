import { DurableObject } from 'cloudflare:workers';
import makeWASocket, {
    DisconnectReason,
    useMultiFileAuthState,
    WASocket,
    proto,
    BaileysEventMap,
} from '@whiskeysockets/baileys';
import QRCode from 'qrcode';
import type { Env } from '@/types/env';
import { sendWithTypingSimulation, type AntiBanConfig } from '@/utils/anti-ban';

interface SessionState {
    status: 'disconnected' | 'connecting' | 'scanning' | 'connected';
    qrCode?: string;
    phoneNumber?: string;
    deviceId: string;
}

export class WhatsAppSession extends DurableObject<Env> {
    private sock: WASocket | null = null;
    private state: SessionState;
    private antiBanConfig: AntiBanConfig = {
        enabled: true,
        typingMin: 1,
        typingMax: 3,
    };

    constructor(state: DurableObjectState, env: Env) {
        super(state, env);

        // Initialize state
        const deviceId = this.ctx.id.toString();
        this.state = {
            status: 'disconnected',
            deviceId,
        };
    }

    async fetch(request: Request): Promise<Response> {
        const url = new URL(request.url);
        const path = url.pathname;

        try {
            switch (path) {
                case '/connect':
                    return await this.handleConnect(request);
                case '/send':
                    return await this.handleSendMessage(request);
                case '/disconnect':
                    return await this.handleDisconnect();
                case '/status':
                    return await this.handleStatus();
                case '/config':
                    return await this.handleUpdateConfig(request);
                default:
                    return new Response('Not found', { status: 404 });
            }
        } catch (error: any) {
            return Response.json({
                success: false,
                error: error.message || 'Internal error',
            }, { status: 500 });
        }
    }

    /**
     * Connect WhatsApp and generate QR code
     */
    private async handleConnect(request: Request): Promise<Response> {
        if (this.sock) {
            return Response.json({
                success: true,
                data: {
                    status: this.state.status,
                    qrCode: this.state.qrCode,
                    phoneNumber: this.state.phoneNumber,
                },
            });
        }

        try {
            this.state.status = 'connecting';

            // Load auth state from R2
            const { state: authState, saveCreds } = await this.loadAuthStateFromR2();

            // Create Baileys socket
            this.sock = makeWASocket({
                auth: authState,
                printQRInTerminal: false,
                browser: ['CloudWA', 'Chrome', '1.0.0'],
            });

            // Handle credentials update
            this.sock.ev.on('creds.update', saveCreds);

            // Handle connection updates
            this.sock.ev.on('connection.update', async (update) => {
                await this.handleConnectionUpdate(update);
            });

            // Handle incoming messages
            this.sock.ev.on('messages.upsert', async (msg) => {
                await this.handleIncomingMessage(msg);
            });

            return Response.json({
                success: true,
                data: {
                    status: this.state.status,
                    message: 'Connecting...',
                },
            });
        } catch (error: any) {
            this.state.status = 'disconnected';
            throw error;
        }
    }

    /**
     * Handle connection updates from Baileys
     */
    private async handleConnectionUpdate(update: Partial<BaileysEventMap['connection.update']>): Promise<void> {
        const { connection, lastDisconnect, qr } = update;

        // QR code received
        if (qr) {
            this.state.status = 'scanning';
            this.state.qrCode = await QRCode.toDataURL(qr);
        }

        // Connection closed
        if (connection === 'close') {
            const shouldReconnect =
                (lastDisconnect?.error as any)?.output?.statusCode !== DisconnectReason.loggedOut;

            this.sock = null;

            if (shouldReconnect) {
                this.state.status = 'disconnected';
                // Auto-reconnect logic can be added here
            } else {
                this.state.status = 'disconnected';
            }
        }

        // Connection opened (connected)
        if (connection === 'open') {
            this.state.status = 'connected';
            this.state.qrCode = undefined;

            // Get phone number
            if (this.sock?.user?.id) {
                this.state.phoneNumber = this.sock.user.id.split(':')[0];
            }
        }
    }

    /**
     * Handle incoming messages
     */
    private async handleIncomingMessage(msg: BaileysEventMap['messages.upsert']): Promise<void> {
        const { messages, type } = msg;

        if (type !== 'notify') return;

        for (const message of messages) {
            // Skip if message is from us
            if (message.key.fromMe) continue;

            const contactPhone = message.key.remoteJid?.split('@')[0] || '';
            const messageContent = message.message?.conversation ||
                message.message?.extendedTextMessage?.text || '';

            // TODO: Trigger flow execution or AI fallback
            console.log('Incoming message:', {
                from: contactPhone,
                content: messageContent,
            });

            // Webhook to main worker for flow processing
            try {
                await fetch(`${this.env.WORKERS_URL || ''}/api/webhook/baileys/${this.state.deviceId}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        deviceId: this.state.deviceId,
                        contactPhone,
                        messageContent,
                        messageType: 'text',
                        waMessageId: message.key.id,
                    }),
                });
            } catch (error) {
                console.error('Failed to send webhook:', error);
            }
        }
    }

    /**
     * Send message with anti-ban protection
     */
    private async handleSendMessage(request: Request): Promise<Response> {
        if (!this.sock || this.state.status !== 'connected') {
            return Response.json({
                success: false,
                error: 'WhatsApp not connected',
            }, { status: 400 });
        }

        const { chatId, message, useAntiBan = true } = await request.json();

        if (!chatId || !message) {
            return Response.json({
                success: false,
                error: 'chatId and message required',
            }, { status: 400 });
        }

        const jid = chatId.includes('@') ? chatId : `${chatId}@s.whatsapp.net`;

        try {
            if (useAntiBan && this.antiBanConfig.enabled) {
                await sendWithTypingSimulation(this.sock, jid, message, this.antiBanConfig);
            } else {
                await this.sock.sendMessage(jid, { text: message });
            }

            return Response.json({
                success: true,
                data: {
                    sent: true,
                    chatId,
                },
            });
        } catch (error: any) {
            return Response.json({
                success: false,
                error: error.message || 'Failed to send message',
            }, { status: 500 });
        }
    }

    /**
     * Disconnect WhatsApp
     */
    private async handleDisconnect(): Promise<Response> {
        if (this.sock) {
            await this.sock.logout();
            this.sock = null;
        }

        this.state.status = 'disconnected';
        this.state.qrCode = undefined;
        this.state.phoneNumber = undefined;

        return Response.json({
            success: true,
            data: {
                status: 'disconnected',
            },
        });
    }

    /**
     * Get current status
     */
    private async handleStatus(): Promise<Response> {
        return Response.json({
            success: true,
            data: {
                status: this.state.status,
                qrCode: this.state.qrCode,
                phoneNumber: this.state.phoneNumber,
                deviceId: this.state.deviceId,
            },
        });
    }

    /**
     * Update anti-ban configuration
     */
    private async handleUpdateConfig(request: Request): Promise<Response> {
        const newConfig = await request.json();
        this.antiBanConfig = { ...this.antiBanConfig, ...newConfig };

        // Persist to Durable Object storage
        await this.ctx.storage.put('antiBanConfig', this.antiBanConfig);

        return Response.json({
            success: true,
            data: {
                config: this.antiBanConfig,
            },
        });
    }

    /**
     * Load auth state from R2
     */
    private async loadAuthStateFromR2() {
        const bucket = this.env.SESSION_BUCKET;
        const deviceId = this.state.deviceId;
        const credsPath = `${deviceId}/creds.json`;

        // Try to load existing credentials
        let creds: any = null;
        try {
            const credsObj = await bucket.get(credsPath);
            if (credsObj) {
                creds = await credsObj.json();
            }
        } catch (error) {
            console.log('No existing credentials found');
        }

        return useMultiFileAuthState({
            readData: async (file: string) => {
                try {
                    const obj = await bucket.get(`${deviceId}/${file}`);
                    if (obj) {
                        return await obj.text();
                    }
                } catch (error) {
                    console.error('Failed to read auth data:', error);
                }
                return null;
            },
            writeData: async (file: string, data: any) => {
                try {
                    await bucket.put(`${deviceId}/${file}`, JSON.stringify(data));
                } catch (error) {
                    console.error('Failed to write auth data:', error);
                }
            },
            removeData: async (file: string) => {
                try {
                    await bucket.delete(`${deviceId}/${file}`);
                } catch (error) {
                    console.error('Failed to remove auth data:', error);
                }
            },
        });
    }
}
