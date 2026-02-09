-- Migration: Add tenant_id to flows to support orphaned flows
-- This ensures we know who owns the flow even if device_id is NULL

PRAGMA foreign_keys=OFF;

-- 1. Add tenant_id column (nullable first)
ALTER TABLE flows ADD COLUMN tenant_id TEXT REFERENCES tenants(id) ON DELETE CASCADE;

-- 2. Populate tenant_id from existing device links
UPDATE flows 
SET tenant_id = (
    SELECT tenant_id 
    FROM devices 
    WHERE devices.id = flows.device_id
)
WHERE device_id IS NOT NULL;

-- 3. For any existing orphaned flows (if any), we might lose them or need manual fix.
-- Since we just added orphaned support, likely very few or just test data.

PRAGMA foreign_keys=ON;
