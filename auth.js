// Authentication module
// Handles user authentication, session management, and role-based redirects

class Auth {
    constructor() {
        if (!window.supabase) {
            console.error('Supabase client not initialized');
            return;
        }
        this.client = window.supabase;
        this.currentUser = null;
        this.currentProfile = null;
        
        // Initialize auth state listener
        this.initAuthListener();
    }

    // Initialize authentication state listener
    initAuthListener() {
        this.client.auth.onAuthStateChange(async (event, session) => {
            console.log('Auth event:', event);
            
            if (event === 'SIGNED_IN' && session) {
                this.currentUser = session.user;
                await this.loadUserProfile();
            } else if (event === 'SIGNED_OUT') {
                this.currentUser = null;
                this.currentProfile = null;
            }
        });
    }

    // Get current session
    async getSession() {
        try {
            const { data: { session }, error } = await this.client.auth.getSession();
            
            if (error) throw error;
            
            if (session) {
                this.currentUser = session.user;
                await this.loadUserProfile();
            }
            
            return session;
        } catch (error) {
            console.error('Error getting session:', error);
            return null;
        }
    }

    // Load user profile from database
    async loadUserProfile() {
        if (!this.currentUser) {
            console.log('No current user to load profile for');
            return null;
        }

        try {
            console.log('Loading profile for user:', this.currentUser.id);
            const { data, error } = await this.client
                .from('users')
                .select('*')
                .eq('id', this.currentUser.id)
                .single();
            
            if (error) {
                console.error('Profile query error:', error);
                
                // If profile doesn't exist (PGRST116 error), redirect to complete profile
                if (error.code === 'PGRST116') {
                    console.log('Profile not found, user needs to complete profile');
                    this.currentProfile = null;
                    return null;
                }
                
                throw error;
            }
            
            console.log('Profile data retrieved:', data);
            this.currentProfile = data;
            return data;
        } catch (error) {
            console.error('Error loading profile:', error);
            this.currentProfile = null;
            return null;
        }
    }

    // Sign up with email and password
    async signUp(email, password, userData) {
        try {
            // Create auth user with email confirmation
            const { data: authData, error: authError } = await this.client.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        name: userData.name,
                        role: userData.role
                    },
                    emailRedirectTo: `${window.location.origin}/login.html`
                }
            });
            
            if (authError) throw authError;
            
            if (!authData.user) {
                throw new Error('User creation failed');
            }

            console.log('Auth user created:', authData.user.id);

            // Create profile immediately (even if email confirmation is pending)
            // Use RPC function to create profile (bypasses RLS)
            const { data: profileData, error: profileError } = await this.client
                .rpc('create_user_profile', {
                    user_id: authData.user.id,
                    user_email: email,
                    user_name: userData.name,
                    user_role: userData.role,
                    user_phone: userData.phone || null,
                    user_address: userData.address || null,
                    user_city: userData.city || null,
                    user_state: userData.state || null,
                    user_lat: userData.lat || null,
                    user_lng: userData.lng || null,
                    user_bio: userData.bio || null
                });
            
            if (profileError) {
                console.error('Profile creation error details:', profileError);
                // Don't throw error, profile can be created later
                console.warn('Profile creation failed, will be created on first login');
            } else {
                console.log('Profile created:', profileData);
            }

            // If NGO, create NGO extended profile using RPC
            if (userData.role === 'ngo' && userData.ngoData) {
                const { error: ngoError } = await this.client
                    .rpc('create_ngo_profile', {
                        user_id: authData.user.id,
                        reg_number: userData.ngoData.registration_number || null,
                        ngo_website: userData.ngoData.website || null,
                        rep_name: userData.ngoData.representative_name || null
                    });
                
                if (ngoError) {
                    console.error('NGO profile creation error:', ngoError);
                    // Don't throw here, user profile is created
                }
            }

            // Check if email confirmation is required
            const requiresEmailConfirmation = authData.session === null || 
                                            (authData.user.identities && authData.user.identities.length === 0);

            this.currentUser = authData.user;
            this.currentProfile = profileData;

            return {
                user: authData.user,
                profile: profileData,
                requiresEmailConfirmation: requiresEmailConfirmation
            };
        } catch (error) {
            console.error('Sign up error:', error);
            throw error;
        }
    }

    // Sign in with email and password
    async signIn(email, password) {
        try {
            console.log('Signing in user...');
            const { data, error } = await this.client.auth.signInWithPassword({
                email,
                password
            });
            
            if (error) {
                console.error('Auth sign in error:', error);
                // Check if it's an email confirmation error
                if (error.message.includes('Email not confirmed')) {
                    throw new Error('Email not confirmed. Please check your email to confirm your account.');
                }
                throw error;
            }
            
            console.log('Auth successful, loading profile...');
            this.currentUser = data.user;
            
            try {
                await this.loadUserProfile();
                console.log('Profile loaded:', this.currentProfile);
            } catch (profileError) {
                console.error('Profile loading error:', profileError);
                // Don't throw error if profile doesn't exist yet
                // User can complete profile later
                this.currentProfile = null;
            }
            
            return {
                user: data.user,
                profile: this.currentProfile
            };
        } catch (error) {
            console.error('Sign in error:', error);
            throw error;
        }
    }

    // Sign in with Google OAuth
    async signInWithGoogle() {
        try {
            const { data, error } = await this.client.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: `${window.location.origin}/dashboard.html`
                }
            });
            
            if (error) throw error;
            
            return data;
        } catch (error) {
            console.error('Google sign in error:', error);
            throw error;
        }
    }

    // Sign out
    async signOut() {
        try {
            const { error } = await this.client.auth.signOut();
            
            if (error) throw error;
            
            this.currentUser = null;
            this.currentProfile = null;
            
            // Redirect to login
            window.location.href = '/login.html';
        } catch (error) {
            console.error('Sign out error:', error);
            throw error;
        }
    }

    // Check if user is authenticated
    isAuthenticated() {
        return !!this.currentUser;
    }

    // Get current user
    getCurrentUser() {
        return this.currentUser;
    }

    // Get current profile
    getCurrentProfile() {
        return this.currentProfile;
    }

    // Get user role
    getUserRole() {
        return this.currentProfile?.role;
    }

    // Check if user is donor
    isDonor() {
        return this.currentProfile?.role === 'donor';
    }

    // Check if user is NGO
    isNGO() {
        return this.currentProfile?.role === 'ngo';
    }

    // Update password
    async updatePassword(newPassword) {
        try {
            const { data, error } = await this.client.auth.updateUser({
                password: newPassword
            });
            
            if (error) throw error;
            
            return data;
        } catch (error) {
            console.error('Password update error:', error);
            throw error;
        }
    }

    // Send password reset email
    async resetPassword(email) {
        try {
            const { data, error } = await this.client.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/reset-password.html`
            });
            
            if (error) throw error;
            
            return data;
        } catch (error) {
            console.error('Password reset error:', error);
            throw error;
        }
    }

    // Check if profile is complete
    isProfileComplete() {
        if (!this.currentProfile) {
            console.log('No profile to check');
            return false;
        }
        
        // If profile_completed flag exists, use it
        if (typeof this.currentProfile.profile_completed === 'boolean') {
            return this.currentProfile.profile_completed;
        }
        
        // Otherwise, check required fields
        const requiredFields = ['name', 'phone'];
        
        for (const field of requiredFields) {
            if (!this.currentProfile[field] || this.currentProfile[field].trim() === '') {
                console.log(`Missing required field: ${field}`);
                return false;
            }
        }
        
        // Check optional location fields - if any is missing, profile is incomplete
        if (!this.currentProfile.city || !this.currentProfile.state) {
            console.log('Missing city or state');
            return false;
        }
        
        return true;
    }

    // Redirect based on role
    redirectToDashboard() {
        console.log('redirectToDashboard called', {
            hasProfile: !!this.currentProfile,
            hasUser: !!this.currentUser,
            userEmail: this.currentUser?.email
        });

        if (!this.currentProfile) {
            console.log('No profile found, redirecting to profile completion');
            // Check if user is authenticated but profile doesn't exist
            if (this.currentUser) {
                // User exists but profile doesn't - redirect to complete profile
                console.log('User authenticated but no profile in database, going to complete-profile');
                window.location.href = '/complete-profile.html';
            } else {
                console.log('No user, going to login');
                window.location.href = '/login.html';
            }
            return;
        }

        // Check if profile needs to be completed
        const isComplete = this.isProfileComplete();
        console.log('Profile complete status:', isComplete, 'Profile data:', this.currentProfile);
        
        if (!isComplete) {
            console.log('Profile incomplete, redirecting to complete profile');
            window.location.href = '/complete-profile.html';
            return;
        }

        const role = this.currentProfile.role;
        console.log('Redirecting to dashboard for role:', role);
        window.location.href = `/dashboard.html?role=${role}`;
    }

    // Require authentication - call this on protected pages
    async requireAuth() {
        const session = await this.getSession();
        
        if (!session) {
            // Save the intended destination
            sessionStorage.setItem('redirectAfterLogin', window.location.pathname);
            window.location.href = '/login.html';
            return false;
        }
        
        return true;
    }

    // Redirect to saved destination after login
    redirectAfterLogin() {
        const savedPath = sessionStorage.getItem('redirectAfterLogin');
        
        if (savedPath) {
            sessionStorage.removeItem('redirectAfterLogin');
            window.location.href = savedPath;
        } else {
            this.redirectToDashboard();
        }
    }

    // Handle OAuth callback
    async handleOAuthCallback() {
        try {
            // Get the hash parameters
            const hashParams = new URLSearchParams(window.location.hash.substring(1));
            const accessToken = hashParams.get('access_token');
            
            if (!accessToken) {
                return false;
            }

            // Get session
            const session = await this.getSession();
            
            if (session && session.user) {
                // Check if user profile exists
                const { data: existingProfile } = await this.client
                    .from('users')
                    .select('*')
                    .eq('id', session.user.id)
                    .single();

                if (!existingProfile) {
                    // Redirect to profile completion page
                    window.location.href = '/complete-profile.html';
                    return true;
                }

                // Profile exists, redirect to dashboard
                this.redirectToDashboard();
                return true;
            }
            
            return false;
        } catch (error) {
            console.error('OAuth callback error:', error);
            return false;
        }
    }
}

// Export Auth instance
const auth = new Auth();
