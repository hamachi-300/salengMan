-- Coin Transactions table
CREATE TABLE IF NOT EXISTS coin_transactions (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,
    type VARCHAR(10) CHECK (type IN ('buy', 'use')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for querying history
CREATE INDEX IF NOT EXISTS idx_coin_transactions_user_id ON coin_transactions(user_id);
