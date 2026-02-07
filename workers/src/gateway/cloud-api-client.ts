/**
 * WhatsApp Cloud API Client
 * 
 * Official WhatsApp Business Platform API from Meta.
 * Docs: https://developers.facebook.com/docs/whatsapp/cloud-api
 */

export interface CloudAPIConfig {
    phoneNumberId: string; // Your WhatsApp Business Phone Number ID
    accessToken: string; // Permanent access token from Meta
    apiVersion?: string; // Default: v18.0
}

export interface CloudAPISendMessageRequest {
    to: string; // Phone number (e.g., "628123456789")
    type: 'text' | 'template' | 'image' | 'document' | 'video' | 'audio';
    text?: {
        body: string;
        preview_url?: boolean;
    };
    template?: {
        name: string;
        language: {
            code: string;
        };
        components?: any[];
    };
    image?: {
        id?: string;
        link?: string;
        caption?: string;
    };
    document?: {
        id?: string;
        link?: string;
        filename?: string;
        caption?: string;
    };
    video?: {
        id?: string;
        link?: string;
        caption?: string;
    };
    audio?: {
        id?: string;
        link?: string;
    };
}

export interface CloudAPIWebhookMessage {
    object: 'whatsapp_business_account';
    entry: Array<{
        id: string;
        changes: Array<{
            value: {
                messaging_product: 'whatsapp';
                metadata: {
                    display_phone_number: string;
                    phone_number_id: string;
                };
                contacts?: Array<{
                    profile: {
                        name: string;
                    };
                    wa_id: string;
                }>;
                messages?: Array<{
                    from: string;
                    id: string;
                    timestamp: string;
                    text?: {
                        body: string;
                    };
                    type: 'text' | 'image' | 'document' | 'audio' | 'video';
                }>;
            };
            field: 'messages';
        }>;
    }>;
}

export class CloudAPIClient {
    private apiVersion: string;

    constructor(private config: CloudAPIConfig) {
        this.apiVersion = config.apiVersion || 'v18.0';
    }

    /**
     * Send message via Cloud API
     */
    async sendMessage(params: CloudAPISendMessageRequest): Promise<any> {
        const response = await fetch(
            `https://graph.facebook.com/${this.apiVersion}/${this.config.phoneNumberId}/messages`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.config.accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    messaging_product: 'whatsapp',
                    recipient_type: 'individual',
                    to: params.to,
                    type: params.type,
                    ...(params.text && { text: params.text }),
                    ...(params.template && { template: params.template }),
                    ...(params.image && { image: params.image }),
                    ...(params.document && { document: params.document }),
                    ...(params.video && { video: params.video }),
                    ...(params.audio && { audio: params.audio }),
                }),
            }
        );

        if (!response.ok) {
            const error = await response.json();
            throw new Error(`Cloud API error: ${JSON.stringify(error)}`);
        }

        return await response.json();
    }

    /**
     * Send text message (helper)
     */
    async sendText(to: string, text: string): Promise<any> {
        return this.sendMessage({
            to,
            type: 'text',
            text: { body: text },
        });
    }

    /**
     * Send template message (for broadcasts/marketing)
     */
    async sendTemplate(
        to: string,
        templateName: string,
        languageCode: string = 'en',
        components?: any[]
    ): Promise<any> {
        return this.sendMessage({
            to,
            type: 'template',
            template: {
                name: templateName,
                language: { code: languageCode },
                components,
            },
        });
    }

    /**
     * Mark message as read
     */
    async markAsRead(messageId: string): Promise<void> {
        await fetch(
            `https://graph.facebook.com/${this.apiVersion}/${this.config.phoneNumberId}/messages`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.config.accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    messaging_product: 'whatsapp',
                    status: 'read',
                    message_id: messageId,
                }),
            }
        );
    }

    /**
     * Upload media file to WhatsApp
     * Returns media ID for use in send message
     */
    async uploadMedia(file: Blob | ArrayBuffer, mimeType: string): Promise<{ id: string }> {
        const formData = new FormData();
        formData.append('file', file instanceof ArrayBuffer ? new Blob([file], { type: mimeType }) : file);
        formData.append('messaging_product', 'whatsapp');
        formData.append('type', mimeType);

        const response = await fetch(
            `https://graph.facebook.com/${this.apiVersion}/${this.config.phoneNumberId}/media`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.config.accessToken}`,
                },
                body: formData,
            }
        );

        if (!response.ok) {
            const error = await response.json();
            throw new Error(`Media upload error: ${JSON.stringify(error)}`);
        }

        return await response.json();
    }

    /**
     * Get media download URL from media ID
     */
    async getMediaUrl(mediaId: string): Promise<{
        url: string;
        mime_type: string;
        sha256: string;
        file_size: number;
    }> {
        const response = await fetch(
            `https://graph.facebook.com/${this.apiVersion}/${mediaId}`,
            {
                headers: {
                    'Authorization': `Bearer ${this.config.accessToken}`,
                },
            }
        );

        if (!response.ok) {
            const error = await response.json();
            throw new Error(`Get media URL error: ${JSON.stringify(error)}`);
        }

        return await response.json();
    }

    /**
     * Download media file from URL
     */
    async downloadMedia(url: string): Promise<ArrayBuffer> {
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${this.config.accessToken}`,
            },
        });

        if (!response.ok) {
            throw new Error(`Media download error: ${response.statusText}`);
        }

        return await response.arrayBuffer();
    }

    /**
     * Send image message
     */
    async sendImage(to: string, mediaId: string, caption?: string): Promise<any> {
        return this.sendMessage({
            to,
            type: 'image',
            image: {
                id: mediaId,
                caption,
            },
        });
    }

    /**
     * Send document message
     */
    async sendDocument(
        to: string,
        mediaId: string,
        filename?: string,
        caption?: string
    ): Promise<any> {
        return this.sendMessage({
            to,
            type: 'document',
            document: {
                id: mediaId,
                filename,
                caption,
            },
        });
    }

    /**
     * Send video message
     */
    async sendVideo(to: string, mediaId: string, caption?: string): Promise<any> {
        return this.sendMessage({
            to,
            type: 'video',
            video: {
                id: mediaId,
                caption,
            },
        });
    }

    /**
     * Send audio message
     */
    async sendAudio(to: string, mediaId: string): Promise<any> {
        return this.sendMessage({
            to,
            type: 'audio',
            audio: {
                id: mediaId,
            },
        });
    }

    /**
     * Verify webhook signature using HMAC-SHA256
     */
    static async verifyWebhookSignature(
        payload: string,
        signature: string,
        appSecret: string
    ): Promise<boolean> {
        try {
            // Remove 'sha256=' prefix from signature
            const expectedSignature = signature.replace('sha256=', '');

            // Generate HMAC-SHA256 hash
            const encoder = new TextEncoder();
            const key = await crypto.subtle.importKey(
                'raw',
                encoder.encode(appSecret),
                { name: 'HMAC', hash: 'SHA-256' },
                false,
                ['sign']
            );

            const hashBuffer = await crypto.subtle.sign(
                'HMAC',
                key,
                encoder.encode(payload)
            );

            // Convert to hex string
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const computedSignature = hashArray
                .map(b => b.toString(16).padStart(2, '0'))
                .join('');

            // Constant-time comparison
            return computedSignature === expectedSignature;
        } catch (error) {
            console.error('Webhook signature verification error:', error);
            return false;
        }
    }

    /**
     * Parse incoming webhook
     */
    static parseWebhook(body: CloudAPIWebhookMessage): {
        from: string;
        message: string;
        messageId: string;
        timestamp: string;
    } | null {
        try {
            const change = body.entry[0]?.changes[0];
            const message = change?.value?.messages?.[0];

            if (!message) return null;

            return {
                from: message.from,
                message: message.text?.body || '',
                messageId: message.id,
                timestamp: message.timestamp,
            };
        } catch (error) {
            return null;
        }
    }
}
