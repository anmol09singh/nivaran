// Posts and Feed functionality

class FeedManager {
    constructor() {
        this.posts = [];
        this.currentPage = 1;
        this.postsPerPage = APP_CONFIG.postsPerPage;
        this.filters = {
            role: null,
            foodType: null,
            authorId: null
        };
    }

    // Load posts from database
    async loadPosts(filters = {}) {
        try {
            this.filters = { ...this.filters, ...filters };
            this.posts = await api.getPosts(this.filters);
            return this.posts;
        } catch (error) {
            console.error('Error loading posts:', error);
            throw error;
        }
    }

    // Load nearby posts
    async loadNearbyPosts(lat, lng, radiusKm = 20) {
        try {
            this.posts = await api.findNearbyPosts(lat, lng, radiusKm);
            return this.posts;
        } catch (error) {
            console.error('Error loading nearby posts:', error);
            throw error;
        }
    }

    // Render posts to container
    renderPosts(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = '';

        if (this.posts.length === 0) {
            container.innerHTML = '<div class="no-posts">No posts found</div>';
            return;
        }

        this.posts.forEach(post => {
            const postElement = this.createPostElement(post);
            container.appendChild(postElement);
        });
    }

    // Create post HTML element
    createPostElement(post) {
        const div = document.createElement('div');
        div.className = 'post-card';
        div.dataset.postId = post.id;

        const author = post.users || {};
        const image = post.images && post.images.length > 0 ? post.images[0] : '';
        const pickupTime = post.pickup_time ? new Date(post.pickup_time).toLocaleString() : 'Not specified';
        const timeAgo = this.getTimeAgo(post.created_at);
        const distance = post.distance_km ? `${post.distance_km.toFixed(2)} km away` : '';

        div.innerHTML = `
            <div class="post-header">
                <div class="post-author">
                    <img src="${author.profile_image_url || '/default-avatar.png'}" 
                         alt="${author.name}" 
                         class="author-avatar">
                    <div class="author-info">
                        <h4>${author.name}</h4>
                        <span class="post-role ${post.role}">${post.role === 'donor' ? '🎁 Donor' : '🏢 NGO'}</span>
                        <span class="post-time">${timeAgo}</span>
                    </div>
                </div>
                ${auth.getCurrentProfile()?.id === post.author_id ? `
                    <div class="post-menu">
                        <button class="btn-icon" onclick="togglePostMenu('${post.id}')">⋮</button>
                        <div class="post-menu-dropdown" id="menu-${post.id}">
                            <button onclick="editPost('${post.id}')">Edit</button>
                            <button onclick="deletePost('${post.id}')" class="danger">Delete</button>
                        </div>
                    </div>
                ` : ''}
            </div>
            
            <div class="post-content">
                <h3>${post.title}</h3>
                ${post.body ? `<p>${post.body}</p>` : ''}
                
                ${image ? `
                    <div class="post-images">
                        <img src="${image}" alt="${post.title}" onclick="openImageModal('${image}')">
                        ${post.images.length > 1 ? `<span class="image-count">+${post.images.length - 1}</span>` : ''}
                    </div>
                ` : ''}
                
                <div class="post-details">
                    ${post.food_type ? `<span class="detail">🍽️ ${post.food_type}</span>` : ''}
                    ${post.quantity ? `<span class="detail">📦 ${post.quantity}</span>` : ''}
                    ${distance ? `<span class="detail">📍 ${distance}</span>` : ''}
                    <span class="detail">⏰ ${pickupTime}</span>
                </div>
                
                ${post.pickup_address ? `<div class="post-location">📍 ${post.pickup_address}</div>` : ''}
            </div>
            
            <div class="post-actions">
                ${auth.isAuthenticated() && auth.getCurrentProfile()?.id !== post.author_id ? `
                    <button class="btn btn-primary" onclick="contactForPost('${post.id}', '${post.author_id}')">
                        ${post.role === 'donor' ? 'Request Pickup' : 'Contact NGO'}
                    </button>
                ` : ''}
                <button class="btn btn-secondary" onclick="viewPostDetails('${post.id}')">View Details</button>
                ${post.lat && post.lng ? `
                    <button class="btn btn-secondary" onclick="viewOnMap(${post.lat}, ${post.lng})">
                        📍 View on Map
                    </button>
                ` : ''}
            </div>
        `;

        return div;
    }

    // Get time ago string
    getTimeAgo(timestamp) {
        const now = new Date();
        const postTime = new Date(timestamp);
        const diffMs = now - postTime;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        
        return postTime.toLocaleDateString();
    }

    // Filter posts
    filterPosts(filters) {
        this.filters = { ...this.filters, ...filters };
        
        let filteredPosts = [...this.posts];

        if (filters.role) {
            filteredPosts = filteredPosts.filter(p => p.role === filters.role);
        }

        if (filters.foodType) {
            filteredPosts = filteredPosts.filter(p => 
                p.food_type && p.food_type.toLowerCase().includes(filters.foodType.toLowerCase())
            );
        }

        return filteredPosts;
    }
}

// Post creation and editing
class PostEditor {
    constructor() {
        this.images = [];
        this.maxImages = APP_CONFIG.maxImagesPerPost;
        this.editingPostId = null;
    }

    // Initialize post editor
    initEditor(formId) {
        const form = document.getElementById(formId);
        if (!form) return;

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.submitPost(form);
        });

        // Image upload handling
        const imageInput = form.querySelector('input[type="file"]');
        if (imageInput) {
            imageInput.addEventListener('change', (e) => {
                this.handleImageSelect(e.target.files);
            });
        }

        // Location autocomplete
        const addressInput = form.querySelector('input[name="pickup_address"]');
        if (addressInput) {
            this.initAddressAutocomplete(addressInput);
        }
    }

    // Handle image selection
    async handleImageSelect(files) {
        if (this.images.length + files.length > this.maxImages) {
            alert(`Maximum ${this.maxImages} images allowed`);
            return;
        }

        for (const file of files) {
            // Validate file
            if (!APP_CONFIG.allowedImageTypes.includes(file.type)) {
                alert('Invalid file type. Only JPEG, PNG, and WebP allowed');
                continue;
            }

            if (file.size > APP_CONFIG.maxImageSize) {
                alert('File too large. Maximum 5MB per image');
                continue;
            }

            this.images.push(file);
        }

        this.renderImagePreviews();
    }

    // Render image previews
    renderImagePreviews() {
        const container = document.getElementById('image-previews');
        if (!container) return;

        container.innerHTML = '';

        this.images.forEach((image, index) => {
            const preview = document.createElement('div');
            preview.className = 'image-preview';

            const reader = new FileReader();
            reader.onload = (e) => {
                preview.innerHTML = `
                    <img src="${e.target.result}" alt="Preview">
                    <button type="button" class="remove-image" onclick="postEditor.removeImage(${index})">×</button>
                `;
            };
            reader.readAsDataURL(image);

            container.appendChild(preview);
        });
    }

    // Remove image
    removeImage(index) {
        this.images.splice(index, 1);
        this.renderImagePreviews();
    }

    // Upload images to storage
    async uploadImages(userId) {
        const uploadedUrls = [];

        for (const [index, file] of this.images.entries()) {
            try {
                const timestamp = Date.now();
                const fileName = `${userId}/${timestamp}-${index}-${file.name}`;
                const url = await api.uploadImage(STORAGE_BUCKETS.postImages, fileName, file);
                uploadedUrls.push(url);
            } catch (error) {
                console.error('Error uploading image:', error);
            }
        }

        return uploadedUrls;
    }

    // Submit post
    async submitPost(form) {
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        
        try {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Posting...';

            const formData = new FormData(form);
            const user = auth.getCurrentProfile();

            if (!user) {
                throw new Error('User not authenticated');
            }

            // Upload images
            const imageUrls = await this.uploadImages(user.id);

            // Get coordinates if address provided
            let lat = null, lng = null;
            const address = formData.get('pickup_address');
            
            if (address) {
                const geocoded = await geocodeAddress(address);
                if (geocoded) {
                    lat = geocoded.lat;
                    lng = geocoded.lng;
                }
            }

            // Create post object
            const post = {
                author_id: user.id,
                role: user.role,
                title: formData.get('title'),
                body: formData.get('body'),
                food_type: formData.get('food_type'),
                quantity: formData.get('quantity'),
                pickup_time: formData.get('pickup_time') || null,
                pickup_address: address,
                lat: lat,
                lng: lng,
                images: imageUrls,
                status: 'active'
            };

            // Create or update post
            let result;
            if (this.editingPostId) {
                result = await api.updatePost(this.editingPostId, post);
            } else {
                result = await api.createPost(post);
            }

            // Success
            alert('Post created successfully!');
            form.reset();
            this.images = [];
            this.renderImagePreviews();
            this.editingPostId = null;

            // Redirect or reload
            if (window.location.pathname.includes('feed.html')) {
                location.reload();
            } else {
                window.location.href = '/feed.html';
            }
        } catch (error) {
            console.error('Error submitting post:', error);
            alert('Failed to create post. Please try again.');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
    }

    // Load post for editing
    async loadPost(postId) {
        try {
            const post = await api.getPost(postId);
            
            // Verify ownership
            if (post.author_id !== auth.getCurrentProfile()?.id) {
                throw new Error('Unauthorized');
            }

            this.editingPostId = postId;

            // Fill form
            document.querySelector('input[name="title"]').value = post.title;
            document.querySelector('textarea[name="body"]').value = post.body || '';
            document.querySelector('input[name="food_type"]').value = post.food_type || '';
            document.querySelector('input[name="quantity"]').value = post.quantity || '';
            document.querySelector('input[name="pickup_time"]').value = post.pickup_time || '';
            document.querySelector('input[name="pickup_address"]').value = post.pickup_address || '';

            // TODO: Load existing images
        } catch (error) {
            console.error('Error loading post:', error);
            alert('Failed to load post');
        }
    }

    // Initialize address autocomplete
    initAddressAutocomplete(input) {
        let timeout = null;
        
        input.addEventListener('input', (e) => {
            clearTimeout(timeout);
            
            timeout = setTimeout(async () => {
                const query = e.target.value;
                if (query.length < 3) return;

                // Simple autocomplete using Nominatim
                try {
                    const response = await fetch(
                        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`
                    );
                    const results = await response.json();
                    
                    this.showAddressSuggestions(results, input);
                } catch (error) {
                    console.error('Autocomplete error:', error);
                }
            }, 500);
        });
    }

    // Show address suggestions
    showAddressSuggestions(results, input) {
        // Remove existing suggestions
        const existingSuggestions = document.querySelector('.address-suggestions');
        if (existingSuggestions) {
            existingSuggestions.remove();
        }

        if (results.length === 0) return;

        const suggestionsDiv = document.createElement('div');
        suggestionsDiv.className = 'address-suggestions';

        results.forEach(result => {
            const suggestion = document.createElement('div');
            suggestion.className = 'suggestion-item';
            suggestion.textContent = result.display_name;
            suggestion.onclick = () => {
                input.value = result.display_name;
                input.dataset.lat = result.lat;
                input.dataset.lng = result.lon;
                suggestionsDiv.remove();
            };
            suggestionsDiv.appendChild(suggestion);
        });

        input.parentElement.appendChild(suggestionsDiv);
    }
}

// Global instances
const feedManager = new FeedManager();
const postEditor = new PostEditor();

// Global functions for onclick handlers
function togglePostMenu(postId) {
    const menu = document.getElementById(`menu-${postId}`);
    if (menu) {
        menu.classList.toggle('show');
    }
}

async function editPost(postId) {
    window.location.href = `/create-post.html?edit=${postId}`;
}

async function deletePost(postId) {
    if (!confirm('Are you sure you want to delete this post?')) return;

    try {
        await api.deletePost(postId);
        alert('Post deleted successfully');
        location.reload();
    } catch (error) {
        console.error('Error deleting post:', error);
        alert('Failed to delete post');
    }
}

function viewPostDetails(postId) {
    window.location.href = `/post-details.html?id=${postId}`;
}

function viewOnMap(lat, lng) {
    window.location.href = `/find.html?lat=${lat}&lng=${lng}&zoom=15`;
}

async function contactForPost(postId, authorId) {
    const currentUser = auth.getCurrentProfile();
    if (!currentUser) {
        window.location.href = '/login.html';
        return;
    }

    // Determine donor and NGO IDs
    let donorId, ngoId;
    if (currentUser.role === 'donor') {
        donorId = currentUser.id;
        ngoId = authorId;
    } else {
        donorId = authorId;
        ngoId = currentUser.id;
    }

    try {
        const chat = await api.getOrCreateChat(donorId, ngoId, postId);
        window.location.href = `/chat.html?id=${chat.id}`;
    } catch (error) {
        console.error('Error creating chat:', error);
        alert('Failed to start chat');
    }
}

function openImageModal(imageUrl) {
    // Create modal
    const modal = document.createElement('div');
    modal.className = 'image-modal';
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close" onclick="this.parentElement.parentElement.remove()">&times;</span>
            <img src="${imageUrl}" alt="Full size image">
        </div>
    `;
    
    document.body.appendChild(modal);
    
    modal.onclick = (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    };
}
