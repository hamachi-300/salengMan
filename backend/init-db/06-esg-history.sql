-- ESG Package History table
CREATE TABLE IF NOT EXISTS esg_package_history (
    package_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    package_name TEXT NOT NULL,
    max_weight DECIMAL(10, 2),
    max_dates_per_month INTEGER,
    cost DECIMAL(10, 2),
    total_cost DECIMAL(10, 2),
    subscription_datetime TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_esg_package_history_user_id ON esg_package_history(user_id);
