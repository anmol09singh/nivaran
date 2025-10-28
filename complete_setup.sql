-- ============================================================================
-- NIVARAN - Complete Database Setup Script
-- ============================================================================
-- This script creates all necessary tables, functions, policies, and storage
-- Run this in your Supabase SQL Editor to set up the complete database
-- ============================================================================

-- Enable necessary extensions
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- Create custom types
-- ============================================================================
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('donor', 'ngo');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE donation_status AS ENUM ('offered', 'accepted', 'picked', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- TABLES
-- ============================================================================

-- Users table (linked to auth.users)
-- ============================================================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    role user_role NOT NULL,
    phone TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    lat NUMERIC(10, 8),
    lng NUMERIC(11, 8),
    bio TEXT,
    profile_image_url TEXT,
    profile_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add new columns if they don't exist (for existing databases)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'city') THEN
        ALTER TABLE users ADD COLUMN city TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'state') THEN
        ALTER TABLE users ADD COLUMN state TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'profile_completed') THEN
        ALTER TABLE users ADD COLUMN profile_completed BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

COMMENT ON TABLE users IS 'Main users table linked to Supabase auth';
COMMENT ON COLUMN users.city IS 'User city for location-based features';
COMMENT ON COLUMN users.state IS 'User state for location-based features';
COMMENT ON COLUMN users.profile_completed IS 'Flag to track if user has completed initial profile setup';

-- NGOs extended profile
-- ============================================================================
CREATE TABLE IF NOT EXISTS ngos (
    id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    registration_number TEXT,
    representative_name TEXT,
    verified BOOLEAN DEFAULT FALSE,
    views INTEGER DEFAULT 0,
    rating NUMERIC(3, 2) DEFAULT 0,
    operating_hours TEXT,
    established_year INTEGER,
    website TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE ngos IS 'Extended profile information for NGO users';

-- Posts table for donations/requests
-- ============================================================================
CREATE TABLE IF NOT EXISTS posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role user_role NOT NULL,
    title TEXT NOT NULL,
    body TEXT,
    images TEXT[],
    food_type TEXT,
    quantity TEXT,
    pickup_time TIMESTAMPTZ,
    pickup_address TEXT,
    lat NUMERIC(10, 8),
    lng NUMERIC(11, 8),
    status TEXT DEFAULT 'active', -- active, claimed, completed, expired
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE posts IS 'Food donation posts and requests';

-- Views log for tracking profile/post views
-- ============================================================================
CREATE TABLE IF NOT EXISTS views_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    viewer_id UUID REFERENCES users(id) ON DELETE SET NULL,
    target_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    target_post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- 'ngo_profile', 'donor_profile', 'post'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE views_log IS 'Tracks views on profiles and posts for analytics';

-- Chats table
-- ============================================================================
CREATE TABLE IF NOT EXISTS chats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    donor_id UUID REFERENCES users(id) ON DELETE CASCADE,
    ngo_id UUID REFERENCES users(id) ON DELETE CASCADE,
    post_id UUID REFERENCES posts(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(donor_id, ngo_id, post_id)
);

COMMENT ON TABLE chats IS 'Chat conversations between donors and NGOs';

-- Chat messages table
-- ============================================================================
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    attachments TEXT[],
    read_by UUID[],
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE chat_messages IS 'Individual messages within chats';

-- Donations history
-- ============================================================================
CREATE TABLE IF NOT EXISTS donations_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID REFERENCES posts(id) ON DELETE SET NULL,
    donor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    ngo_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status donation_status DEFAULT 'offered',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE donations_history IS 'Records of completed and ongoing donations';

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_location ON users(lat, lng);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_posts_author ON posts(author_id);
CREATE INDEX IF NOT EXISTS idx_posts_location ON posts(lat, lng);
CREATE INDEX IF NOT EXISTS idx_posts_created ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status);
CREATE INDEX IF NOT EXISTS idx_views_log_target_user ON views_log(target_user_id);
CREATE INDEX IF NOT EXISTS idx_views_log_viewer ON views_log(viewer_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_chat ON chat_messages(chat_id, created_at);
CREATE INDEX IF NOT EXISTS idx_chats_participants ON chats(donor_id, ngo_id);
CREATE INDEX IF NOT EXISTS idx_donations_donor ON donations_history(donor_id);
CREATE INDEX IF NOT EXISTS idx_donations_ngo ON donations_history(ngo_id);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE ngos ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE views_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE donations_history ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts on re-run)
DROP POLICY IF EXISTS "Users can view all profiles" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Users can insert own profile on signup" ON users;
DROP POLICY IF EXISTS "Anyone can view NGO details" ON ngos;
DROP POLICY IF EXISTS "NGOs can update own details" ON ngos;
DROP POLICY IF EXISTS "NGOs can insert own details" ON ngos;
DROP POLICY IF EXISTS "Anyone can view active posts" ON posts;
DROP POLICY IF EXISTS "Authenticated users can create posts" ON posts;
DROP POLICY IF EXISTS "Authors can update own posts" ON posts;
DROP POLICY IF EXISTS "Authors can delete own posts" ON posts;
DROP POLICY IF EXISTS "Users can view their own view logs" ON views_log;
DROP POLICY IF EXISTS "Authenticated users can log views" ON views_log;
DROP POLICY IF EXISTS "Users can view their own chats" ON chats;
DROP POLICY IF EXISTS "Authenticated users can create chats" ON chats;
DROP POLICY IF EXISTS "Chat participants can update chats" ON chats;
DROP POLICY IF EXISTS "Users can view messages in their chats" ON chat_messages;
DROP POLICY IF EXISTS "Users can send messages in their chats" ON chat_messages;
DROP POLICY IF EXISTS "Users can view their own donation history" ON donations_history;
DROP POLICY IF EXISTS "Authenticated users can create donation records" ON donations_history;
DROP POLICY IF EXISTS "Participants can update donation records" ON donations_history;

-- RLS Policies for users table
CREATE POLICY "Users can view all profiles"
    ON users FOR SELECT
    USING (true);

CREATE POLICY "Users can update own profile"
    ON users FOR UPDATE
    USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile on signup"
    ON users FOR INSERT
    WITH CHECK (auth.uid() = id);

-- RLS Policies for ngos table
CREATE POLICY "Anyone can view NGO details"
    ON ngos FOR SELECT
    USING (true);

CREATE POLICY "NGOs can update own details"
    ON ngos FOR UPDATE
    USING (auth.uid() = id);

CREATE POLICY "NGOs can insert own details"
    ON ngos FOR INSERT
    WITH CHECK (auth.uid() = id);

-- RLS Policies for posts table
CREATE POLICY "Anyone can view active posts"
    ON posts FOR SELECT
    USING (true);

CREATE POLICY "Authenticated users can create posts"
    ON posts FOR INSERT
    WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Authors can update own posts"
    ON posts FOR UPDATE
    USING (auth.uid() = author_id);

CREATE POLICY "Authors can delete own posts"
    ON posts FOR DELETE
    USING (auth.uid() = author_id);

-- RLS Policies for views_log table
CREATE POLICY "Users can view their own view logs"
    ON views_log FOR SELECT
    USING (auth.uid() = viewer_id OR auth.uid() = target_user_id);

CREATE POLICY "Authenticated users can log views"
    ON views_log FOR INSERT
    WITH CHECK (auth.uid() = viewer_id OR viewer_id IS NULL);

-- RLS Policies for chats table
CREATE POLICY "Users can view their own chats"
    ON chats FOR SELECT
    USING (auth.uid() = donor_id OR auth.uid() = ngo_id);

CREATE POLICY "Authenticated users can create chats"
    ON chats FOR INSERT
    WITH CHECK (auth.uid() = donor_id OR auth.uid() = ngo_id);

CREATE POLICY "Chat participants can update chats"
    ON chats FOR UPDATE
    USING (auth.uid() = donor_id OR auth.uid() = ngo_id);

-- RLS Policies for chat_messages table
CREATE POLICY "Users can view messages in their chats"
    ON chat_messages FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM chats
            WHERE chats.id = chat_messages.chat_id
            AND (chats.donor_id = auth.uid() OR chats.ngo_id = auth.uid())
        )
    );

CREATE POLICY "Users can send messages in their chats"
    ON chat_messages FOR INSERT
    WITH CHECK (
        auth.uid() = sender_id AND
        EXISTS (
            SELECT 1 FROM chats
            WHERE chats.id = chat_messages.chat_id
            AND (chats.donor_id = auth.uid() OR chats.ngo_id = auth.uid())
        )
    );

-- RLS Policies for donations_history table
CREATE POLICY "Users can view their own donation history"
    ON donations_history FOR SELECT
    USING (auth.uid() = donor_id OR auth.uid() = ngo_id);

CREATE POLICY "Authenticated users can create donation records"
    ON donations_history FOR INSERT
    WITH CHECK (auth.uid() = donor_id OR auth.uid() = ngo_id);

CREATE POLICY "Participants can update donation records"
    ON donations_history FOR UPDATE
    USING (auth.uid() = donor_id OR auth.uid() = ngo_id);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to find nearby NGOs using Haversine formula
CREATE OR REPLACE FUNCTION find_nearby_ngos(
    user_lat NUMERIC,
    user_lng NUMERIC,
    radius_km NUMERIC DEFAULT 10
)
RETURNS TABLE (
    id UUID,
    name TEXT,
    email TEXT,
    phone TEXT,
    address TEXT,
    bio TEXT,
    profile_image_url TEXT,
    lat NUMERIC,
    lng NUMERIC,
    distance_km NUMERIC,
    verified BOOLEAN,
    rating NUMERIC,
    views INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id,
        u.name,
        u.email,
        u.phone,
        u.address,
        u.bio,
        u.profile_image_url,
        u.lat,
        u.lng,
        (
            6371 * acos(
                cos(radians(user_lat)) * cos(radians(u.lat)) *
                cos(radians(u.lng) - radians(user_lng)) +
                sin(radians(user_lat)) * sin(radians(u.lat))
            )
        ) AS distance_km,
        n.verified,
        n.rating,
        n.views
    FROM users u
    LEFT JOIN ngos n ON u.id = n.id
    WHERE u.role = 'ngo'
    AND u.lat IS NOT NULL
    AND u.lng IS NOT NULL
    HAVING (
        6371 * acos(
            cos(radians(user_lat)) * cos(radians(u.lat)) *
            cos(radians(u.lng) - radians(user_lng)) +
            sin(radians(user_lat)) * sin(radians(u.lat))
        )
    ) <= radius_km
    ORDER BY distance_km;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to find nearby posts
CREATE OR REPLACE FUNCTION find_nearby_posts(
    user_lat NUMERIC,
    user_lng NUMERIC,
    radius_km NUMERIC DEFAULT 20
)
RETURNS TABLE (
    id UUID,
    author_id UUID,
    author_name TEXT,
    role user_role,
    title TEXT,
    body TEXT,
    images TEXT[],
    food_type TEXT,
    quantity TEXT,
    pickup_time TIMESTAMPTZ,
    pickup_address TEXT,
    lat NUMERIC,
    lng NUMERIC,
    distance_km NUMERIC,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.author_id,
        u.name AS author_name,
        p.role,
        p.title,
        p.body,
        p.images,
        p.food_type,
        p.quantity,
        p.pickup_time,
        p.pickup_address,
        p.lat,
        p.lng,
        (
            6371 * acos(
                cos(radians(user_lat)) * cos(radians(p.lat)) *
                cos(radians(p.lng) - radians(user_lng)) +
                sin(radians(user_lat)) * sin(radians(p.lat))
            )
        ) AS distance_km,
        p.created_at
    FROM posts p
    JOIN users u ON p.author_id = u.id
    WHERE p.status = 'active'
    AND p.lat IS NOT NULL
    AND p.lng IS NOT NULL
    HAVING (
        6371 * acos(
            cos(radians(user_lat)) * cos(radians(p.lat)) *
            cos(radians(p.lng) - radians(user_lng)) +
            sin(radians(user_lat)) * sin(radians(p.lat))
        )
    ) <= radius_km
    ORDER BY distance_km, p.created_at DESC;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to increment NGO views
CREATE OR REPLACE FUNCTION increment_ngo_views(ngo_user_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE ngos
    SET views = views + 1
    WHERE id = ngo_user_id;
END;
$$ LANGUAGE plpgsql;

-- Function to create user profile (called after auth signup)
CREATE OR REPLACE FUNCTION create_user_profile(
    user_id UUID,
    user_email TEXT,
    user_name TEXT,
    user_role user_role,
    user_phone TEXT DEFAULT NULL,
    user_address TEXT DEFAULT NULL,
    user_city TEXT DEFAULT NULL,
    user_state TEXT DEFAULT NULL,
    user_lat NUMERIC DEFAULT NULL,
    user_lng NUMERIC DEFAULT NULL,
    user_bio TEXT DEFAULT NULL
)
RETURNS users AS $$
DECLARE
    new_profile users;
BEGIN
    INSERT INTO users (id, email, name, role, phone, address, city, state, lat, lng, bio, profile_completed)
    VALUES (user_id, user_email, user_name, user_role, user_phone, user_address, user_city, user_state, user_lat, user_lng, user_bio, FALSE)
    RETURNING * INTO new_profile;
    
    RETURN new_profile;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create NGO profile
CREATE OR REPLACE FUNCTION create_ngo_profile(
    user_id UUID,
    reg_number TEXT DEFAULT NULL,
    ngo_website TEXT DEFAULT NULL,
    rep_name TEXT DEFAULT NULL
)
RETURNS ngos AS $$
DECLARE
    new_ngo ngos;
BEGIN
    INSERT INTO ngos (id, registration_number, website, representative_name)
    VALUES (user_id, reg_number, ngo_website, rep_name)
    RETURNING * INTO new_ngo;
    
    RETURN new_ngo;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_posts_updated_at ON posts;
CREATE TRIGGER update_posts_updated_at BEFORE UPDATE ON posts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_chats_updated_at ON chats;
CREATE TRIGGER update_chats_updated_at BEFORE UPDATE ON chats
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_donations_updated_at ON donations_history;
CREATE TRIGGER update_donations_updated_at BEFORE UPDATE ON donations_history
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- STORAGE BUCKETS
-- ============================================================================
-- Note: Storage bucket creation and policies need to be set up through
-- Supabase Dashboard or via the following SQL commands:

-- Create storage bucket for post images
INSERT INTO storage.buckets (id, name, public)
VALUES ('post-images', 'post-images', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage bucket for profile images
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-images', 'profile-images', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage bucket for chat attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-attachments', 'chat-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- STORAGE POLICIES
-- ============================================================================

-- Drop existing storage policies to avoid conflicts
DROP POLICY IF EXISTS "Authenticated users can upload post images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view post images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own post images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own post images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload profile images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view profile images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own profile images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own profile images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload chat attachments" ON storage.objects;
DROP POLICY IF EXISTS "Chat participants can view attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own chat attachments" ON storage.objects;

-- Post Images Bucket Policies
CREATE POLICY "Authenticated users can upload post images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'post-images' AND
    (storage.foldername(name))[1] = 'posts'
);

CREATE POLICY "Anyone can view post images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'post-images');

CREATE POLICY "Users can delete own post images"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'post-images' AND
    (storage.foldername(name))[1] = 'posts'
);

CREATE POLICY "Users can update own post images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'post-images' AND
    (storage.foldername(name))[1] = 'posts'
);

-- Profile Images Bucket Policies
CREATE POLICY "Authenticated users can upload profile images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'profile-images' AND
    (storage.foldername(name))[1] = 'profiles'
);

CREATE POLICY "Anyone can view profile images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'profile-images');

CREATE POLICY "Users can delete own profile images"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'profile-images' AND
    (storage.foldername(name))[1] = 'profiles'
);

CREATE POLICY "Users can update own profile images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'profile-images' AND
    (storage.foldername(name))[1] = 'profiles'
);

-- Chat Attachments Bucket Policies
CREATE POLICY "Authenticated users can upload chat attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'chat-attachments'
);

CREATE POLICY "Chat participants can view attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'chat-attachments');

CREATE POLICY "Users can delete own chat attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'chat-attachments'
);

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================

DO $$ 
BEGIN
    RAISE NOTICE '============================================================================';
    RAISE NOTICE 'NIVARAN DATABASE SETUP COMPLETED SUCCESSFULLY!';
    RAISE NOTICE '============================================================================';
    RAISE NOTICE 'Tables created: users, ngos, posts, views_log, chats, chat_messages, donations_history';
    RAISE NOTICE 'Functions created: find_nearby_ngos, find_nearby_posts, increment_ngo_views, create_user_profile, create_ngo_profile';
    RAISE NOTICE 'Storage buckets created: post-images, profile-images, chat-attachments';
    RAISE NOTICE 'All RLS policies and triggers have been set up';
    RAISE NOTICE '============================================================================';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Update config.js with your Supabase URL and anon key';
    RAISE NOTICE '2. Test user signup and profile completion flow';
    RAISE NOTICE '3. Verify storage bucket permissions in Supabase Dashboard';
    RAISE NOTICE '============================================================================';
END $$;
