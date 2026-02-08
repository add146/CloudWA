ALTER TABLE tenant_ai_settings ADD `api_key` text;--> statement-breakpoint
ALTER TABLE tenant_ai_settings ADD `config` text DEFAULT '{}';