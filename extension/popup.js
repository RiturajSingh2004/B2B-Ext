document.addEventListener('DOMContentLoaded', function() {
    const chatForm = document.getElementById('chatForm');
    const messageInput = document.getElementById('messageInput');
    const chatContainer = document.getElementById('chatContainer');
    const loadingElement = document.getElementById('loading');
    const errorElement = document.getElementById('error');
    const root = document.documentElement;
    const themeToggle = document.getElementById('themeToggle');
    const clearChatBtn = document.getElementById('clearChatBtn');
    const pageTitle = document.getElementById('pageTitle');
    const pageUrl = document.getElementById('pageUrl');
    
    let conversationHistory = [];
    let currentTabInfo = null;
    
    // Function to get current tab information
    async function getCurrentTabInfo() {
        try {
            const tabs = await chrome.tabs.query({active: true, currentWindow: true});
            const tab = tabs[0];
            
            currentTabInfo = {
                url: tab.url,
                title: tab.title,
                id: tab.id
            };
            
            // Update UI with tab info
            pageTitle.textContent = tab.title || 'Untitled Page';
            pageUrl.textContent = tab.url || 'No URL';
            
            return currentTabInfo;
        } catch (error) {
            console.error('Error getting tab info:', error);
            pageTitle.textContent = 'Unable to get page info';
            pageUrl.textContent = 'Extension permissions may be needed';
            return null;
        }
    }
    
    // Function to add message to chat
    function addMessage(content, isUser = false) {
        // Remove welcome message if it exists
        const welcomeMessage = chatContainer.querySelector('.welcome-message');
        if (welcomeMessage) {
            welcomeMessage.remove();
        }
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${isUser ? 'user-message' : 'assistant-message'}`;
        messageDiv.textContent = content;
        chatContainer.appendChild(messageDiv);
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }
    
    // Function to show/hide loading state
    function setLoadingState(isLoading) {
        const loadingText = loadingElement.querySelector('div:last-child');
        if (isLoading) {
            loadingElement.style.display = 'block';
            loadingText.textContent = 'AI is thinking... This may take up to 2 minutes.';
        } else {
            loadingElement.style.display = 'none';
            loadingText.textContent = 'Processing...';
        }
        messageInput.disabled = isLoading;
        chatForm.querySelector('.send-button').disabled = isLoading;
    }
    
    // Function to show error
    function showError(message) {
        errorElement.textContent = message;
        errorElement.style.display = 'block';
        setTimeout(() => {
            errorElement.style.display = 'none';
        }, 5000);
    }

    // Handle chat form submission
    chatForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const userMessage = messageInput.value.trim();
        if (!userMessage) return;
        
        // Add user message to chat
        addMessage(userMessage, true);
        messageInput.value = '';
        
        // Show loading state
        setLoadingState(true);
        errorElement.style.display = 'none';
        
        try {
            // Ensure we have current tab info
            if (!currentTabInfo) {
                await getCurrentTabInfo();
            }
            
            const response = await fetch('http://localhost:5000/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userInput: userMessage,
                    conversationHistory: conversationHistory,
                    tabInfo: currentTabInfo
                })
            });
            
            if (!response.ok) {
                throw new Error(`Server error: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.error) {
                throw new Error(data.error);
            }

            // Add assistant's response to chat
            addMessage(data.response, false);
            
            // Update conversation history
            conversationHistory.push(
                { role: 'user', content: userMessage },
                { role: 'assistant', content: data.response }
            );
            
        } catch (error) {
            console.error('Chat error:', error);
            showError(`Error: ${error.message}. Make sure the server is running on localhost:5000`);
        } finally {
            setLoadingState(false);
        }
    });
    
    // Clear chat functionality
    clearChatBtn.addEventListener('click', () => {
        chatContainer.innerHTML = `
            <div class="welcome-message">
                <div class="welcome-text">👋 Hi there! I'm your AI assistant.</div>
                <div class="welcome-subtext">I can help you analyze and discuss the content of the current webpage. What would you like to know?</div>
            </div>
        `;
        conversationHistory = [];
        errorElement.style.display = 'none';
    });
    
    // Theme detection and management
    function detectSystemTheme() {
        return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    
    // Initialize theme
    function initializeTheme() {
        const savedTheme = localStorage.getItem('ai-chat-theme');
        const theme = savedTheme || detectSystemTheme();
        root.setAttribute('data-theme', theme);
        updateThemeToggleIcon(theme);
    }
    
    // Theme toggle functionality
    themeToggle.addEventListener('click', () => {
        const currentTheme = root.getAttribute('data-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        root.setAttribute('data-theme', newTheme);
        localStorage.setItem('ai-chat-theme', newTheme);
        updateThemeToggleIcon(newTheme);
    });

    function updateThemeToggleIcon(theme) {
        const icon = themeToggle.querySelector('.theme-icon');
        icon.innerHTML = theme === 'light' 
            ? '<path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"></path>' // moon icon
            : '<circle cx="12" cy="12" r="5"/><path d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72l1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>'; // sun icon
    }
    
    // Handle Enter key in message input
    messageInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            chatForm.dispatchEvent(new Event('submit'));
        }
    });
    
    // Initialize the extension
    async function initialize() {
        initializeTheme();
        await getCurrentTabInfo();
    }
    
    // Start initialization
    initialize();
    
    // Listen for tab updates
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
        if (changeInfo.status === 'complete' && tab.active) {
            getCurrentTabInfo();
        }
    });
    
    // Listen for tab activation
    chrome.tabs.onActivated.addListener(() => {
        getCurrentTabInfo();
    });
});