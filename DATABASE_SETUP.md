# Database Setup Instructions

## Quick Start - Single File Setup

We've consolidated all SQL files into one comprehensive setup file for easy deployment.

### **Option 1: Complete Fresh Setup (Recommended)**

Use this if you're setting up the database for the first time.

**File:** `complete_setup.sql`

**Steps:**
1. Open your Supabase project dashboard
2. Go to **SQL Editor**
3. Click **New Query**
4. Copy and paste the entire contents of `complete_setup.sql`
5. Click **Run** or press `Ctrl+Enter`
6. Wait for completion message

**This single file includes:**
- ✅ All database tables (users, ngos, posts, chats, etc.)
- ✅ All indexes for performance
- ✅ Row Level Security (RLS) policies
- ✅ Helper functions (find nearby NGOs, posts, etc.)
- ✅ Triggers for automatic timestamps
- ✅ Storage buckets (post-images, profile-images, chat-attachments)
- ✅ Storage access policies
- ✅ Profile creation functions

### **Option 2: Existing Database Migration**

If you already have a database and just need to add new profile fields:

**File:** `migration_profile_fields.sql`

This adds:
- `city` column to users table
- `state` column to users table
- `profile_completed` flag

---

## Individual SQL Files (Legacy)

If you prefer to run files separately:

1. **schema.sql** - Core database tables and functions
2. **storage-setup.sql** - Storage bucket configuration
3. **migration_profile_fields.sql** - Profile completion fields

---

## Verification Checklist

After running `complete_setup.sql`, verify:

### ✅ Tables Created
- [ ] users
- [ ] ngos
- [ ] posts
- [ ] views_log
- [ ] chats
- [ ] chat_messages
- [ ] donations_history

### ✅ Functions Created
- [ ] find_nearby_ngos
- [ ] find_nearby_posts
- [ ] increment_ngo_views
- [ ] create_user_profile
- [ ] create_ngo_profile

### ✅ Storage Buckets
- [ ] post-images (public)
- [ ] profile-images (public)
- [ ] chat-attachments (private)

### ✅ Key Features
- [ ] Row Level Security enabled on all tables
- [ ] Triggers for automatic timestamp updates
- [ ] Indexes for performance optimization

---

## Troubleshooting

### "relation already exists"
The script uses `CREATE TABLE IF NOT EXISTS` and `ON CONFLICT DO NOTHING` to handle existing objects safely. You can run it multiple times.

### Storage policies error
If storage policies fail, you may need to:
1. Go to **Storage** in Supabase Dashboard
2. Manually create buckets: `post-images`, `profile-images`, `chat-attachments`
3. Re-run the storage policy sections

### Permission denied
Make sure you're running the script as a database superuser through Supabase SQL Editor.

---

## Next Steps

After database setup:

1. **Update Application Config**
   - Edit `config.js`
   - Add your Supabase URL and anon key

2. **Test Authentication**
   - Sign up a new user
   - Complete profile form should appear
   - Verify data in Supabase Table Editor

3. **Test Storage**
   - Upload a profile picture
   - Upload post images
   - Check Storage dashboard

4. **Test Features**
   - Create a food post
   - Search for nearby NGOs
   - Send chat messages

---

## Database Schema Overview

```
users (Main user profiles)
├── id (UUID, links to auth.users)
├── email, name, role (donor/ngo)
├── phone, address, city, state
├── lat, lng (for location features)
├── bio, profile_image_url
└── profile_completed (boolean)

ngos (Extended NGO info)
├── id (references users.id)
├── registration_number, representative_name
├── verified, views, rating
└── operating_hours, established_year, website

posts (Food donations/requests)
├── id, author_id, role
├── title, body, images[]
├── food_type, quantity
├── pickup_time, pickup_address
├── lat, lng
└── status (active/claimed/completed/expired)

chats (Conversations)
├── id
├── donor_id, ngo_id
└── post_id (optional)

chat_messages (Individual messages)
├── id, chat_id, sender_id
├── text, attachments[]
└── read_by[]

donations_history (Donation tracking)
├── id, post_id
├── donor_id, ngo_id
├── status (offered/accepted/picked/cancelled)
└── notes

views_log (Analytics)
├── id, viewer_id
├── target_user_id, target_post_id
└── type (ngo_profile/donor_profile/post)
```

---

## Support

For issues or questions:
- Check Supabase logs in Dashboard > Logs
- Review RLS policies if access denied errors occur
- Verify storage bucket settings in Dashboard > Storage

---

**Last Updated:** October 28, 2025
