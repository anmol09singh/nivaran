// Supabase Configuration
// Replace these with your actual Supabase project credentials
const SUPABASE_CONFIG = {
    url: 'https://lllkajthdvqzgbbbpcpa.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxsbGthanRoZHZxemdiYmJwY3BhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1NzI3MTksImV4cCI6MjA3NzE0ODcxOX0.moUh1e7Ei-EUKsvfSTKSSLV1OFP108Y9SPP__2kbWYs'
};

// App Configuration
const APP_CONFIG = {
    appName: 'Nivaran',
    appTagline: 'Connecting Hearts, Feeding Souls',
    defaultRadius: 10, // Default search radius in kilometers
    maxRadius: 50, // Maximum search radius
    postsPerPage: 20,
    mapDefaultZoom: 13,
    mapDefaultCenter: { lat: 20.5937, lng: 78.9629 }, // India center
    dateFormat: 'en-IN',
    maxImageSize: 5 * 1024 * 1024, // 5MB
    allowedImageTypes: ['image/jpeg', 'image/png', 'image/webp'],
    maxImagesPerPost: 5,
    maxUploadSize: 5 * 1024 * 1024, // 5MB
    supportedImageTypes: ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'],
    nearbyRadius: 50 // km
};

// Storage bucket names
const STORAGE_BUCKETS = {
    postImages: 'post-images',
    profileImages: 'profile-images',
    chatAttachments: 'chat-attachments'
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SUPABASE_CONFIG, APP_CONFIG, STORAGE_BUCKETS };
}
