-- Trash posts table for "Post Trash" feature
CREATE TABLE IF NOT EXISTS trash_posts (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    images TEXT[],
    remarks TEXT,
    post_type VARCHAR(50) CHECK (post_type IN ('anytime', 'fast')),
    coins_selected INTEGER DEFAULT 0,
    user_coin_snapshot INTEGER, -- The coin balance user had at time of posting
    trash_bag_amount INTEGER DEFAULT 1,
    address_snapshot JSONB,
    contact_snapshot JSONB,
    status VARCHAR(50) DEFAULT 'waiting',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_trash_posts_user_id ON trash_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_trash_posts_status ON trash_posts(status);

-- Add triggers for updated_at if needed (optional but good practice)
-- (Your project seems to use updated_at but doesn't have the triggers explicitly shown in 02-tables.sql)
