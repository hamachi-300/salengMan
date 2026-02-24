-- Users table
-- Note: email + role is unique, allowing same email to register as different roles
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255),
    full_name VARCHAR(100),
    phone VARCHAR(20),
    role VARCHAR(50) DEFAULT 'customer',
    gender VARCHAR(20),
    avatar_url TEXT,
    default_address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    coin INTEGER DEFAULT 0,
    UNIQUE(email, role)
);

-- Notifies table
CREATE TABLE IF NOT EXISTS notifies (
    notify_id SERIAL PRIMARY KEY,
    notify_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    notify_header TEXT NOT NULL,
    notify_content TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    type VARCHAR(50),
    refer_id VARCHAR(255),
    contact_type VARCHAR(50)
);

-- Addresses table
CREATE TABLE IF NOT EXISTS addresses (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    label VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    lat DECIMAL(10, 8),
    lng DECIMAL(11, 8),
    phone VARCHAR(20),
    note TEXT,
    is_default BOOLEAN DEFAULT false,
    province VARCHAR(100),
    district VARCHAR(100),
    sub_district VARCHAR(100),
    zipcode VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Old item posts table
CREATE TABLE IF NOT EXISTS old_item_posts (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    images TEXT[],
    categories TEXT[],
    remarks TEXT,
    address_snapshot JSONB,
    pickup_time JSONB,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Orders table (for driver assignments)
CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    post_id INTEGER REFERENCES old_item_posts(id) ON DELETE SET NULL,
    seller_id UUID REFERENCES users(id) ON DELETE SET NULL,
    driver_id UUID REFERENCES users(id) ON DELETE SET NULL,
    status VARCHAR(50) DEFAULT 'pending',
    pickup_address JSONB,
    pickup_lat DECIMAL(10, 8),
    pickup_lng DECIMAL(11, 8),
    estimated_pickup_time TIMESTAMP,
    actual_pickup_time TIMESTAMP,
    completed_at TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Driver locations table (for real-time tracking)
CREATE TABLE IF NOT EXISTS driver_locations (
    id SERIAL PRIMARY KEY,
    driver_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    lat DECIMAL(10, 8) NOT NULL,
    lng DECIMAL(11, 8) NOT NULL,
    heading DECIMAL(5, 2),
    speed DECIMAL(6, 2),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create spatial index for driver locations
CREATE INDEX IF NOT EXISTS idx_driver_locations_geom
ON driver_locations USING GIST (
    ST_SetSRID(ST_MakePoint(lng, lat), 4326)
);

-- Chats table
CREATE TABLE IF NOT EXISTS chats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    messages JSONB DEFAULT '[]'::JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Contacts table
CREATE TABLE IF NOT EXISTS contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id INTEGER REFERENCES old_item_posts(id) ON DELETE SET NULL,
    seller_id UUID REFERENCES users(id) ON DELETE SET NULL,
    buyer_id UUID REFERENCES users(id) ON DELETE SET NULL,
    chat_id UUID REFERENCES chats(id) ON DELETE SET NULL,
    status VARCHAR(50) DEFAULT 'pending',
    type VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add contacts JSONB to old_item_posts if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'old_item_posts' AND column_name = 'contacts'
    ) THEN
        ALTER TABLE old_item_posts ADD COLUMN contacts JSONB DEFAULT '[]'::JSONB;
    END IF;

    -- Add type column to contacts if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'contacts' AND column_name = 'type'
    ) THEN
        ALTER TABLE contacts ADD COLUMN type VARCHAR(50);
    END IF;
END $$;

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_addresses_user_id ON addresses(user_id);
CREATE INDEX IF NOT EXISTS idx_old_item_posts_user_id ON old_item_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_old_item_posts_status ON old_item_posts(status);
CREATE INDEX IF NOT EXISTS idx_orders_driver_id ON orders(driver_id);
CREATE INDEX IF NOT EXISTS idx_orders_seller_id ON orders(seller_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_contacts_seller_id ON contacts(seller_id);
CREATE INDEX IF NOT EXISTS idx_contacts_buyer_id ON contacts(buyer_id);
CREATE INDEX IF NOT EXISTS idx_contacts_post_id ON contacts(post_id);

-- Old item post scores table (user ratings)
CREATE TABLE IF NOT EXISTS old_item_post_scores (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    score DECIMAL(3,2) DEFAULT 0.0,
    reviewed_user_id JSONB DEFAULT '[]'::JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Trigger function to automatically create a score record for new users
CREATE OR REPLACE FUNCTION public.create_user_score_record()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.old_item_post_scores (user_id, score, reviewed_user_id)
    VALUES (NEW.id, 0.0, '[]'::JSONB)
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger on the users table
DROP TRIGGER IF EXISTS on_user_created_score ON public.users;
CREATE TRIGGER on_user_created_score
    AFTER INSERT ON public.users
    FOR EACH ROW EXECUTE FUNCTION public.create_user_score_record();
