// Map functionality for displaying NGOs and posts on a map
// Uses Leaflet.js with OpenStreetMap

class MapManager {
    constructor(containerId, options = {}) {
        this.containerId = containerId;
        this.map = null;
        this.markers = [];
        this.userMarker = null;
        this.userLocation = null;
        this.options = {
            defaultZoom: options.defaultZoom || APP_CONFIG.mapDefaultZoom,
            defaultCenter: options.defaultCenter || APP_CONFIG.mapDefaultCenter,
            maxZoom: options.maxZoom || 18,
            minZoom: options.minZoom || 5
        };
    }

    // Initialize the map
    initMap(center = null) {
        if (this.map) {
            this.map.remove();
        }

        const mapCenter = center || this.options.defaultCenter;

        this.map = L.map(this.containerId).setView(
            [mapCenter.lat, mapCenter.lng],
            this.options.defaultZoom
        );

        // Add OpenStreetMap tile layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: this.options.maxZoom,
            minZoom: this.options.minZoom
        }).addTo(this.map);

        return this.map;
    }

    // Get user's current location
    async getUserLocation() {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('Geolocation is not supported by your browser'));
                return;
            }

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    this.userLocation = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    };
                    resolve(this.userLocation);
                },
                (error) => {
                    reject(error);
                },
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 0
                }
            );
        });
    }

    // Add user location marker
    addUserMarker(location = null) {
        const loc = location || this.userLocation;
        
        if (!loc) return null;

        // Remove existing user marker
        if (this.userMarker) {
            this.map.removeLayer(this.userMarker);
        }

        // Custom icon for user location
        const userIcon = L.divIcon({
            className: 'user-location-marker',
            html: '<div style="background-color: #4285F4; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3);"></div>',
            iconSize: [20, 20],
            iconAnchor: [10, 10]
        });

        this.userMarker = L.marker([loc.lat, loc.lng], { icon: userIcon })
            .addTo(this.map)
            .bindPopup('Your Location');

        return this.userMarker;
    }

    // Add NGO markers
    addNGOMarkers(ngos) {
        // Clear existing markers
        this.clearMarkers();

        const bounds = [];

        ngos.forEach(ngo => {
            if (!ngo.lat || !ngo.lng) return;

            const marker = L.marker([ngo.lat, ngo.lng])
                .addTo(this.map);

            // Create popup content
            const popupContent = this.createNGOPopup(ngo);
            marker.bindPopup(popupContent);

            // Store marker reference
            this.markers.push({
                marker: marker,
                data: ngo
            });

            bounds.push([ngo.lat, ngo.lng]);
        });

        // Add user marker if available
        if (this.userLocation) {
            this.addUserMarker();
            bounds.push([this.userLocation.lat, this.userLocation.lng]);
        }

        // Fit map to show all markers
        if (bounds.length > 0) {
            this.map.fitBounds(bounds, { padding: [50, 50] });
        }
    }

    // Create NGO popup HTML
    createNGOPopup(ngo) {
        const distance = ngo.distance_km ? `${ngo.distance_km.toFixed(2)} km away` : '';
        const verified = ngo.verified ? '<span class="verified-badge">✓ Verified</span>' : '';
        const rating = ngo.rating ? `⭐ ${ngo.rating.toFixed(1)}` : '';
        
        return `
            <div class="map-popup">
                <div class="popup-header">
                    ${ngo.profile_image_url ? `<img src="${ngo.profile_image_url}" alt="${ngo.name}">` : ''}
                    <h3>${ngo.name}</h3>
                    ${verified}
                </div>
                <div class="popup-body">
                    ${distance ? `<p class="distance">📍 ${distance}</p>` : ''}
                    ${rating ? `<p class="rating">${rating}</p>` : ''}
                    ${ngo.bio ? `<p class="bio">${ngo.bio.substring(0, 100)}...</p>` : ''}
                    ${ngo.phone ? `<p class="contact">📞 ${ngo.phone}</p>` : ''}
                    ${ngo.address ? `<p class="address">📍 ${ngo.address}</p>` : ''}
                </div>
                <div class="popup-actions">
                    <a href="/ngo_profile.html?id=${ngo.id}" class="btn btn-primary btn-sm">View Profile</a>
                    <button onclick="startChat('${ngo.id}')" class="btn btn-secondary btn-sm">Chat</button>
                </div>
            </div>
        `;
    }

    // Add post markers
    addPostMarkers(posts) {
        // Clear existing markers
        this.clearMarkers();

        const bounds = [];

        posts.forEach(post => {
            if (!post.lat || !post.lng) return;

            // Custom icon for posts
            const postIcon = L.divIcon({
                className: 'post-marker',
                html: '<div style="background-color: #FF6B6B; color: white; padding: 5px 10px; border-radius: 20px; font-size: 12px; font-weight: bold; box-shadow: 0 2px 6px rgba(0,0,0,0.3);">🍽️</div>',
                iconSize: [40, 30],
                iconAnchor: [20, 15]
            });

            const marker = L.marker([post.lat, post.lng], { icon: postIcon })
                .addTo(this.map);

            // Create popup content
            const popupContent = this.createPostPopup(post);
            marker.bindPopup(popupContent);

            // Store marker reference
            this.markers.push({
                marker: marker,
                data: post
            });

            bounds.push([post.lat, post.lng]);
        });

        // Add user marker if available
        if (this.userLocation) {
            this.addUserMarker();
            bounds.push([this.userLocation.lat, this.userLocation.lng]);
        }

        // Fit map to show all markers
        if (bounds.length > 0) {
            this.map.fitBounds(bounds, { padding: [50, 50] });
        }
    }

    // Create post popup HTML
    createPostPopup(post) {
        const distance = post.distance_km ? `${post.distance_km.toFixed(2)} km away` : '';
        const image = post.images && post.images.length > 0 ? post.images[0] : '';
        const pickupTime = post.pickup_time ? new Date(post.pickup_time).toLocaleString() : '';
        
        return `
            <div class="map-popup">
                ${image ? `<img src="${image}" alt="${post.title}" style="width: 100%; height: 150px; object-fit: cover; border-radius: 8px; margin-bottom: 10px;">` : ''}
                <div class="popup-header">
                    <h3>${post.title}</h3>
                    <span class="post-role">${post.role === 'donor' ? '🎁 Donor' : '🏢 NGO'}</span>
                </div>
                <div class="popup-body">
                    ${distance ? `<p class="distance">📍 ${distance}</p>` : ''}
                    ${post.food_type ? `<p>🍽️ ${post.food_type}</p>` : ''}
                    ${post.quantity ? `<p>📦 ${post.quantity}</p>` : ''}
                    ${pickupTime ? `<p>⏰ ${pickupTime}</p>` : ''}
                    ${post.author_name ? `<p>👤 ${post.author_name}</p>` : ''}
                </div>
                <div class="popup-actions">
                    <a href="/feed.html?post=${post.id}" class="btn btn-primary btn-sm">View Details</a>
                </div>
            </div>
        `;
    }

    // Clear all markers except user marker
    clearMarkers() {
        this.markers.forEach(({ marker }) => {
            this.map.removeLayer(marker);
        });
        this.markers = [];
    }

    // Draw circle radius around user location
    drawRadiusCircle(radiusKm) {
        if (!this.userLocation) return;

        // Remove existing circle
        if (this.radiusCircle) {
            this.map.removeLayer(this.radiusCircle);
        }

        // Draw new circle
        this.radiusCircle = L.circle(
            [this.userLocation.lat, this.userLocation.lng],
            {
                radius: radiusKm * 1000, // Convert km to meters
                color: '#4285F4',
                fillColor: '#4285F4',
                fillOpacity: 0.1,
                weight: 2
            }
        ).addTo(this.map);
    }

    // Center map on location
    centerMap(lat, lng, zoom = null) {
        const zoomLevel = zoom || this.options.defaultZoom;
        this.map.setView([lat, lng], zoomLevel);
    }

    // Fit bounds to show all markers
    fitBounds(padding = [50, 50]) {
        if (this.markers.length === 0) return;

        const bounds = this.markers.map(({ marker }) => marker.getLatLng());
        
        if (this.userLocation) {
            bounds.push(L.latLng(this.userLocation.lat, this.userLocation.lng));
        }

        this.map.fitBounds(bounds, { padding });
    }

    // Destroy map
    destroy() {
        if (this.map) {
            this.map.remove();
            this.map = null;
        }
        this.markers = [];
        this.userMarker = null;
        this.radiusCircle = null;
    }
}

// Geocoding helper functions
async function geocodeAddress(address) {
    try {
        const response = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`
        );
        const data = await response.json();
        
        if (data && data.length > 0) {
            return {
                lat: parseFloat(data[0].lat),
                lng: parseFloat(data[0].lon),
                display_name: data[0].display_name
            };
        }
        
        return null;
    } catch (error) {
        console.error('Geocoding error:', error);
        return null;
    }
}

async function reverseGeocode(lat, lng) {
    try {
        const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
        );
        const data = await response.json();
        
        if (data && data.display_name) {
            return {
                address: data.display_name,
                city: data.address?.city || data.address?.town || data.address?.village,
                state: data.address?.state,
                country: data.address?.country
            };
        }
        
        return null;
    } catch (error) {
        console.error('Reverse geocoding error:', error);
        return null;
    }
}

// Calculate distance between two points (Haversine formula)
function calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371; // Earth's radius in km
    const dLat = toRadians(lat2 - lat1);
    const dLng = toRadians(lng2 - lng1);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    
    return distance;
}

function toRadians(degrees) {
    return degrees * (Math.PI / 180);
}
