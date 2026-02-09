-- Migration: Allow flows to exist without device (orphaned flows)
-- When device is deleted, flows.device_id becomes NULL instead of deleting flow

PRAGMA foreign_keys=OFF;

-- Create new flows table with nullable device_id and SET NULL on delete
CREATE TABLE flows_new (
    id TEXT PRIMARY KEY,
    device_id TEXT,  -- Nullable - allows orphaned flows
    name TEXT NOT NULL,
    description TEXT,
    trigger_keywords TEXT NOT NULL,
    flow_json TEXT NOT NULL,
    is_active INTEGER DEFAULT 0,
    priority INTEGER DEFAULT 0,
    version INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE SET NULL
);

-- Copy all existing data
INSERT INTO flows_new 
SELECT id, device_id, name, description, trigger_keywords, flow_json, is_active, priority, version, created_at, updated_at
FROM flows;

-- Replace old table with new one
DROP TABLE flows;
ALTER TABLE flows_new RENAME TO flows;

PRAGMA foreign_keys=ON;
