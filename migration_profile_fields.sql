-- Migration script to add new profile fields
-- Run this if you already have the database set up

-- Add new columns to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS state TEXT,
ADD COLUMN IF NOT EXISTS profile_completed BOOLEAN DEFAULT FALSE;

-- Update existing users to mark profile as incomplete if missing required fields
UPDATE users 
SET profile_completed = FALSE 
WHERE profile_completed IS NULL 
   OR name IS NULL 
   OR phone IS NULL 
   OR city IS NULL 
   OR state IS NULL;

-- Update existing users with all required fields to mark as complete
UPDATE users 
SET profile_completed = TRUE 
WHERE name IS NOT NULL 
  AND phone IS NOT NULL 
  AND city IS NOT NULL 
  AND state IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN users.city IS 'User city for location-based features';
COMMENT ON COLUMN users.state IS 'User state for location-based features';
COMMENT ON COLUMN users.profile_completed IS 'Flag to track if user has completed initial profile setup';
