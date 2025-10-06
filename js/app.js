/**
 * Main Application - LED Animation Converter
 * Coordinates all modules and provides UI feedback
 */

// Global UI helpers
window.showSnackbar = function(message, type = 'success') {
    const snackbar = document.getElementById('snackbar');
    const icon = snackbar.querySelector('.material-icons');
    // Get all spans and explicitly target the second one (text span, not icon)
    const allSpans = Array.from(snackbar.querySelectorAll('span'));
    const textSpan = allSpans.find(span => !span.classList.contains('material-icons'));
    
    // Set icon and text
    if (type === 'error') {
        icon.textContent = 'error';
        snackbar.style.backgroundColor = '#B3261E';
    } else {
        icon.textContent = 'check_circle';
        snackbar.style.backgroundColor = '#2E7D32';
    }
    if (textSpan) {
        textSpan.textContent = message;
    }
    
    // Show snackbar
    snackbar.classList.add('show');
    
    // Hide after 3 seconds
    setTimeout(() => {
        snackbar.classList.remove('show');
    }, 3000);
};

window.showLoading = function(show) {
    const overlay = document.getElementById('loadingOverlay');
    overlay.style.display = show ? 'flex' : 'none';
};

// Main application class
class LEDAnimationConverter {
    constructor() {
        this.currentTab = 'single';
        this.initialized = false;
        
        this.initializeApp();
    }

    async initializeApp() {
        try {
            // Initialize core modules
            this.imageProcessor = new ImageProcessor();
            this.frameManager = new FrameManager();
            this.animationExporter = new AnimationExporter(this.imageProcessor);
            
            // Initialize handlers
            this.singleImageHandler = new SingleImageHandler(this.imageProcessor);
            this.sequenceHandler = new SequenceHandler(
                this.imageProcessor,
                this.frameManager,
                this.animationExporter
            );
            
            // Initialize UI
            this.initializeTabNavigation();
            this.initializeThemeToggle();
            
            this.initialized = true;
            console.log('LED Animation Converter initialized successfully');
            
        } catch (error) {
            console.error('Failed to initialize application:', error);
            window.showSnackbar('Failed to initialize application', 'error');
        }
    }

    /**
     * Initialize tab navigation
     */
    initializeTabNavigation() {
        const tabs = document.querySelectorAll('.tab');
        const tabContents = document.querySelectorAll('.tab-content');
        
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const tabName = tab.dataset.tab;
                this.switchTab(tabName, tabs, tabContents);
            });
        });
    }

    /**
     * Switch between tabs
     */
    switchTab(tabName, tabs, tabContents) {
        // Update active tab
        tabs.forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabName);
        });
        
        // Update visible content
        tabContents.forEach(content => {
            content.classList.toggle('active', content.id === `${tabName}Tab`);
        });
        
        // Stop animation playback when switching tabs
        if (tabName !== 'sequence' && this.frameManager) {
            this.frameManager.stop();
        }
        
        this.currentTab = tabName;
    }

    /**
     * Initialize theme toggle
     */
    initializeThemeToggle() {
        const themeToggle = document.getElementById('themeToggle');
        const root = document.documentElement;
        
        // Check for saved theme preference
        const savedTheme = localStorage.getItem('theme') || 'light';
        this.setTheme(savedTheme);
        
        themeToggle.addEventListener('click', () => {
            const currentTheme = root.getAttribute('data-theme');
            const newTheme = currentTheme === 'light' ? 'dark' : 'light';
            this.setTheme(newTheme);
            localStorage.setItem('theme', newTheme);
        });
    }

    /**
     * Set application theme
     */
    setTheme(theme) {
        const root = document.documentElement;
        const themeToggle = document.getElementById('themeToggle');
        const icon = themeToggle.querySelector('.material-icons');
        
        root.setAttribute('data-theme', theme);
        icon.textContent = theme === 'light' ? 'dark_mode' : 'light_mode';
    }
}

// Initialize application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const app = new LEDAnimationConverter();
    
    // Make app instance globally accessible for debugging
    window.app = app;
});

// Prevent default drag/drop behavior on document
document.addEventListener('dragover', (e) => {
    e.preventDefault();
});

document.addEventListener('drop', (e) => {
    e.preventDefault();
});

// Handle keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // Space bar: toggle playback in sequence mode
    if (e.code === 'Space' && window.app.currentTab === 'sequence') {
        e.preventDefault();
        const playBtn = document.getElementById('sequencePlayBtn');
        if (playBtn) {
            playBtn.click();
        }
    }
    
    // Arrow keys: navigate frames in sequence mode
    if (window.app.currentTab === 'sequence' && window.app.frameManager) {
        if (e.code === 'ArrowLeft') {
            e.preventDefault();
            window.app.frameManager.previousFrame();
        } else if (e.code === 'ArrowRight') {
            e.preventDefault();
            window.app.frameManager.nextFrame();
        }
    }
});

// Handle window resize for responsive canvas
window.addEventListener('resize', () => {
    // Debounce resize events
    clearTimeout(window.resizeTimer);
    window.resizeTimer = setTimeout(() => {
        // Trigger canvas redraw if needed
        if (window.app && window.app.initialized) {
            // Could trigger preview updates here if needed
        }
    }, 250);
});

// Log version info
console.log('%cSAND LED Studio', 'font-size: 20px; font-weight: bold; color: #1976D2;');
console.log('%cv1.0.0 - Part of SAND_Common ecosystem', 'color: #666;');
console.log('%cSupports single images and PNG sequences for TwinCAT LED animations', 'color: #666;');
console.log('%cKeyboard shortcuts:', 'font-weight: bold; margin-top: 8px;');
console.log('  Space: Toggle playback (sequence mode)');
console.log('  Arrow Left/Right: Navigate frames (sequence mode)');
console.log('%c🌐 https://supply-demand-studio.github.io/LED-Studio/', 'color: #1976D2; margin-top: 8px;');
