// Chat functionality with real-time messaging

class ChatManager {
    constructor() {
        this.currentChat = null;
        this.messages = [];
        this.subscription = null;
        this.otherUser = null;
    }

    // Initialize chat interface
    async initChat(chatId) {
        try {
            this.currentChat = chatId;

            // Load chat details
            await this.loadChatDetails();

            // Load messages
            await this.loadMessages();

            // Subscribe to real-time updates
            this.subscribeToMessages();

            // Setup message form
            this.setupMessageForm();
        } catch (error) {
            console.error('Error initializing chat:', error);
            throw error;
        }
    }

    // Load chat details
    async loadChatDetails() {
        try {
            const { data, error } = await supabase
                .from('chats')
                .select(`
                    *,
                    donor:users!chats_donor_id_fkey(id, name, profile_image_url, role),
                    ngo:users!chats_ngo_id_fkey(id, name, profile_image_url, role),
                    posts(id, title)
                `)
                .eq('id', this.currentChat)
                .single();

            if (error) throw error;

            const currentUser = auth.getCurrentProfile();
            
            // Determine which user is the "other" user
            if (currentUser.id === data.donor.id) {
                this.otherUser = data.ngo;
            } else {
                this.otherUser = data.donor;
            }

            // Update chat header
            this.updateChatHeader(data);
        } catch (error) {
            console.error('Error loading chat details:', error);
        }
    }

    // Update chat header UI
    updateChatHeader(chatData) {
        const header = document.getElementById('chat-header');
        if (!header) return;

        header.innerHTML = `
            <div class="chat-header-user">
                <img src="${this.otherUser.profile_image_url || '/default-avatar.png'}" 
                     alt="${this.otherUser.name}" 
                     class="user-avatar">
                <div class="user-info">
                    <h3>${this.otherUser.name}</h3>
                    <span class="user-role">${this.otherUser.role === 'ngo' ? '🏢 NGO' : '🎁 Donor'}</span>
                </div>
            </div>
            ${chatData.posts ? `
                <div class="chat-post-reference">
                    <small>Regarding: ${chatData.posts.title}</small>
                </div>
            ` : ''}
            <div class="chat-header-actions">
                <button class="btn-icon" onclick="viewUserProfile('${this.otherUser.id}')">👤</button>
                <button class="btn-icon" onclick="closeChatView()">✕</button>
            </div>
        `;
    }

    // Load messages
    async loadMessages() {
        try {
            this.messages = await api.getChatMessages(this.currentChat);
            this.renderMessages();
            this.scrollToBottom();
        } catch (error) {
            console.error('Error loading messages:', error);
        }
    }

    // Render messages
    renderMessages() {
        const container = document.getElementById('messages-container');
        if (!container) return;

        container.innerHTML = '';

        if (this.messages.length === 0) {
            container.innerHTML = `
                <div class="no-messages">
                    <p>No messages yet. Start the conversation!</p>
                </div>
            `;
            return;
        }

        const currentUser = auth.getCurrentProfile();

        this.messages.forEach(message => {
            const messageElement = this.createMessageElement(message, currentUser.id);
            container.appendChild(messageElement);
        });
    }

    // Create message element
    createMessageElement(message, currentUserId) {
        const div = document.createElement('div');
        const isOwn = message.sender_id === currentUserId;
        
        div.className = `message ${isOwn ? 'message-own' : 'message-other'}`;
        div.dataset.messageId = message.id;

        const sender = message.sender || {};
        const time = new Date(message.created_at).toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
        });

        div.innerHTML = `
            ${!isOwn ? `
                <img src="${sender.profile_image_url || '/default-avatar.png'}" 
                     alt="${sender.name}" 
                     class="message-avatar">
            ` : ''}
            <div class="message-content">
                ${!isOwn ? `<div class="message-sender">${sender.name}</div>` : ''}
                <div class="message-text">${this.escapeHtml(message.text)}</div>
                ${message.attachments && message.attachments.length > 0 ? `
                    <div class="message-attachments">
                        ${message.attachments.map(url => `
                            <img src="${url}" alt="Attachment" onclick="openImageModal('${url}')">
                        `).join('')}
                    </div>
                ` : ''}
                <div class="message-time">${time}</div>
            </div>
        `;

        return div;
    }

    // Escape HTML to prevent XSS
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Subscribe to real-time messages
    subscribeToMessages() {
        if (this.subscription) {
            this.subscription.unsubscribe();
        }

        this.subscription = api.subscribeToChat(this.currentChat, (newMessage) => {
            // Add message to array
            this.messages.push(newMessage);

            // Render new message
            const container = document.getElementById('messages-container');
            if (container) {
                // Remove "no messages" placeholder if exists
                const noMessages = container.querySelector('.no-messages');
                if (noMessages) {
                    noMessages.remove();
                }

                const messageElement = this.createMessageElement(
                    newMessage, 
                    auth.getCurrentProfile().id
                );
                container.appendChild(messageElement);
                this.scrollToBottom();
            }

            // Play notification sound if message is from other user
            if (newMessage.sender_id !== auth.getCurrentProfile().id) {
                this.playNotificationSound();
            }
        });
    }

    // Setup message form
    setupMessageForm() {
        const form = document.getElementById('message-form');
        if (!form) return;

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.sendMessage(form);
        });

        // Handle file attachments
        const fileInput = form.querySelector('input[type="file"]');
        if (fileInput) {
            fileInput.addEventListener('change', (e) => {
                this.handleAttachmentSelect(e.target.files);
            });
        }

        // Handle Enter key (without Shift)
        const textarea = form.querySelector('textarea[name="message"]');
        if (textarea) {
            textarea.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    form.requestSubmit();
                }
            });
        }
    }

    // Handle attachment selection
    handleAttachmentSelect(files) {
        // Preview selected files
        const preview = document.getElementById('attachment-preview');
        if (!preview) return;

        preview.innerHTML = '';

        Array.from(files).forEach((file, index) => {
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const img = document.createElement('img');
                    img.src = e.target.result;
                    img.className = 'attachment-preview-img';
                    preview.appendChild(img);
                };
                reader.readAsDataURL(file);
            } else {
                const fileDiv = document.createElement('div');
                fileDiv.textContent = file.name;
                fileDiv.className = 'attachment-preview-file';
                preview.appendChild(fileDiv);
            }
        });
    }

    // Send message
    async sendMessage(form) {
        const textarea = form.querySelector('textarea[name="message"]');
        const fileInput = form.querySelector('input[type="file"]');
        const submitBtn = form.querySelector('button[type="submit"]');
        
        const text = textarea.value.trim();
        
        if (!text && (!fileInput.files || fileInput.files.length === 0)) {
            return;
        }

        try {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Sending...';

            // Upload attachments if any
            let attachmentUrls = [];
            if (fileInput.files && fileInput.files.length > 0) {
                attachmentUrls = await this.uploadAttachments(fileInput.files);
            }

            // Create message
            const message = {
                chat_id: this.currentChat,
                sender_id: auth.getCurrentProfile().id,
                text: text || '(Attachment)',
                attachments: attachmentUrls,
                read_by: [auth.getCurrentProfile().id]
            };

            await api.sendMessage(message);

            // Clear form
            textarea.value = '';
            fileInput.value = '';
            
            const preview = document.getElementById('attachment-preview');
            if (preview) {
                preview.innerHTML = '';
            }

            // Reset textarea height
            textarea.style.height = 'auto';
        } catch (error) {
            console.error('Error sending message:', error);
            alert('Failed to send message');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Send';
        }
    }

    // Upload attachments
    async uploadAttachments(files) {
        const urls = [];
        const userId = auth.getCurrentProfile().id;

        for (const file of files) {
            try {
                const timestamp = Date.now();
                const fileName = `${this.currentChat}/${userId}/${timestamp}-${file.name}`;
                const url = await api.uploadImage(STORAGE_BUCKETS.chatAttachments, fileName, file);
                urls.push(url);
            } catch (error) {
                console.error('Error uploading attachment:', error);
            }
        }

        return urls;
    }

    // Scroll to bottom of messages
    scrollToBottom() {
        const container = document.getElementById('messages-container');
        if (container) {
            container.scrollTop = container.scrollHeight;
        }
    }

    // Play notification sound
    playNotificationSound() {
        // Create and play a simple notification sound
        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwNU6ng7bllHAU2k9n1znkoBC15yPLaizsKElyx6OyrWBELTKXh8b9pIAQrhM/y2og1Bxpmve7mnEsMC1Gn4+22Yx0GN5HY8s95KwYte8r03oo9ChRgs+nvq1wRDU2l4fHBayEELIfQ8tuJNQcaZr3v5ZxKDAhQp+Pttn8fBTiT2fPOeS4GLXzL8tyLPAoTYLPo8KtbEAtNpeHwwGkgBC+Hz/PaiTQHGWW97OSbSgwIUKfj7rZ/HgU0kdnxy3krBi18yvPcizwJE2Cz6PKsWRILTKPh8L9oIQQviM/z24k0BhlmvvHlnEoNB1Co4+22Yx8GN5PY8s55KwUue8n03oo8ChJfs+fxrFkSC0yl4fG/aSEEL4fP89uJNAYZZr7w5ZtJDAhPqOPutnsfBjaSz/LMeSsGLnvJ9dyLPQoTX7Tn8axaEgtMpd/xvWogBSyIzvLaiTQGGma97+WcSQwIUKjj7bZ/HwU5k9n0z3ksBi58yvTcizwKE12z6e+rWxELTKPh8L9rIQUrh870wok0Bhhmu+zmnEsMCE+p4+22fSAGOJLZ8sx5KwQufMrz3Is9ChNds+nwq1oSC0yl4fC/aSEELYjO9NyJNQYZZrvv5ZtJDAhQqeXttmEeBzeT2fPNeSwGLn3L89yLPAoTXbPp76taEgtLpd/yv2sgBS2Iz/TaiTQGGma98OSbSQwIUKjl7bZ/HwU5lNn0znkrBi58yvPcizwKEl2z6e+rWhIKTKPg8b5rIAUsiM/z2og1Bxpnve7mnEoMCE+p5e22fx8GNpPZ9M55KwYuf8rz3Ik9ChJfs+nvq1oSC0uk3/G/aiAFLYnP9NuJNQYaZrzu5JtKDAhPqOPttngfBTiU2fPOeCsHLXvJ9N2KPQkSXbPp8KtcEgpLo+Dwv2ogBS6Jz/TciTUHGWa87+SbSw0HT6nm7bZ/HgU4k9jzz3kqBi18yvPcizwKEl6z6e+rWhILSqPf8b5rIQQtic/03Ik1BxpnvO3km0oMCE+p5u22fh8GOJPb9M55KgYsfsrz3Is9ChNds+nvq1wRCkqj3/G+aR8FLInP9N2JNQcZZrvt5ZxLDAhOqOTttmMfBTiT2fPOeSwGLX3K89yLPQoSXbPp76taEgpLo+Dwv2ogBS2Jz/TciTUHGWa78OSbSg0HT6nl77d/HwQ4lNn0z3gqBi1+yvPciz0KEl2z6O+rWhILS6Pf8L5qIQUtis/024k1BxpnvO3lm0oNB06p5e22fh8FOJPZ8855KgYtfcrz3Ys+ChJds+jvq1kSCkqj3/C+aiAFL4nP9NuJNQcZZrzv5ZtKDAdPqeXutn0fBTmT2vTOeCsGLX3K89yLPQoSXbPo76tZEgtKo9/wv2kgBS6Jz/TciTUHGWa78OSbSg0HT6nm7rZ/HgY4lNr0zngrBix+yvPciz0KEl2y6O+rWhILSqPg8L5qHwQsh8/024k1Bxpmu+3lnEsMB06p5O62ZB8GN5PZ9M95KgYtfcrz3Ys9ChNes+jvq1oTC0qj3/C+aR8FLYrP9NuINQcaZrvt5JtKDAhOp+Tutn0fBjiT2fTOeCoGLX3K89yLPQoSXbPo76taEgpKo9/wvmohBS2Kz/TdiTQHGme77uSbSQ0HTqnk7rZ/HgU4k9n0zngqBi1+yvPciz0KEl2z6O+rWhIKSqPe8L5qIQUtis/024k1BxpnvO3km0oNB06p5O62fR8FOJTZ9M54KwYtfcrz3Is9ChJds+jvq1oSCkqj3vC+ah8ELonP9N2JNAcZZ73t5ZtJDQdOqeTutmMfBTiT2vPPeCsFLH7K89yLPgoSXLPo76taEQpKo9/xvmkgBSyJz/PciTUHGWa87uSbSg0HTqnk7rZ/HwY4k9r0zngrBSx+yvPcizwJEl2z6e+rWhIKSqPf8L5pIAUtiM/z3Ik1BhlmvO7km0oNB06p5O62fx8FOJPZ9M54KwUsfsrz3Ys9ChJds+nvq1oRCkqj3/G+aiAFLYnP89yJNAYZZrzv5JtKDQdOqeXutn8fBjiU2fTOeSoGLH7K89yKPQoTXrPo76taEgpKo9/wvmkgBSyJz/PciTUHGWa87+SbSg0HTqnl7rZ/HwU4lNn0znkqBix+yvPci==');
        audio.volume = 0.3;
        audio.play().catch(e => console.log('Could not play sound:', e));
    }

    // Cleanup
    destroy() {
        if (this.subscription) {
            this.subscription.unsubscribe();
            this.subscription = null;
        }
        this.currentChat = null;
        this.messages = [];
        this.otherUser = null;
    }
}

// Chat list manager
class ChatListManager {
    constructor() {
        this.chats = [];
    }

    // Load user's chats
    async loadChats() {
        try {
            const currentUser = auth.getCurrentProfile();
            if (!currentUser) return;

            this.chats = await api.getUserChats(currentUser.id);
            this.renderChatList();
        } catch (error) {
            console.error('Error loading chats:', error);
        }
    }

    // Render chat list
    renderChatList() {
        const container = document.getElementById('chat-list');
        if (!container) return;

        container.innerHTML = '';

        if (this.chats.length === 0) {
            container.innerHTML = '<div class="no-chats">No conversations yet</div>';
            return;
        }

        const currentUser = auth.getCurrentProfile();

        this.chats.forEach(chat => {
            const otherUser = chat.donor.id === currentUser.id ? chat.ngo : chat.donor;
            const chatElement = this.createChatListItem(chat, otherUser);
            container.appendChild(chatElement);
        });
    }

    // Create chat list item
    createChatListItem(chat, otherUser) {
        const div = document.createElement('div');
        div.className = 'chat-list-item';
        div.onclick = () => {
            window.location.href = `/chat.html?id=${chat.id}`;
        };

        const lastUpdated = new Date(chat.updated_at).toLocaleDateString();

        div.innerHTML = `
            <img src="${otherUser.profile_image_url || '/default-avatar.png'}" 
                 alt="${otherUser.name}" 
                 class="chat-avatar">
            <div class="chat-info">
                <h4>${otherUser.name}</h4>
                <p class="chat-role">${otherUser.role === 'ngo' ? '🏢 NGO' : '🎁 Donor'}</p>
                ${chat.posts ? `<p class="chat-post">Re: ${chat.posts.title}</p>` : ''}
            </div>
            <div class="chat-meta">
                <span class="chat-time">${lastUpdated}</span>
            </div>
        `;

        return div;
    }
}

// Global instances
const chatManager = new ChatManager();
const chatListManager = new ChatListManager();

// Global helper functions
function viewUserProfile(userId) {
    window.location.href = `/ngo_profile.html?id=${userId}`;
}

function closeChatView() {
    window.history.back();
}

async function startChat(ngoId) {
    const currentUser = auth.getCurrentProfile();
    if (!currentUser) {
        window.location.href = '/login.html';
        return;
    }

    try {
        let donorId, chatNgoId;
        if (currentUser.role === 'donor') {
            donorId = currentUser.id;
            chatNgoId = ngoId;
        } else {
            // NGO initiating chat - this shouldn't normally happen
            // but we'll handle it
            donorId = ngoId;
            chatNgoId = currentUser.id;
        }

        const chat = await api.getOrCreateChat(donorId, chatNgoId);
        window.location.href = `/chat.html?id=${chat.id}`;
    } catch (error) {
        console.error('Error starting chat:', error);
        alert('Failed to start chat');
    }
}
