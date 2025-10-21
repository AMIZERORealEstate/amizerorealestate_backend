let currentProperties = [];
let currentFilters = {
    type: 'all',
    location: '',
    propertyType: '',
    bedrooms: '',
    minPrice: '',
    maxPrice: ''
};

// DOM Elements
const propertiesGrid = document.getElementById('propertiesGrid');
const resultsCount = document.getElementById('resultsCount');
const loadingState = document.getElementById('loadingState');
const noResults = document.getElementById('noResults');
const filterTabs = document.querySelectorAll('.filter-tab');
const applyFiltersBtn = document.getElementById('applyFilters');
const clearFiltersBtn = document.getElementById('clearFilters');

const API_URL = `${window.location.origin}/api/public/properties`;

// ------------------- RENDER PROPERTIES -------------------
function renderProperties(properties) {
    resultsCount.textContent = properties.length;

    if (!properties || properties.length === 0) {
        propertiesGrid.style.display = 'none';
        noResults.style.display = 'block';
        return;
    }

    propertiesGrid.style.setProperty('display', 'grid', 'important');
    noResults.style.display = 'none';
    propertiesGrid.innerHTML = properties.map(createPropertyCard).join('');
    setupCardInteractions();

}

// ------------------- LOAD PROPERTIES -------------------
async function loadProperties() {
    showLoading();
    try {
        const res = await fetch(API_URL);
        if (!res.ok) throw new Error("Failed to fetch properties");
        const data = await res.json();

       
        currentProperties = data.map(property => ({
            id: property.id,  // ← Changed from property._id to property.id
            title: property.title || 'No title',
            price: property.price || 0,
            type: property.type || 'sale',
            location: property.location || 'Unknown',
            bedrooms: property.bedrooms ?? 0,
            bathrooms: property.bathrooms ?? 0,
            area: property.area ?? 0,
            propertyType: property.propertyType || 'house',
            description: property.description != null ? property.description : 'No description available',
            images: Array.isArray(property.images) && property.images.length > 0 
        ? property.images 
        : ['https://via.placeholder.com/400x300?text=No+Image'],
            image: (Array.isArray(property.images) && property.images.length > 0) 
                ? property.images[0] 
                : 'https://via.placeholder.com/400x300?text=No+Image',
            favorite: false,
            features: {
                bedrooms: property.bedrooms ?? "N/A",
                bathrooms: property.bathrooms ?? "N/A",
                area: property.area ? `${property.area} m²` : "N/A"
            }
        }));
       

       
        applySavedFavorites();
        hideLoading();
        renderProperties(currentProperties);
        


    } catch (err) {
        console.error("Error loading properties:", err);
        hideLoading();
        noResults.style.display = 'block';
    }
}


// 2. GLOBAL VARIABLES FOR CAROUSEL
// ===============================================
let currentImageIndex = 0;
let imageCarouselInterval = null;
let currentPropertyImages = [];

// ------------------- FILTERS -------------------
function updateFiltersFromInputs() {
    currentFilters.location = document.getElementById('location').value;
    currentFilters.propertyType = document.getElementById('propertyType').value;
    currentFilters.bedrooms = document.getElementById('bedrooms').value;
    currentFilters.minPrice = document.getElementById('minPrice').value;
    currentFilters.maxPrice = document.getElementById('maxPrice').value;
}

function applyFilters() {
    updateFiltersFromInputs();
    let filtered = [...currentProperties];

    if (currentFilters.type !== 'all') {
        filtered = filtered.filter(property => property.type === currentFilters.type);
    }
    if (currentFilters.location) {
        filtered = filtered.filter(property =>
            property.location.toLowerCase().includes(currentFilters.location.toLowerCase())
        );
    }
    if (currentFilters.propertyType) {
        filtered = filtered.filter(property => property.propertyType === currentFilters.propertyType);
    }
    if (currentFilters.bedrooms) {
        filtered = filtered.filter(property => property.bedrooms >= parseInt(currentFilters.bedrooms));
    }
    if (currentFilters.minPrice) {
        filtered = filtered.filter(property => property.price >= parseInt(currentFilters.minPrice));
    }
    if (currentFilters.maxPrice) {
        filtered = filtered.filter(property => property.price <= parseInt(currentFilters.maxPrice));
    }

    renderProperties(filtered);
}

function clearFilters() {
    document.getElementById('location').value = '';
    document.getElementById('propertyType').value = '';
    document.getElementById('bedrooms').value = '';
    document.getElementById('minPrice').value = '';
    document.getElementById('maxPrice').value = '';

    filterTabs.forEach(tab => tab.classList.remove('active'));
    filterTabs[0].classList.add('active');

    currentFilters = {
        type: 'all',
        location: '',
        propertyType: '',
        bedrooms: '',
        minPrice: '',
        maxPrice: ''
    };

    renderProperties(currentProperties);
}

// ------------------- PROPERTY CARD -------------------
function createPropertyCard(property) {
    const formattedPrice = formatPrice(property.price, property.type);
    const badgeClass = property.type === 'sale' ? 'badge-sale' : 'badge-rent';
    const badgeText = property.type === 'sale' ? 'For Sale' : 'For Rent';
    const favoriteClass = property.favorite ? 'active' : '';
     const phoneNumber ="250725502317";
   

    return `
        <div class="property-card" data-id="${property.id}">
            <div class="property-image">
                <img src="${property.image}" alt="${property.title}" onerror="this.src='https://via.placeholder.com/400x300?text=No+Image'">
                <div class="property-badge ${badgeClass}">${badgeText}</div>
                <button class="property-favorite ${favoriteClass}" data-id="${property.id}">
                    <i class="fas fa-heart"></i>
                </button>
            </div>
            <div class="property-content">
                <div class="property-price">${formattedPrice}</div>
                <h3 class="property-title">${property.title}</h3>
                <div class="property-location"><i class="fas fa-map-marker-alt"></i> ${property.location}</div>
                <div class="property-features">
                    <div class="feature"><i class="fas fa-bed"></i> <span>${property.features.bedrooms}</span></div>
                    <div class="feature"><i class="fas fa-bath"></i> <span>${property.features.bathrooms}</span></div>
                    <div class="feature"><i class="fas fa-ruler-combined"></i> <span>${property.features.area}</span></div>
                </div>
                <div class="property-actions">
                    <button class="btn btn-primary btn-sm view-details" data-id="${property.id}">
                        <i class="fas fa-eye"></i> View Details
                    </button>
                    <button class="btn btn-outline btn-sm contact-agent"  onclick="window.open('https://wa.me/${phoneNumber}', '_blank')">
                        <i class="fas fa-phone"></i> Contact
                    </button>
                </div>
            </div>
        </div>
    `;

}






document.addEventListener("click", function (e) {
    if (e.target.closest(".view-details")) {
        const propertyId = e.target.closest(".view-details").getAttribute("data-id");
        // redirect with property id
        window.location.href = `propertyDetails.html?id=${propertyId}`, "_blank";
    }
});



// ======= FAVORITES SYSTEM =======

// Load favorites from localStorage
let favorites = JSON.parse(localStorage.getItem('favorites')) || [];

// Apply favorites to currentProperties on load
function applySavedFavorites() {
    currentProperties.forEach(p => {
        p.favorite = favorites.includes(p.id.toString());
    });
}

// Save current favorites to localStorage
function saveFavorites() {
    localStorage.setItem('favorites', JSON.stringify(favorites));
}

// Toggle favorite state (UI + storage)
function toggleFavorite(propertyId) {
    const property = currentProperties.find(p => p.id.toString() === propertyId);
    if (property) {
        property.favorite = !property.favorite;

        if (property.favorite) {
            favorites.push(property.id.toString());
        } else {
            favorites = favorites.filter(id => id !== property.id.toString());
        }
        saveFavorites();
    }
}

// ======= CARD INTERACTIONS =======

function setupCardInteractions() {
    document.querySelectorAll('.property-favorite').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            toggleFavorite(this.dataset.id);
            this.classList.toggle('active');
        });
    });
}

// ======= FAVORITE INSIDE MODAL =======

function toggleModalFavorite(propertyId) {
    const property = currentProperties.find(p => p.id.toString() === propertyId);
    if (property) {
        property.favorite = !property.favorite;

        if (property.favorite) {
            favorites.push(property.id.toString());
        } else {
            favorites = favorites.filter(id => id !== property.id.toString());
        }
        saveFavorites();

        showPropertyDetails(propertyId);
        const favoriteBtn = document.querySelector(`.property-favorite[data-id="${propertyId}"]`);
        if (favoriteBtn) {
            favoriteBtn.classList.toggle('active', property.favorite);
        }
    }
}









// ------------------- PRICE FORMAT -------------------
function formatPrice(price, type) {
    const numPrice = Number(price) || 0;
    const formatted = new Intl.NumberFormat('RWF', {
        style: 'currency',
        currency: 'RWF',
        minimumFractionDigits: 0
    }).format(numPrice);
    return type === 'rent' ? `${formatted}/month` : formatted;
}



    // UPDATED: Replace alert with modal
    document.querySelectorAll('.view-details').forEach(btn => {
        btn.addEventListener('click', () => {
            showPropertyDetails(btn.dataset.id); // Use modal instead of alert
        });
    });

    document.querySelectorAll('.contact-agent').forEach(btn => {
        btn.addEventListener('click', () => {
            const property = currentProperties.find(p => p.id.toString() === btn.dataset.id);
            if (property) {
                alert(`Contacting agent for: ${property.title}`);
            }
        });
    });





// ------------------- LOADING STATES -------------------
function showLoading() {
    propertiesGrid.style.display = 'none';
    noResults.style.display = 'none';
    loadingState.style.display = 'flex';
}
function hideLoading() {
    loadingState.style.display = 'none';
}

// ------------------- SETUP -------------------
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    loadProperties();
});

function setupEventListeners() {
    filterTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            filterTabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            currentFilters.type = this.dataset.type;
            applyFilters();
        });
    });

    applyFiltersBtn.addEventListener('click', applyFilters);
    clearFiltersBtn.addEventListener('click', clearFilters);

    document.getElementById('location').addEventListener('change', updateFiltersFromInputs);
    document.getElementById('propertyType').addEventListener('change', updateFiltersFromInputs);
    document.getElementById('bedrooms').addEventListener('change', updateFiltersFromInputs);
    document.getElementById('minPrice').addEventListener('input', updateFiltersFromInputs);
    document.getElementById('maxPrice').addEventListener('input', updateFiltersFromInputs);
}

document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    loadProperties();
    
    // Modal event listeners
    window.onclick = function(event) {
        const modal = document.getElementById('propertyModal');
        if (event.target === modal) {
            closeModal();
        }
    }

    document.addEventListener('keydown', function(event) {
        const modal = document.getElementById('propertyModal');
        if (modal.style.display === 'block') {
            if (event.key === 'Escape') {
                closeModal();
            } else if (event.key === 'ArrowRight') {
                nextImage();
            } else if (event.key === 'ArrowLeft') {
                previousImage();
            } else if (event.key === ' ') { // Spacebar to pause/play
                event.preventDefault();
                toggleAutoPlay();
            }
        }
    });
});







// 4. IMAGE CAROUSEL FUNCTIONS
// ===============================================
function createImageCarousel(images) {
    if (!images || images.length === 0) {
        return `<img src="https://via.placeholder.com/800x300?text=No+Image" alt="No Image" class="property-image-modal">`;
    }

    if (images.length === 1) {
        return `<img src="${images[0]}" alt="Property Image" class="property-image-modal" onerror="this.src='https://via.placeholder.com/800x300?text=No+Image'">`;
    }

    return `
        <div class="image-carousel-container">
            <div class="image-carousel">
                ${images.map((img, index) => `
                    <img src="${img}" 
                         alt="Property Image ${index + 1}" 
                         class="carousel-image ${index === 0 ? 'active' : ''}" 
                         onerror="this.src='https://via.placeholder.com/800x300?text=No+Image'">
                `).join('')}
            </div>
            
            <!-- Navigation arrows -->
            <button class="carousel-btn carousel-prev" onclick="previousImage()">
                <i class="fas fa-chevron-left"></i>
            </button>
            <button class="carousel-btn carousel-next" onclick="nextImage()">
                <i class="fas fa-chevron-right"></i>
            </button>
            
            <!-- Image indicators -->
            <div class="carousel-indicators">
                ${images.map((_, index) => `
                    <button class="indicator ${index === 0 ? 'active' : ''}" 
                            onclick="goToImage(${index})"></button>
                `).join('')}
            </div>
            
            <!-- Image counter -->
            <div class="image-counter">
                <span id="currentImageNumber">1</span> / ${images.length}
            </div>
            
            <!-- Auto-play toggle -->
            <button class="carousel-play-pause" onclick="toggleAutoPlay()" title="Pause/Play slideshow">
                <i class="fas fa-pause" id="playPauseIcon"></i>
            </button>
        </div>
    `;
}



// Start image carousel
function startImageCarousel() {
    if (currentPropertyImages.length <= 1) return;
    
    // Clear any existing interval
    if (imageCarouselInterval) {
        clearInterval(imageCarouselInterval);
    }
    
    // Start new interval - change image every 3 seconds
    imageCarouselInterval = setInterval(() => {
        nextImage();
    }, 3000);
}

// Stop image carousel
function stopImageCarousel() {
    if (imageCarouselInterval) {
        clearInterval(imageCarouselInterval);
        imageCarouselInterval = null;
    }
}

// Go to next image
function nextImage() {
    if (currentPropertyImages.length <= 1) return;
    
    currentImageIndex = (currentImageIndex + 1) % currentPropertyImages.length;
    updateCarouselDisplay();
}

// Go to previous image
function previousImage() {
    if (currentPropertyImages.length <= 1) return;
    
    currentImageIndex = currentImageIndex === 0 
        ? currentPropertyImages.length - 1 
        : currentImageIndex - 1;
    updateCarouselDisplay();
}

// Go to specific image
function goToImage(index) {
    if (currentPropertyImages.length <= 1) return;
    
    currentImageIndex = index;
    updateCarouselDisplay();
}

// Update carousel display
function updateCarouselDisplay() {
    const images = document.querySelectorAll('.carousel-image');
    const indicators = document.querySelectorAll('.indicator');
    const counter = document.getElementById('currentImageNumber');
    
    // Update images
    images.forEach((img, index) => {
        img.classList.toggle('active', index === currentImageIndex);
    });
    
    // Update indicators
    indicators.forEach((indicator, index) => {
        indicator.classList.toggle('active', index === currentImageIndex);
    });
    
    // Update counter
    if (counter) {
        counter.textContent = currentImageIndex + 1;
    }
}

// Toggle auto-play
function toggleAutoPlay() {
    const playPauseIcon = document.getElementById('playPauseIcon');
    
    if (imageCarouselInterval) {
        stopImageCarousel();
        playPauseIcon.classList.remove('fa-pause');
        playPauseIcon.classList.add('fa-play');
    } else {
        startImageCarousel();
        playPauseIcon.classList.remove('fa-play');
        playPauseIcon.classList.add('fa-pause');
    }
}

// ===============================================
// 5. UPDATED SHOW/HIDE MODAL FUNCTIONS
// ===============================================
function showPropertyDetails(propertyId) {
    const property = currentProperties.find(p => p.id.toString() === propertyId.toString());
    if (property) {
        document.getElementById('modalContent').innerHTML = createModalContent(property);
        document.getElementById('propertyModal').style.display = 'block';
        document.body.style.overflow = 'hidden';
        
        // Start image carousel if there are multiple images
        if (property.images && property.images.length > 1) {
            startImageCarousel();
        }
    }
}




function closeModal() {
    document.getElementById('propertyModal').style.display = 'none';
    document.body.style.overflow = 'auto';
    
    // Stop image carousel when modal closes
    stopImageCarousel();
}






// PAGINATIONS



// Property Pagination System
class PropertyPagination {
    constructor() {
        this.currentPage = 1;
        this.itemsPerPage = 6;
        this.totalPages = 1;
        this.totalItems = 0;
        
        this.init();
    }

    init() {
        this.bindEvents();
        this.updatePagination();
    }

    bindEvents() {
        // Previous button
        document.getElementById('prevPage').addEventListener('click', () => {
            this.goToPage(this.currentPage - 1);
        });

        // Next button
        document.getElementById('nextPage').addEventListener('click', () => {
            this.goToPage(this.currentPage + 1);
        });

        // Number buttons - delegate event handling
        document.getElementById('pagination').addEventListener('click', (e) => {
            if (e.target.tagName === 'BUTTON' && 
                !e.target.id.includes('Page') && 
                !isNaN(parseInt(e.target.textContent))) {
                const pageNum = parseInt(e.target.textContent);
                this.goToPage(pageNum);
            }
        });
    }

    // Count property cards on current page
    countPropertyCards() {
        return document.querySelectorAll('.property-card').length;
    }

    // Calculate total pages based on property cards
    calculateTotalPages() {
        const totalCards = this.countPropertyCards();
        this.totalItems = totalCards;
        this.totalPages = Math.ceil(totalCards / this.itemsPerPage);
        return this.totalPages;
    }

    // Show/hide property cards based on current page
    displayCardsForPage(page) {
        const cards = document.querySelectorAll('.property-card');
        const startIndex = (page - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;

        cards.forEach((card, index) => {
            if (index >= startIndex && index < endIndex) {
                card.style.display = 'block';
            } else {
                card.style.display = 'none';
            }
        });
    }

    // Go to specific page
    goToPage(pageNumber) {
        if (pageNumber < 1 || pageNumber > this.totalPages) {
            return;
        }

        this.currentPage = pageNumber;
        this.displayCardsForPage(pageNumber);
        this.updatePaginationUI();
        
        // Scroll to top of property section
        this.scrollToProperties();
    }

    // Update pagination UI
    updatePaginationUI() {
        const pagination = document.getElementById('pagination');
        const prevBtn = document.getElementById('prevPage');
        const nextBtn = document.getElementById('nextPage');

        // Update prev/next buttons
        prevBtn.disabled = this.currentPage === 1;
        nextBtn.disabled = this.currentPage === this.totalPages;

        // Remove existing number buttons (keep prev/next)
        const numberButtons = pagination.querySelectorAll('button:not(#prevPage):not(#nextPage)');
        numberButtons.forEach(btn => btn.remove());

        // Add new number buttons
        this.createNumberButtons();
    }

    // Create number buttons dynamically
    createNumberButtons() {
        const pagination = document.getElementById('pagination');
        const nextBtn = document.getElementById('nextPage');
        
        // Calculate which page numbers to show
        const pagesToShow = this.getPageNumbersToShow();
        
        pagesToShow.forEach(pageNum => {
            if (pageNum === '...') {
                // Add ellipsis
                const ellipsis = document.createElement('span');
                ellipsis.textContent = '...';
                ellipsis.className = 'pagination-ellipsis';
                pagination.insertBefore(ellipsis, nextBtn);
            } else {
                // Add number button
                const button = document.createElement('button');
                button.textContent = pageNum;
                button.className = pageNum === this.currentPage ? 'active' : '';
                pagination.insertBefore(button, nextBtn);
            }
        });
    }

    // Determine which page numbers to display
    getPageNumbersToShow() {
        const pages = [];
        const totalPages = this.totalPages;
        const current = this.currentPage;

        if (totalPages <= 5) {
            // Show all pages if 5 or fewer
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i);
            }
        } else {
            // Complex logic for many pages
            if (current <= 3) {
                pages.push(1, 2, 3, 4, '...', totalPages);
            } else if (current >= totalPages - 2) {
                pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
            } else {
                pages.push(1, '...', current - 1, current, current + 1, '...', totalPages);
            }
        }

        return pages;
    }

    // Main update function - call this when properties load
    updatePagination() {
        this.calculateTotalPages();
        
        if (this.totalItems <= this.itemsPerPage) {
            // Hide pagination if 6 or fewer items
            document.getElementById('pagination').style.display = 'none';
            return;
        }

        // Show pagination
        document.getElementById('pagination').style.display = 'flex';
        
        // Auto-paginate if more than 6 cards
        this.displayCardsForPage(this.currentPage);
        this.updatePaginationUI();
    }

    // Scroll to properties section smoothly
    scrollToProperties() {
        const propertiesSection = document.querySelector('.properties-section') || 
                                document.querySelector('#properties') || 
                                document.querySelector('.property-card').parentElement;
        
        if (propertiesSection) {
            propertiesSection.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'start' 
            });
        }
    }

    // Public method to refresh pagination (call after loading new properties)
    refresh() {
        this.updatePagination();
    }

    // Public method to get current pagination info (useful for API calls)
    getPaginationInfo() {
        return {
            currentPage: this.currentPage,
            totalPages: this.totalPages,
            totalItems: this.totalItems,
            itemsPerPage: this.itemsPerPage,
            hasNext: this.currentPage < this.totalPages,
            hasPrev: this.currentPage > 1
        };
    }
}

// Initialize pagination system
let propertyPagination;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    propertyPagination = new PropertyPagination();
    
    // Also try after a short delay to ensure all content is loaded
    setTimeout(() => {
        if (propertyPagination) {
            propertyPagination.refresh();
        }
    }, 500);
});

// Also try when window is fully loaded
window.addEventListener('load', () => {
    if (propertyPagination) {
        propertyPagination.refresh();
    }
});

// Helper function to call after loading new properties
function refreshPagination() {
    if (propertyPagination) {
        propertyPagination.refresh();
    }
}

// Example usage after fetching properties from API:
/*
fetch('/api/properties')
    .then(response => response.json())
    .then(data => {
        // Render property cards
        renderPropertyCards(data.properties);
        
        // Refresh pagination
        refreshPagination();
    });
*/