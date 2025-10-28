# Supabase Storage Setup for Post Images

## Steps to Enable Image Uploads

### 1. Create Storage Bucket in Supabase Dashboard

1. Go to your Supabase project: https://lllkajthdvqzgbbbpcpa.supabase.co
2. Navigate to **Storage** in the left sidebar
3. Click **New bucket**
4. Enter bucket name: `post-images`
5. Make it **Public** (check the public checkbox)
6. Click **Create bucket**

### 2. Set Up Storage Policies

You can either:

**Option A: Use the SQL Editor**
1. Go to **SQL Editor** in Supabase dashboard
2. Run the contents of `storage-setup.sql` file

**Option B: Manual Policy Setup**
1. Go to **Storage** → **Policies** tab
2. Add the following policies for `post-images` bucket:

   - **Upload Policy**: Allow authenticated users to upload to their folder
     ```sql
     CREATE POLICY "Authenticated users can upload images"
     ON storage.objects FOR INSERT
     TO authenticated
     WITH CHECK (
         bucket_id = 'post-images' AND
         (storage.foldername(name))[1] = 'posts' AND
         (storage.foldername(name))[2] = auth.uid()::text
     );
     ```

   - **View Policy**: Allow public access to view images
     ```sql
     CREATE POLICY "Anyone can view images"
     ON storage.objects FOR SELECT
     TO public
     USING (bucket_id = 'post-images');
     ```

   - **Delete Policy**: Allow users to delete their own images
     ```sql
     CREATE POLICY "Users can delete own images"
     ON storage.objects FOR DELETE
     TO authenticated
     USING (
         bucket_id = 'post-images' AND
         (storage.foldername(name))[2] = auth.uid()::text
     );
     ```

### 3. Verify Setup

After setup, the folder structure will be:
```
post-images/
  └── posts/
      └── {user_id}/
          └── {random_name}_{timestamp}.{ext}
```

### 4. Test Upload

1. Log in to your Nivaran application
2. Go to Feed page
3. Click the image icon (🖼️) when creating a post
4. Select 1-4 images (max 5MB each)
5. Create the post
6. Images should appear in the post

## Features

- **Multiple Images**: Upload 1-4 images per post
- **Image Preview**: See thumbnails before posting
- **Carousel View**: Click any image to view full-size with navigation
- **Responsive Grid**: Smart layout for single, double, or multiple images
- **Size Limit**: 5MB per image
- **Formats**: Accepts all common image formats (jpg, png, gif, webp, etc.)

## Troubleshooting

If images don't upload:
1. Check browser console for errors
2. Verify the bucket is public in Supabase
3. Ensure storage policies are correctly set
4. Check that user is authenticated
5. Verify image file size is under 5MB
