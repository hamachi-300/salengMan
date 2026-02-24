-- Grant permissions for PostgREST

-- Anon role (unauthenticated) - read-only on public data
GRANT SELECT ON users TO anon;
GRANT SELECT ON old_item_posts TO anon;
GRANT SELECT ON driver_locations TO anon;
GRANT SELECT ON old_item_post_scores TO anon;

-- Authenticated role - full access to own data
GRANT ALL ON users TO authenticated;
GRANT ALL ON addresses TO authenticated;
GRANT ALL ON old_item_posts TO authenticated;
GRANT ALL ON orders TO authenticated;
GRANT ALL ON driver_locations TO authenticated;
GRANT ALL ON old_item_post_scores TO authenticated;

-- Grant sequence usage
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE old_item_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE old_item_post_scores ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users
DROP POLICY IF EXISTS "Users can view all profiles" ON users;
CREATE POLICY "Users can view all profiles" ON users
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON users;
CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (
        id::text = COALESCE(current_setting('request.jwt.claims', true)::json->>'user_id', '')
    );

-- RLS Policies for addresses
DROP POLICY IF EXISTS "Users can view own addresses" ON addresses;
CREATE POLICY "Users can view own addresses" ON addresses
    FOR SELECT USING (
        user_id::text = COALESCE(current_setting('request.jwt.claims', true)::json->>'user_id', '')
    );

DROP POLICY IF EXISTS "Users can manage own addresses" ON addresses;
CREATE POLICY "Users can manage own addresses" ON addresses
    FOR ALL USING (
        user_id::text = COALESCE(current_setting('request.jwt.claims', true)::json->>'user_id', '')
    );

-- RLS Policies for old_item_posts
DROP POLICY IF EXISTS "Anyone can view posts" ON old_item_posts;
CREATE POLICY "Anyone can view posts" ON old_item_posts
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can manage own posts" ON old_item_posts;
CREATE POLICY "Users can manage own posts" ON old_item_posts
    FOR ALL USING (
        user_id::text = COALESCE(current_setting('request.jwt.claims', true)::json->>'user_id', '')
    );

-- RLS Policies for orders
DROP POLICY IF EXISTS "View related orders" ON orders;
CREATE POLICY "View related orders" ON orders
    FOR SELECT USING (
        seller_id::text = COALESCE(current_setting('request.jwt.claims', true)::json->>'user_id', '')
        OR driver_id::text = COALESCE(current_setting('request.jwt.claims', true)::json->>'user_id', '')
    );

DROP POLICY IF EXISTS "Drivers can update assigned orders" ON orders;
CREATE POLICY "Drivers can update assigned orders" ON orders
    FOR UPDATE USING (
        driver_id::text = COALESCE(current_setting('request.jwt.claims', true)::json->>'user_id', '')
    );

-- RLS Policies for driver_locations
DROP POLICY IF EXISTS "Anyone can view driver locations" ON driver_locations;
CREATE POLICY "Anyone can view driver locations" ON driver_locations
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Drivers can update own location" ON driver_locations;
CREATE POLICY "Drivers can update own location" ON driver_locations
    FOR ALL USING (
        driver_id::text = COALESCE(current_setting('request.jwt.claims', true)::json->>'user_id', '')
    );

-- RLS Policies for old_item_post_scores
DROP POLICY IF EXISTS "Anyone can view scores" ON old_item_post_scores;
CREATE POLICY "Anyone can view scores" ON old_item_post_scores
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can manage own scores" ON old_item_post_scores;
CREATE POLICY "Users can manage own scores" ON old_item_post_scores
    FOR ALL USING (
        user_id::text = COALESCE(current_setting('request.jwt.claims', true)::json->>'user_id', '')
    );
