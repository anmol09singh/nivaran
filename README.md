# Nivaran - Food Donation Platform

## Project Structure

All files are now located in the root directory for simplified organization:

```
nivaran/
├── index.html           # Landing page
├── login.html           # Login page
├── signup.html          # Signup page
├── dashboard.html       # User dashboard
├── feed.html           # Posts feed
├── find.html           # Find NGOs page
├── styles.css          # All CSS styles
├── config.js           # Supabase configuration
├── auth.js             # Authentication module
├── api.js              # API/database operations
├── feed.js             # Feed and posts functionality
├── map.js              # Map and geolocation features
├── chat.js             # Chat functionality
├── light_mode.png      # Logo (light)
├── dark_mode.png       # Logo (dark)
├── schema.sql          # Database schema
├── storage-setup.sql   # Storage bucket setup
└── STORAGE_SETUP.md    # Storage setup instructions
```

## File References

All file references have been updated to use relative paths from the root directory:

### HTML Files
- **CSS**: `<link rel="stylesheet" href="styles.css">`
- **JavaScript**: `<script src="config.js"></script>`, `<script src="auth.js"></script>`, etc.
- **Images**: `<img src="light_mode.png">`, `<img src="dark_mode.png">`

### JavaScript Files
- **Internal links**: `/login.html`, `/dashboard.html`, `/feed.html`, etc.
- **Image references**: `/default-avatar.png`, `/light_mode.png`, etc.

## Quick Start

1. Open `index.html` in a web browser
2. All resources are loaded from the same directory
3. No complex folder navigation required

## Features

- **User Authentication**: Email/password and Google OAuth
- **Role-based Access**: Separate interfaces for Donors and NGOs
- **Food Posts**: Create and browse food donation posts
- **NGO Discovery**: Find nearby NGOs using interactive map
- **Real-time Chat**: Message between donors and NGOs
- **Donation History**: Track all donation activities

## Technology Stack

- **Frontend**: HTML, CSS, JavaScript
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **Maps**: Leaflet.js with OpenStreetMap
- **Real-time**: Supabase Realtime subscriptions

## Configuration

Update `config.js` with your Supabase credentials:
```javascript
const SUPABASE_CONFIG = {
    url: 'YOUR_SUPABASE_URL',
    anonKey: 'YOUR_SUPABASE_ANON_KEY'
};
```

## Database Setup

1. Create a Supabase project
2. Run `schema.sql` to create tables
3. Run `storage-setup.sql` to create storage buckets
4. Follow instructions in `STORAGE_SETUP.md`

## License

All rights reserved.
