-- Database Documentation for SalengMan
-- These comments will appear in DBeaver's metadata and description views.

-- 1. Users table
COMMENT ON TABLE users IS 'Account information for both Customers and Drivers';
COMMENT ON COLUMN users.id IS 'Unique identifier (UUID)';
COMMENT ON COLUMN users.email IS 'Login email address (unique per role)';
COMMENT ON COLUMN users.full_name IS 'User display name (max 10 chars enforced by backend)';
COMMENT ON COLUMN users.role IS 'User type: customer or driver';
COMMENT ON COLUMN users.coin IS 'Virtual currency balance used for trash collection services';
COMMENT ON COLUMN users.avatar_url IS 'Public URL of profile image stored in MinIO';

-- 2. Addresses table
COMMENT ON TABLE addresses IS 'Stored locations for users (used for pickup points)';
COMMENT ON COLUMN addresses.label IS 'Short name for address (e.g., Home, Office)';
COMMENT ON COLUMN addresses.lat IS 'Latitude coordinate for map location';
COMMENT ON COLUMN addresses.lng IS 'Longitude coordinate for map location';
COMMENT ON COLUMN addresses.is_default IS 'True if this is the user primary address';

-- 3. Old Item Posts table
COMMENT ON TABLE old_item_posts IS 'User requests to sell/dispose of recyclable items';
COMMENT ON COLUMN old_item_posts.images IS 'Array of photo URLs from MinIO';
COMMENT ON COLUMN old_item_posts.categories IS 'Types of items (Electronic, Plastic, Paper, Metal, Glass)';
COMMENT ON COLUMN old_item_posts.status IS 'Current state: waiting, pending, completed, cancelled';
COMMENT ON COLUMN old_item_posts.address_snapshot IS 'JSON blob of address details at the time of posting';
COMMENT ON COLUMN old_item_posts.pickup_time IS 'JSON blob containing date and time window (startTime, endTime)';

-- 4. Trash Posts table
COMMENT ON TABLE trash_posts IS 'User requests for direct trash collection service';
COMMENT ON COLUMN trash_posts.post_type IS 'Urgency level: anytime (regular) or fast (priority)';
COMMENT ON COLUMN trash_posts.coins_selected IS 'Number of coins allocated/spent for this collection';
COMMENT ON COLUMN trash_posts.trash_bag_amount IS 'Estimated quantity of trash bags to be collected';
COMMENT ON COLUMN trash_posts.address_snapshot IS 'JSON blob of the location at creation time';

-- 5. Orders table
COMMENT ON TABLE orders IS 'Assignments connecting drivers to specific item posts';
COMMENT ON COLUMN orders.post_id IS 'Reference to the original old_item_post';
COMMENT ON COLUMN orders.driver_id IS 'UUID of the driver handling this order';
COMMENT ON COLUMN orders.status IS 'Order phase: pending, arrived, picked_up, completed';

-- 6. Driver Locations table
COMMENT ON TABLE driver_locations IS 'Real-time GPS tracking for active drivers';
COMMENT ON COLUMN driver_locations.lat IS 'Current latitude for map tracking';
COMMENT ON COLUMN driver_locations.lng IS 'Current longitude for map tracking';
COMMENT ON COLUMN driver_locations.heading IS 'Direction the driver is facing (0-360 degrees)';

-- 7. Coin Transactions table
COMMENT ON TABLE coin_transactions IS 'History of virtual currency wallet activity';
COMMENT ON COLUMN coin_transactions.type IS 'buy (top-up) or use (spent on services)';
COMMENT ON COLUMN coin_transactions.amount IS 'Quantity of coins involved in the transaction';

-- 8. Contacts table
COMMENT ON TABLE contacts IS 'Connections between buyers/drivers and sellers/customers';
COMMENT ON COLUMN contacts.chat_id IS 'Reference to the associated chat interface';

-- 9. Chats table
COMMENT ON TABLE chats IS 'Message storage for communication';
COMMENT ON COLUMN chats.messages IS 'JSONB array storing chronological message objects';
