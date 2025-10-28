// API Client - Supabase wrapper functions
// Handles all database operations and API calls

class API {
    constructor() {
        if (!window.supabase) {
            console.error('Supabase client not initialized');
            return;
        }
        this.client = window.supabase;
    }

    // User operations
    async getUser(userId) {
        try {
            const { data, error } = await this.client
                .from('users')
                .select('*')
                .eq('id', userId)
                .single();
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error fetching user:', error);
            throw error;
        }
    }

    async updateUserProfile(userId, updates) {
        try {
            const { data, error } = await this.client
                .from('users')
                .update(updates)
                .eq('id', userId)
                .select()
                .single();
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error updating profile:', error);
            throw error;
        }
    }

    async createUserProfile(profile) {
        try {
            const { data, error } = await this.client
                .from('users')
                .insert([profile])
                .select()
                .single();
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error creating profile:', error);
            throw error;
        }
    }

    // NGO operations
    async getNGO(ngoId) {
        try {
            const { data, error } = await this.client
                .from('ngos')
                .select(`
                    *,
                    users (
                        id, name, email, phone, address, lat, lng, bio, profile_image_url, created_at
                    )
                `)
                .eq('id', ngoId)
                .single();
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error fetching NGO:', error);
            throw error;
        }
    }

    async createNGOProfile(ngoData) {
        try {
            const { data, error } = await this.client
                .from('ngos')
                .insert([ngoData])
                .select()
                .single();
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error creating NGO profile:', error);
            throw error;
        }
    }

    async updateNGOProfile(ngoId, updates) {
        try {
            const { data, error } = await this.client
                .from('ngos')
                .update(updates)
                .eq('id', ngoId)
                .select()
                .single();
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error updating NGO profile:', error);
            throw error;
        }
    }

    async incrementNGOViews(ngoId) {
        try {
            const { error } = await this.client.rpc('increment_ngo_views', {
                ngo_user_id: ngoId
            });
            
            if (error) throw error;
        } catch (error) {
            console.error('Error incrementing views:', error);
        }
    }

    // Find nearby NGOs using Haversine function
    async findNearbyNGOs(lat, lng, radiusKm = 10) {
        try {
            const { data, error } = await this.client.rpc('find_nearby_ngos', {
                user_lat: lat,
                user_lng: lng,
                radius_km: radiusKm
            });
            
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error finding nearby NGOs:', error);
            throw error;
        }
    }

    // Posts operations
    async createPost(post) {
        try {
            const { data, error } = await this.client
                .from('posts')
                .insert([post])
                .select()
                .single();
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error creating post:', error);
            throw error;
        }
    }

    async getPosts(filters = {}) {
        try {
            let query = this.client
                .from('posts')
                .select(`
                    *,
                    users!posts_author_id_fkey (
                        id, name, role, profile_image_url
                    )
                `)
                .eq('status', 'active')
                .order('created_at', { ascending: false });

            if (filters.authorId) {
                query = query.eq('author_id', filters.authorId);
            }

            if (filters.role) {
                query = query.eq('role', filters.role);
            }

            if (filters.foodType) {
                query = query.ilike('food_type', `%${filters.foodType}%`);
            }

            if (filters.limit) {
                query = query.limit(filters.limit);
            }

            const { data, error } = await query;
            
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error fetching posts:', error);
            throw error;
        }
    }

    async getPost(postId) {
        try {
            const { data, error } = await this.client
                .from('posts')
                .select(`
                    *,
                    users!posts_author_id_fkey (
                        id, name, role, phone, email, address, profile_image_url
                    )
                `)
                .eq('id', postId)
                .single();
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error fetching post:', error);
            throw error;
        }
    }

    async updatePost(postId, updates) {
        try {
            const { data, error } = await this.client
                .from('posts')
                .update(updates)
                .eq('id', postId)
                .select()
                .single();
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error updating post:', error);
            throw error;
        }
    }

    async deletePost(postId) {
        try {
            const { error } = await this.client
                .from('posts')
                .delete()
                .eq('id', postId);
            
            if (error) throw error;
        } catch (error) {
            console.error('Error deleting post:', error);
            throw error;
        }
    }

    async findNearbyPosts(lat, lng, radiusKm = 20) {
        try {
            const { data, error } = await this.client.rpc('find_nearby_posts', {
                user_lat: lat,
                user_lng: lng,
                radius_km: radiusKm
            });
            
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error finding nearby posts:', error);
            throw error;
        }
    }

    // Views log operations
    async logView(viewData) {
        try {
            const { data, error } = await this.client
                .from('views_log')
                .insert([viewData])
                .select()
                .single();
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error logging view:', error);
        }
    }

    async getRecentlyViewedNGOs(viewerId, limit = 10) {
        try {
            const { data, error } = await this.client
                .from('views_log')
                .select(`
                    created_at,
                    users!views_log_target_user_id_fkey (
                        id, name, email, phone, address, lat, lng, bio, profile_image_url
                    )
                `)
                .eq('viewer_id', viewerId)
                .eq('type', 'ngo_profile')
                .order('created_at', { ascending: false })
                .limit(limit);
            
            if (error) throw error;
            
            // Remove duplicates, keeping most recent
            const uniqueNGOs = [];
            const seenIds = new Set();
            
            data?.forEach(view => {
                if (view.users && !seenIds.has(view.users.id)) {
                    seenIds.add(view.users.id);
                    uniqueNGOs.push({
                        ...view.users,
                        last_viewed: view.created_at
                    });
                }
            });
            
            return uniqueNGOs;
        } catch (error) {
            console.error('Error fetching recently viewed NGOs:', error);
            return [];
        }
    }

    async getNGOViewStats(ngoId) {
        try {
            const { count, error } = await this.client
                .from('views_log')
                .select('*', { count: 'exact', head: true })
                .eq('target_user_id', ngoId)
                .eq('type', 'ngo_profile');
            
            if (error) throw error;
            return count || 0;
        } catch (error) {
            console.error('Error fetching view stats:', error);
            return 0;
        }
    }

    // Chat operations
    async getOrCreateChat(donorId, ngoId, postId = null) {
        try {
            // First, try to find existing chat
            let query = this.client
                .from('chats')
                .select('*')
                .eq('donor_id', donorId)
                .eq('ngo_id', ngoId);

            if (postId) {
                query = query.eq('post_id', postId);
            }

            const { data: existingChat, error: fetchError } = await query.single();
            
            if (existingChat) {
                return existingChat;
            }

            // Create new chat if not found
            const { data: newChat, error: createError } = await this.client
                .from('chats')
                .insert([{
                    donor_id: donorId,
                    ngo_id: ngoId,
                    post_id: postId
                }])
                .select()
                .single();
            
            if (createError) throw createError;
            return newChat;
        } catch (error) {
            console.error('Error getting/creating chat:', error);
            throw error;
        }
    }

    async getUserChats(userId) {
        try {
            const { data, error } = await this.client
                .from('chats')
                .select(`
                    *,
                    donor:users!chats_donor_id_fkey(id, name, profile_image_url),
                    ngo:users!chats_ngo_id_fkey(id, name, profile_image_url),
                    posts(id, title)
                `)
                .or(`donor_id.eq.${userId},ngo_id.eq.${userId}`)
                .order('updated_at', { ascending: false });
            
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error fetching chats:', error);
            return [];
        }
    }

    async getChatMessages(chatId) {
        try {
            const { data, error } = await this.client
                .from('chat_messages')
                .select(`
                    *,
                    sender:users!chat_messages_sender_id_fkey(id, name, profile_image_url)
                `)
                .eq('chat_id', chatId)
                .order('created_at', { ascending: true });
            
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error fetching messages:', error);
            return [];
        }
    }

    async sendMessage(message) {
        try {
            const { data, error } = await this.client
                .from('chat_messages')
                .insert([message])
                .select()
                .single();
            
            if (error) throw error;

            // Update chat's updated_at
            await this.client
                .from('chats')
                .update({ updated_at: new Date().toISOString() })
                .eq('id', message.chat_id);
            
            return data;
        } catch (error) {
            console.error('Error sending message:', error);
            throw error;
        }
    }

    subscribeToChat(chatId, callback) {
        const subscription = this.client
            .channel(`chat:${chatId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'chat_messages',
                    filter: `chat_id=eq.${chatId}`
                },
                (payload) => {
                    callback(payload.new);
                }
            )
            .subscribe();

        return subscription;
    }

    // Donations history operations
    async createDonationRecord(donation) {
        try {
            const { data, error } = await this.client
                .from('donations_history')
                .insert([donation])
                .select()
                .single();
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error creating donation record:', error);
            throw error;
        }
    }

    async getDonationHistory(userId, role) {
        try {
            const column = role === 'donor' ? 'donor_id' : 'ngo_id';
            
            const { data, error } = await this.client
                .from('donations_history')
                .select(`
                    *,
                    donor:users!donations_history_donor_id_fkey(id, name, profile_image_url),
                    ngo:users!donations_history_ngo_id_fkey(id, name, profile_image_url),
                    posts(id, title, food_type, quantity)
                `)
                .eq(column, userId)
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error fetching donation history:', error);
            return [];
        }
    }

    async updateDonationStatus(donationId, status, notes = null) {
        try {
            const updates = { status };
            if (notes) updates.notes = notes;

            const { data, error } = await this.client
                .from('donations_history')
                .update(updates)
                .eq('id', donationId)
                .select()
                .single();
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error updating donation status:', error);
            throw error;
        }
    }

    // Storage operations
    async uploadImage(bucket, path, file) {
        try {
            const { data, error } = await this.client.storage
                .from(bucket)
                .upload(path, file, {
                    cacheControl: '3600',
                    upsert: false
                });
            
            if (error) throw error;

            const { data: urlData } = this.client.storage
                .from(bucket)
                .getPublicUrl(data.path);
            
            return urlData.publicUrl;
        } catch (error) {
            console.error('Error uploading image:', error);
            throw error;
        }
    }

    async deleteImage(bucket, path) {
        try {
            const { error } = await this.client.storage
                .from(bucket)
                .remove([path]);
            
            if (error) throw error;
        } catch (error) {
            console.error('Error deleting image:', error);
            throw error;
        }
    }
}

// Export API instance
const api = new API();
