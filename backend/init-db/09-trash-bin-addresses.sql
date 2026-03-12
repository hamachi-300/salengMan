-- Trash bin addresses table (managed by admin)
CREATE TABLE IF NOT EXISTS trash_bin_addresses (
    address_id TEXT PRIMARY KEY,
    label VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    lat DECIMAL(10, 8),
    lng DECIMAL(11, 8),
    note TEXT,
    province VARCHAR(100),
    district VARCHAR(100),
    images TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT timezone('Asia/Bangkok', CURRENT_TIMESTAMP),
    updated_at TIMESTAMPTZ DEFAULT timezone('Asia/Bangkok', CURRENT_TIMESTAMP)
);

CREATE INDEX IF NOT EXISTS idx_trash_bin_addresses_location ON trash_bin_addresses(lat, lng);
