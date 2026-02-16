-- Setup for Supabase Realtime

-- Create publication for realtime if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        CREATE PUBLICATION supabase_realtime;
    END IF;
END
$$;

-- Add tables to realtime publication (ignore errors if already added)
DO $$
BEGIN
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE orders;
    EXCEPTION WHEN duplicate_object THEN
        NULL;
    END;

    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE driver_locations;
    EXCEPTION WHEN duplicate_object THEN
        NULL;
    END;

    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE old_item_posts;
    EXCEPTION WHEN duplicate_object THEN
        NULL;
    END;
END
$$;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_old_item_posts_updated_at ON old_item_posts;
CREATE TRIGGER update_old_item_posts_updated_at
    BEFORE UPDATE ON old_item_posts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;
CREATE TRIGGER update_orders_updated_at
    BEFORE UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create function to broadcast changes via NOTIFY (for custom realtime implementations)
CREATE OR REPLACE FUNCTION notify_realtime_changes()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM pg_notify(
        'realtime:' || TG_TABLE_NAME,
        json_build_object(
            'table', TG_TABLE_NAME,
            'action', TG_OP,
            'data', CASE
                WHEN TG_OP = 'DELETE' THEN row_to_json(OLD)
                ELSE row_to_json(NEW)
            END
        )::text
    );

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for driver location updates
DROP TRIGGER IF EXISTS driver_location_realtime ON driver_locations;
CREATE TRIGGER driver_location_realtime
    AFTER INSERT OR UPDATE OR DELETE ON driver_locations
    FOR EACH ROW
    EXECUTE FUNCTION notify_realtime_changes();

-- Trigger for order updates
DROP TRIGGER IF EXISTS order_realtime ON orders;
CREATE TRIGGER order_realtime
    AFTER INSERT OR UPDATE OR DELETE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION notify_realtime_changes();

-- Trigger for old item posts
DROP TRIGGER IF EXISTS old_item_posts_realtime ON old_item_posts;
CREATE TRIGGER old_item_posts_realtime
    AFTER INSERT OR UPDATE OR DELETE ON old_item_posts
    FOR EACH ROW
    EXECUTE FUNCTION notify_realtime_changes();
