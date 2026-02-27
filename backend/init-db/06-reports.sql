-- Problem reports table
CREATE TABLE IF NOT EXISTS problem_reports (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    header TEXT NOT NULL,
    content TEXT NOT NULL,
    image_url TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User reports table
CREATE TABLE IF NOT EXISTS user_reports (
    id SERIAL PRIMARY KEY,
    reporter_id UUID REFERENCES users(id) ON DELETE CASCADE,
    reported_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    header TEXT NOT NULL,
    content TEXT NOT NULL,
    image_url TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add permissions for the new tables
GRANT ALL PRIVILEGES ON TABLE problem_reports TO authenticated;
GRANT ALL PRIVILEGES ON TABLE user_reports TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE problem_reports_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE user_reports_id_seq TO authenticated;
