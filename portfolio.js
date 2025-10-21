class PortfolioManager {
    constructor() {
        this.portfolioItems = [];
        this.currentFilter = 'all';
        this.init();
    }

    async init() {
        await this.fetchPortfolioData();
        this.setupEventListeners();
        this.renderPortfolio();
    }

    async fetchPortfolioData() {
        try {
            const response = await fetch('/api/public/portfolio');
            if (!response.ok) {
                throw new Error('Failed to fetch portfolio data');
            }
            this.portfolioItems = await response.json();
        } catch (error) {
            console.error('Error fetching portfolio:', error);
            this.showError('Failed to load portfolio items');
        }
    }

    setupEventListeners() {
        const filterButtons = document.querySelectorAll('.filter-btn');
        filterButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                // Remove active class from all buttons
                filterButtons.forEach(b => b.classList.remove('active'));
                // Add active class to clicked button
                e.target.classList.add('active');
                
                // Get filter value and update display
                this.currentFilter = e.target.dataset.filter;
                this.renderPortfolio();
            });
        });
    }

    filterItems() {
        if (this.currentFilter === 'all') {
            return this.portfolioItems;
        }
        return this.portfolioItems.filter(item => item.category === this.currentFilter);
    }

    getCategoryDisplayName(category) {
        const categoryNames = {
            'valuation': 'Property Valuation',
            'management': 'Property Management', 
            'brokerage': 'Real Estate Brokerage',
            'survey': 'Quantity Survey',
            'development':'Property Development'
            
        };
        return categoryNames[category] || category;
    }

    getCategoryIcon(category) {
        const icons = {
            'valuation': 'fas fa-calculator',
            'management': 'fas fa-building',
            'brokerage': 'fas fa-handshake',
            'survey': 'fas fa-chart-line',
            'development': 'fas fa-hammer'
        };
        return icons[category] || 'fas fa-home';
    }

    formatValue(value) {
        if (!value) return null;
        
        // If it's already formatted (contains RWF), return as is
        if (value.includes('RWF')) return value;
        
        // Try to format as currency if it's a number
        const numValue = parseFloat(value.replace(/[^\d.]/g, ''));
        if (!isNaN(numValue)) {
            if (numValue >= 1000000000) {
                return `RWF ${(numValue / 1000000000).toFixed(1)}B`;
            } else if (numValue >= 1000000) {
                return `RWF ${(numValue / 1000000).toFixed(1)}M`;
            }
        }
        
        return value;
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        const options = { year: 'numeric', month: 'long' };
        return date.toLocaleDateString('en-US', options);
    }

    generatePortfolioStats(item) {
        const stats = [];
        
        // Value stat
        if (item.value) {
            stats.push({
                number: this.formatValue(item.value),
                label: 'Project Value'
            });
        }
        
        // Duration stat
        if (item.duration) {
            stats.push({
                number: item.duration,
                label: 'Duration'
            });
        }
        
        // Location stat
        if (item.location) {
            stats.push({
                number: item.location,
                label: 'Location'
            });
        }
        
        // If we don't have enough stats, add completion date
        if (stats.length < 3 && item.date) {
            stats.push({
                number: this.formatDate(item.date),
                label: 'Completed'
            });
        }
        
        return stats.slice(0, 3); // Limit to 3 stats max
    }

    createPortfolioItemHTML(item) {
        const stats = this.generatePortfolioStats(item);
        const categoryName = this.getCategoryDisplayName(item.category);
        const categoryIcon = this.getCategoryIcon(item.category);
        
        // Determine if single or multiple images
        const imageCount = item.images && item.images.length ? item.images.length : 0;
        const imageClass = imageCount === 1 ? 'single-image' : imageCount > 1 ? 'multiple-images' : 'no-image';
        
        // Use first image if available, otherwise use icon
        const imageContent = item.images && item.images.length > 0 
            ? `<img src="${item.images[0]}" alt="${item.title}">`
            : `<i class="${categoryIcon} portfolio-icon"></i>`;
        
        const statsHTML = stats.map(stat => `
            <div class="portfolio-stat">
                <div class="number">${stat.number}</div>
                <div class="label">${stat.label}</div>
            </div>
        `).join('');

        return `
            <div class="portfolio-item ${imageClass}" data-category="${item.category}">
                <div class="portfolio-image">
                    ${imageContent}
                </div>
                <div class="portfolio-content">
                    <span class="portfolio-category">${categoryName}</span>
                    <h3>${item.title}</h3>
                    <p>${item.description}</p>
                    <div class="portfolio-stats">
                        ${statsHTML}
                    </div>
                </div>
            </div>
        `;
    }

    // ADD THIS MISSING METHOD
    clearLoadingMessage() {
        const portfolioGrid = document.querySelector('.portfolio-grid');
        if (portfolioGrid) {
            // Remove any loading messages, spinners, or placeholder content
            const loadingElements = portfolioGrid.querySelectorAll('.loading-message, .spinner, .loading-placeholder');
            loadingElements.forEach(element => element.remove());
        }
    }

    renderPortfolio() {
        const portfolioGrid = document.querySelector('.portfolio-grid');
        if (!portfolioGrid) {
            console.error('Portfolio grid container not found');
            return;
        }

        // Clear loading message first
        this.clearLoadingMessage();

        const filteredItems = this.filterItems();
        console.log('Rendering portfolio with items:', filteredItems.length);
        
        if (filteredItems.length === 0) {
            portfolioGrid.innerHTML = `
                <div class="no-items-message" style="grid-column: 1/-1; text-align: center; padding: 3rem; color: #666;">
                    <i class="fas fa-folder-open" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;"></i>
                    <h3>No Portfolio Items Found</h3>
                    <p>No projects available or match the current filter criteria.</p>
                    <button onclick="window.portfolioManager.refresh()" style="margin-top: 1rem; padding: 0.5rem 1rem; background: #3498db; color: white; border: none; border-radius: 5px; cursor: pointer;">
                        Refresh
                    </button>
                </div>
            `;
            return;
        }

        const portfolioHTML = filteredItems.map(item => this.createPortfolioItemHTML(item)).join('');
        portfolioGrid.innerHTML = portfolioHTML;
        
        // Add fade-in animation
        this.animatePortfolioItems();
    }

    animatePortfolioItems() {
        const items = document.querySelectorAll('.portfolio-item');
        items.forEach((item, index) => {
            item.style.opacity = '0';
            item.style.transform = 'translateY(30px)';
            
            setTimeout(() => {
                item.style.transition = 'all 0.6s ease';
                item.style.opacity = '1';
                item.style.transform = 'translateY(0)';
            }, index * 100);
        });
    }

    showError(message) {
        const portfolioGrid = document.querySelector('.portfolio-grid');
        if (portfolioGrid) {
            portfolioGrid.innerHTML = `
                <div class="error-message" style="grid-column: 1/-1; text-align: center; padding: 3rem; color: #e74c3c;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 3rem; margin-bottom: 1rem;"></i>
                    <h3>Error Loading Portfolio</h3>
                    <p>${message}</p>
                    <button onclick="location.reload()" class="retry-btn" style="margin-top: 1rem; padding: 0.5rem 1rem; background: #3498db; color: white; border: none; border-radius: 5px; cursor: pointer;">
                        Retry
                    </button>
                </div>
            `;
        }
    }

    // Optional: Show loading message while fetching data
    showLoadingMessage() {
        const portfolioGrid = document.querySelector('.portfolio-grid');
        if (portfolioGrid) {
            portfolioGrid.innerHTML = `
                <div class="loading-message" style="grid-column: 1/-1; text-align: center; padding: 3rem; color: #666;">
                    <div class="spinner" style="margin-bottom: 1rem;">
                        <i class="fas fa-spinner fa-spin" style="font-size: 2rem;"></i>
                    </div>
                    <h3>Loading Portfolio...</h3>
                    <p>Please wait while we fetch your portfolio items.</p>
                </div>
            `;
        }
    }

    // Public method to refresh portfolio data
    async refresh() {
        this.showLoadingMessage(); // Optional: show loading during refresh
        await this.fetchPortfolioData();
        this.renderPortfolio();
    }
}

// ============================================
// INITIALIZATION CODE
// ============================================

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Create global portfolio manager instance
    window.portfolioManager = new PortfolioManager();
});

// Optional: Auto-refresh every 5 minutes
setInterval(() => {
    if (window.portfolioManager) {
        window.portfolioManager.refresh();
    }
}, 5 * 60 * 1000);