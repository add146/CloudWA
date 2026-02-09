-- Seed default AI providers
-- Run this to populate the ai_providers table with default providers

INSERT INTO ai_providers (id, display_name, provider, api_key, model_id, is_active, created_at, updated_at)
VALUES 
    ('provider-openai', 'OpenAI', 'openai', '', 'gpt-4o', 0, datetime('now'), datetime('now')),
    ('provider-gemini', 'Google Gemini', 'gemini', '', 'gemini-1.5-flash', 0, datetime('now'), datetime('now')),
    ('provider-hybrid', 'Hybrid (Workers AI)', 'hybrid', '', '@cf/meta/llama-3.1-8b-instruct', 0, datetime('now'), datetime('now')),
    ('provider-workers-ai', 'Cloudflare AI (Free)', 'workers_ai', '', '@cf/meta/llama-3.1-8b-instruct', 1, datetime('now'), datetime('now'))
ON CONFLICT(id) DO UPDATE SET
    updated_at = datetime('now');
