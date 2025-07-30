import { animateText, animateTitleElement } from './External/text-animator.js';

let currentPage = 1;
let totalPages = 1;

export function initializeImageGallery() {
    // First, detach any existing zoom instances to prevent duplicates
    const existingZoomImages = document.querySelectorAll('.medium-zoom-image');
    existingZoomImages.forEach(img => {
        img.classList.remove('medium-zoom-image');
        img.style.transform = '';
    });
    
    const zoom = window.mediumZoom('.thumbnail:not(.medium-zoom-image)', {
        background: 'rgba(0, 0, 0, 0.9)',
        margin: 40,
        scrollOffset: 0,
    });
    
    // Add swipe support for mobile devices
    setupSwipeNavigation();

    // Handle zoom-specific events
    const handleZoomKeyPress = (e) => {
        if (e.key === 'Escape') {
            zoom.close();
        }
    };
    
    // Global keyboard navigation that works regardless of zoom state
    const handleGlobalKeyPress = (e) => {
        // Only process keyboard navigation when gallery is visible
        const imageContainer = document.getElementById('imageContainer');
        const galleryVisible = imageContainer && window.getComputedStyle(imageContainer).display !== 'none';
        
        if (galleryVisible) {
            if (e.key === 'ArrowLeft') {
                navigateToPage(currentPage - 1);
            } else if (e.key === 'ArrowRight') {
                navigateToPage(currentPage + 1);
            }
        }
    };
    
    // Add the global keyboard navigation
    document.addEventListener('keyup', handleGlobalKeyPress);

    zoom.on('open', () => {
        document.body.style.overflow = 'hidden';
        document.addEventListener('keyup', handleZoomKeyPress);
    });

    zoom.on('closed', () => {
        document.body.style.overflow = '';
        document.removeEventListener('keyup', handleZoomKeyPress);
    });

    // Clean up function
    return function cleanup() {
        document.removeEventListener('keyup', handleZoomKeyPress);
        document.removeEventListener('keyup', handleGlobalKeyPress);
        zoom.detach();
        removePaginationControls();
    };
}

export function updatePaginationState(page, total) {
    currentPage = page;
    totalPages = total;
    updatePaginationControls();
}

function navigateToPage(page) {
    if (page >= 1 && page <= totalPages) {
        const baseUrl = window.location.pathname.includes('/moxo') ? '/moxo' : '';
        const event = new CustomEvent('gallery-page-change', { detail: { page } });
        window.dispatchEvent(event);
    }
}

function updatePaginationControls() {
    removePaginationControls();

    const imageContainer = document.getElementById('imageContainer');
    // Create top pagination
    const topPaginationContainer = createPaginationControl('top');
    // Add to top of container, before the body
    const imageBody = imageContainer.querySelector('.body');
    imageContainer.insertBefore(topPaginationContainer, imageBody);
    // Animate top pagination info only (not the whole container)
    const topInfo = topPaginationContainer.querySelector('.pagination-info');
    if (topInfo) animateTitleElement(topInfo);

    // Create bottom pagination
    const bottomPaginationContainer = createPaginationControl('bottom');
    imageContainer.appendChild(bottomPaginationContainer);
    // Animate bottom pagination info only (not the whole container)
    const bottomInfo = bottomPaginationContainer.querySelector('.pagination-info');
    if (bottomInfo) animateTitleElement(bottomInfo);
}

function createPaginationControl(position) {
    const paginationContainer = document.createElement('div');
    paginationContainer.className = `pagination-controls animate-in pagination-${position}`;
    
    // Previous button
    const prevButton = document.createElement('button');
    prevButton.textContent = '← Previous';
    prevButton.disabled = currentPage === 1;
    prevButton.className = 'pagination-button';
    prevButton.onclick = () => navigateToPage(currentPage - 1);

    // Page info
    const pageInfo = document.createElement('span');
    pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
    pageInfo.className = 'pagination-info hover-effect hover-effect-cursor-square';

    // Next button
    const nextButton = document.createElement('button');
    nextButton.textContent = 'Next →';
    nextButton.disabled = currentPage === totalPages;
    nextButton.className = 'pagination-button';
    nextButton.onclick = () => navigateToPage(currentPage + 1);

    paginationContainer.appendChild(prevButton);
    paginationContainer.appendChild(pageInfo);
    paginationContainer.appendChild(nextButton);
    
    return paginationContainer;
}

function removePaginationControls() {
    // Remove all pagination controls
    const existingPaginations = document.querySelectorAll('.pagination-controls');
    existingPaginations.forEach(pagination => {
        pagination.remove();
    });
}

// Add swipe gesture support for mobile devices
function setupSwipeNavigation() {
    const imageContainer = document.getElementById('imageContainer');
    if (!imageContainer) return;
    
    let touchStartX = 0;
    let touchEndX = 0;
    
    imageContainer.addEventListener('touchstart', e => {
        touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });
    
    imageContainer.addEventListener('touchend', e => {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
    }, { passive: true });
    
    function handleSwipe() {
        const swipeThreshold = 75; // minimum swipe distance
        
        // Left swipe (next page)
        if (touchEndX < touchStartX - swipeThreshold) {
            navigateToPage(currentPage + 1);
        }
        
        // Right swipe (previous page)
        if (touchEndX > touchStartX + swipeThreshold) {
            navigateToPage(currentPage - 1);
        }
    }
}

// Listen for gallery page changes to replay animate-in on #imageContent
window.addEventListener('gallery-page-change', () => {
    const imageContent = document.getElementById('imageContent');
    if (imageContent) {
        imageContent.classList.remove('animate-in');
        // Force reflow to restart animation
        void imageContent.offsetWidth;
        imageContent.classList.add('animate-in');
    }
});
