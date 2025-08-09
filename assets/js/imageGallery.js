import { animateText, animateTitleElement } from './External/text-animator.js';
import { createFocusTrap } from './Utils/utils.js';

let currentPage = 1;
let totalPages = 1;

export function initializeImageGallery() {

    Fancybox.bind("[data-fancybox]", {
    // Your custom options
    });

}

export function getCurrentPage() {
    return currentPage;
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
