document.addEventListener('DOMContentLoaded', function() {
    const chatForm = document.getElementById('chatForm');
    const messageInput = document.getElementById('messageInput');
    const chatContainer = document.getElementById('chatContainer');
    const loadingElement = document.getElementById('loading');
    const errorElement = document.getElementById('error');
    const root = document.documentElement;
    const themeToggle = document.getElementById('themeToggle');
    const clearChatBtn = document.getElementById('clearChatBtn');
    
    let conversationHistory = [];
    
    // Function to add message to chat
    function addMessage(content, isUser = false) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${isUser ? 'user-message' : 'assistant-message'}`;
        messageDiv.textContent = content;
        chatContainer.appendChild(messageDiv);
        chatContainer.scrollTop = chatContainer.scrollHeight;
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
        loadingElement.style.display = 'block';
        errorElement.style.display = 'none';
        
        try {
            const response = await fetch('http://localhost:5000/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userInput: userMessage,
                    conversationHistory: conversationHistory
                })
            });
            
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
            errorElement.textContent = `Error: ${error.message}`;
            errorElement.style.display = 'block';
        } finally {
            loadingElement.style.display = 'none';
        }
    });
    
    // Clear chat functionality
    clearChatBtn.addEventListener('click', () => {
        chatContainer.innerHTML = '';
        conversationHistory = [];
        errorElement.style.display = 'none';
    });
    
    // Function to detect theme
    async function detectYouTubeTheme() {
      try {
        const tabs = await chrome.tabs.query({active: true, currentWindow: true});
        const result = await chrome.scripting.executeScript({
          target: { tabId: tabs[0].id },
          function: () => {
            const htmlElement = document.documentElement;
            return htmlElement.getAttribute('dark') !== null;
          }
        });
        return result[0].result ? 'dark' : 'light';
      } catch (error) {
        console.error('Error detecting theme:', error);
        return 'light'; // Default fallback
      }
    }

    // Initialize theme
    detectYouTubeTheme().then(theme => {
      root.setAttribute('data-theme', theme);
      updateThemeToggleIcon(theme);
    });

    // Theme toggle functionality
    themeToggle.addEventListener('click', () => {
      const currentTheme = root.getAttribute('data-theme');
      const newTheme = currentTheme === 'light' ? 'dark' : 'light';
      root.setAttribute('data-theme', newTheme);
      updateThemeToggleIcon(newTheme);
    });

    function updateThemeToggleIcon(theme) {
      const icon = themeToggle.querySelector('.theme-icon');
      icon.innerHTML = theme === 'light' 
        ? '<path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"></path>' // moon icon
        : '<circle cx="12" cy="12" r="5"/><path d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72l1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>'; // sun icon
    }

    // Listen for theme changes
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
        if (changeInfo.status === 'complete') {
            detectTheme().then(theme => {
                root.setAttribute('data-theme', theme);
                updateThemeToggleIcon(theme);
            });
        }
    });
});