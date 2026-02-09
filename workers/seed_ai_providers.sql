-- Upsert default AI providers
INSERT INTO ai_providers (id, name, provider, is_active, logo, config_schema) VALUES
('openai', 'OpenAI', 'openai', 1, 'openai-logo.png', '{"apiKey": "string"}'),
('gemini', 'Google Gemini', 'gemini', 1, 'gemini-logo.png', '{"apiKey": "string"}'),
('anthropic', 'Anthropic', 'anthropic', 1, 'anthropic-logo.png', '{"apiKey": "string"}'),
('workers_ai', 'Cloudflare Workers AI', 'workers_ai', 1, 'cloudflare-logo.png', '{}')
ON CONFLICT(id) DO UPDATE SET 
    name = excluded.name,
    is_active = excluded.is_active,
    provider = excluded.provider;
