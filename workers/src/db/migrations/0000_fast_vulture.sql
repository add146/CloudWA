CREATE TABLE `ai_providers` (
	`id` text PRIMARY KEY NOT NULL,
	`provider` text NOT NULL,
	`api_key` text NOT NULL,
	`display_name` text NOT NULL,
	`model_id` text,
	`is_active` integer DEFAULT true,
	`settings` text DEFAULT '{}',
	`rate_limit_per_tenant` integer DEFAULT 100,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `campaign_items` (
	`id` text PRIMARY KEY NOT NULL,
	`campaign_id` text NOT NULL,
	`contact_id` text NOT NULL,
	`status` text DEFAULT 'queued',
	`rendered_message` text,
	`error_reason` text,
	`sent_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`campaign_id`) REFERENCES `campaigns`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`contact_id`) REFERENCES `contacts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `campaigns` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`device_id` text NOT NULL,
	`name` text NOT NULL,
	`message_template` text NOT NULL,
	`media_url` text,
	`media_type` text,
	`status` text DEFAULT 'draft',
	`scheduled_at` text,
	`started_at` text,
	`completed_at` text,
	`total_contacts` integer DEFAULT 0,
	`sent_count` integer DEFAULT 0,
	`failed_count` integer DEFAULT 0,
	`rate_config` text DEFAULT '{"minGap":10,"maxGap":30}',
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`device_id`) REFERENCES `devices`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `contacts` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`phone` text NOT NULL,
	`name` text,
	`email` text,
	`tags` text DEFAULT '[]',
	`custom_attributes` text DEFAULT '{}',
	`source` text DEFAULT 'manual',
	`last_contacted` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `devices` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`phone_number` text,
	`display_name` text,
	`gateway_type` text DEFAULT 'baileys',
	`session_status` text DEFAULT 'disconnected',
	`baileys_session_data` text,
	`cloud_api_config` text DEFAULT '{}',
	`webhook_url` text,
	`anti_ban_config` text DEFAULT '{"enabled":true,"typingMin":1,"typingMax":3}',
	`ai_fallback_enabled` integer DEFAULT false,
	`ai_fallback_kb_ids` text DEFAULT '[]',
	`ai_fallback_prompt` text,
	`connected_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `document_chunks` (
	`id` text PRIMARY KEY NOT NULL,
	`doc_id` text NOT NULL,
	`chunk_index` integer NOT NULL,
	`content` text NOT NULL,
	`vector_id` text,
	`metadata` text DEFAULT '{}',
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`doc_id`) REFERENCES `knowledge_docs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `flow_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`flow_id` text NOT NULL,
	`device_id` text NOT NULL,
	`contact_phone` text NOT NULL,
	`current_node_id` text NOT NULL,
	`variables` text DEFAULT '{}',
	`context` text DEFAULT '[]',
	`status` text DEFAULT 'active',
	`last_interaction` text DEFAULT CURRENT_TIMESTAMP,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`flow_id`) REFERENCES `flows`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`device_id`) REFERENCES `devices`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `flows` (
	`id` text PRIMARY KEY NOT NULL,
	`device_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`trigger_keywords` text NOT NULL,
	`flow_json` text NOT NULL,
	`is_active` integer DEFAULT false,
	`priority` integer DEFAULT 0,
	`version` integer DEFAULT 1,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`device_id`) REFERENCES `devices`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `knowledge_docs` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`filename` text NOT NULL,
	`file_url` text NOT NULL,
	`file_type` text NOT NULL,
	`total_chunks` integer DEFAULT 0,
	`status` text DEFAULT 'processing',
	`error_message` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `messages` (
	`id` text PRIMARY KEY NOT NULL,
	`device_id` text NOT NULL,
	`contact_phone` text NOT NULL,
	`direction` text NOT NULL,
	`message_type` text DEFAULT 'text',
	`content` text,
	`media_url` text,
	`wa_message_id` text,
	`flow_id` text,
	`campaign_id` text,
	`metadata` text DEFAULT '{}',
	`timestamp` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`device_id`) REFERENCES `devices`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`flow_id`) REFERENCES `flows`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`campaign_id`) REFERENCES `campaigns`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `super_admins` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`name` text,
	`avatar_url` text,
	`last_login` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `tenant_ai_settings` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`ai_provider_id` text NOT NULL,
	`is_default` integer DEFAULT false,
	`custom_system_prompt` text,
	`usage_current` integer DEFAULT 0,
	`usage_limit` integer DEFAULT 0,
	`last_used` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`ai_provider_id`) REFERENCES `ai_providers`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `tenants` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`subscription_plan` text DEFAULT 'free',
	`settings` text DEFAULT '{}',
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`name` text,
	`avatar_url` text,
	`last_login` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `super_admins_email_unique` ON `super_admins` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `tenants_email_unique` ON `tenants` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);