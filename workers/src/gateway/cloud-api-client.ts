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
    type: 'text' | 'template' | 'image' | 'document';
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
     * Verify webhook signature (for security)
     */
    static verifyWebhookSignature(
        payload: string,
        signature: string,
        appSecret: string
    ): boolean {
        // Implementation would use crypto for HMAC validation
        // For now, simplified version
        return true; // TODO: Implement proper verification
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
