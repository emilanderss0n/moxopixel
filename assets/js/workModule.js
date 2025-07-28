/**
 * Work Module - Handles all work-related functionality
 * 
 * This module consolidates functionality from workDetails.js and workClickHandler.js
 * to simplify maintenance and reduce code duplication.
 */

import { ImageLoader } from './Utils/imageLoader.js';
import { fetchGitHubReadme } from './github.js';
import { ensureRouterIsInitialized } from './main.js';
import { animateSimpleText } from './External/simple-animator.js';
import { workTransitionAnimator } from './Utils/workTransitionAnimator.js';

// Animation handling
let animateText = animateSimpleText; // Default fallback

// Try to import the advanced text animator
try {
    import('./External/text-animator.js').then(module => {
        animateText = module.animateText;
    }).catch(error => {
        console.warn('Using simple text animator due to error:', error);
    });
} catch (error) {
    console.warn('Using simple text animator due to error:', error);
}

// State management
const state = {
    animationTimeout: null,
    cardRef: null,
    imageRef: null,
    titleRef: null
};

/**
 * Helper function to safely get the router instance
 * @returns {Object} The router instance
 */
function getRouter() {
    return window.router || ensureRouterIsInitialized();
}

/**
 * Create a back button with event handler
 * @param {Function} clickHandler - The function to call when clicked
 * @returns {HTMLElement} The back button element
 */
function createBackButton(clickHandler) {
    const backLink = document.createElement('a');
    const icon = document.createElement('i');
    
    icon.className = 'bi bi-chevron-left';
    backLink.appendChild(icon);
    backLink.appendChild(document.createTextNode(" Go Back"));
    
    backLink.href = "#";
    backLink.className = 'work-back-btn btn';
    backLink.setAttribute('aria-label', 'Go Back to Work List');
    backLink.style.position = 'relative';
    backLink.style.zIndex = '1000';
    backLink.setAttribute('role', 'button');
    backLink.onclick = clickHandler;
    
    return backLink;
}

/**
 * Handle the back button click
 * @param {Event} event - The click event
 * @param {HTMLElement} linksDiv - The links container element
 * @param {HTMLElement} titleElement - The title element
 * @param {HTMLElement} workDetails - The work details element
 */
function handleBackClick(event, linksDiv, titleElement, workDetails) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }

    const baseUrl = window.location.pathname.includes('/moxo') ? '/moxo/' : '/';
    history.pushState(null, '', baseUrl);

    // Find the current card for animation target
    const currentCardId = workDetails.dataset.currentCardId;
    const targetCard = currentCardId ? document.querySelector(`[data-class="${currentCardId}"]`) : null;

    // Start reverse animation
    workTransitionAnimator.animateToListing(workDetails, targetCard).then(() => {
        if (linksDiv) {
            linksDiv.style.display = 'grid';
        }
        
        workDetails.style.display = 'none';
        titleElement.innerHTML = `<span class="default-title">Modding Work</span>`;
        titleElement.classList.remove('back-link');

        const router = getRouter();
        router.navigateTo('work', {}, false);
        document.title = 'MOXOPIXEL // Game Art';

        // Clear any animation timeouts
        if (state.animationTimeout) {
            clearTimeout(state.animationTimeout);
            state.animationTimeout = null;
        }

        // Trigger entrance animation for work listing
        setTimeout(() => {
            workTransitionAnimator.animateListingEntrance();
        }, 100);
    });
}

/**
 * Create HTML for work details
 * @param {Object} params - Work item parameters
 * @returns {string} HTML string for work details
 */
function createWorkDetailsHTML(params) {
    const { 
        workTitle, 
        githubUrl, 
        websiteUrl, 
        contentSource, 
        content,
        codingLanguages,
        softwareUsed,
        workCategoryOne, 
        workCategoryTwo,
        useGithubReadme
    } = params;

    // Process coding languages and software used if they exist
    const languageTags = codingLanguages ? 
        JSON.parse(codingLanguages).map(lang => `<span class="tag-sm ${lang.toLowerCase()}">${lang}</span>`).join('') : 
        '';
    
    const softwareTags = softwareUsed ? 
        JSON.parse(softwareUsed).map(soft => `<span class="tag-sm ${soft.toLowerCase()}">${soft}</span>`).join('') : 
        '';

    return `
        <div class="work-header">
            <div class="work-title">
                <h3 class="hover-effect hover-effect-cursor-square">${workTitle}</h3>
            </div>
            <div class="work-more">
                ${githubUrl ? `<a class="btn btn-outline-secondary me-2" href="${githubUrl}" target="_blank">
                    <i class="bi bi-github"></i>
                </a>` : ''}
                ${websiteUrl && websiteUrl !== 'undefined' ? `<a class="btn btn-outline-info" href="${websiteUrl}" target="_blank">
                    <i class="bi bi-box-arrow-up-right"></i>
                </a>` : ''}
            </div>
        </div>
        <div class="work-content">
            <div class="featured-image-container"></div>
            <div class="work-desc">
                ${contentSource || ''}
                <div class="work-description-content ${useGithubReadme ? 'github-readme' : ''}">
                    ${content}
                </div>
                ${(languageTags || softwareTags) ? `
                <table class="work-meta-content">
                    ${languageTags ? `
                    <tr>
                        <td class="label">Coding Languages</td>
                        <td class="content"><div class="cont">${languageTags}</div></td>
                    </tr>` : ''}
                    ${softwareTags ? `
                    <tr>
                        <td class="label">Software Used</td>
                        <td class="content"><div class="cont">${softwareTags}</div></td>
                    </tr>` : ''}
                </table>` : ''}
                <div class="work-categories">
                    ${workCategoryOne ? `<div class="tag">${workCategoryOne}</div>` : ''}
                    ${workCategoryTwo ? `<div class="tag">${workCategoryTwo}</div>` : ''}
                </div>
            </div>
        </div>
    `;
}

/**
 * Load work details content
 * @param {Object} params - Parameters for loading work details
 * @returns {Promise<void>}
 */
async function loadWorkDetails(params) {
    const { 
        card, 
        id,
        dataClass,
        linksDiv, 
        titleElement, 
        workDetails, 
        workTitle,
        workImage,
        sliderImagesData,
        githubUrl,
        websiteUrl,
        useGithubReadme,
        workCategoryOne,
        workCategoryTwo,
        codingLanguages,
        softwareUsed
    } = params;

    const baseUrl = window.location.pathname.includes('/moxo') ? '/moxo' : '';
    const imageLoader = new ImageLoader();

    try {
        // Pre-fetch content based on useGithubReadme flag
        let content;
        let contentSource = '';
        
        if (useGithubReadme && githubUrl) {
            try {
                content = await fetchGitHubReadme(githubUrl);
                contentSource = `<div class="content-source">
                    <small><i class="bi bi-github"></i> Content from GitHub README</small>
                </div>`;
            } catch (error) {
                console.warn('❌ Failed to fetch GitHub README, falling back to HTML file:', error);
                const response = await fetch(`${baseUrl}/data/${dataClass}.html`);
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                content = await response.text();
            }
        } else {
            const response = await fetch(`${baseUrl}/data/${dataClass}.html`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            content = await response.text();
        }

        // Create back button
        const backLink = createBackButton((event) => {
            handleBackClick(event, linksDiv, titleElement, workDetails);
        });

        // Update display states
        if (linksDiv) {
            linksDiv.style.display = 'none';
        }
        
        // Store current card ID for back animation
        workDetails.dataset.currentCardId = dataClass;
        
        titleElement.innerHTML = '';
        titleElement.appendChild(backLink);
        titleElement.classList.add('back-link');
        
        // Create HTML structure
        const tempContainer = document.createElement('div');
        tempContainer.className = 'work-item';
        
        // Render work details HTML
        tempContainer.innerHTML = createWorkDetailsHTML({
            workTitle,
            githubUrl,
            websiteUrl,
            contentSource,
            content,
            codingLanguages,
            softwareUsed,
            workCategoryOne,
            workCategoryTwo,
            useGithubReadme
        });
        
        // Update DOM
        workDetails.innerHTML = '';
        workDetails.appendChild(tempContainer);
        workDetails.style.display = 'block';

        // Animate the title
        const workTitleElement = tempContainer.querySelector('.work-title h3');
        if (workTitleElement && typeof animateText === 'function') {
            animateText(workTitleElement);
        }

        // Load the featured image or YouTube embed
        const featuredImageContainer = tempContainer.querySelector('.featured-image-container');
        
        // Parse slider images data to check for YouTube content
        let sliderImages = [];
        try {
            sliderImages = JSON.parse(sliderImagesData || '[]');
        } catch (e) {
            console.warn('Failed to parse slider images data:', e);
        }
        
        // Get the first slider image
        const firstSliderImage = sliderImages[0];
        
        if (firstSliderImage && firstSliderImage.youtube && !firstSliderImage.image) {
            // Show YouTube embed
            const embedUrl = getYouTubeEmbedUrl(firstSliderImage.youtube);
            const iframe = document.createElement('iframe');
            iframe.className = 'work-featured-video';
            iframe.src = embedUrl;
            iframe.width = '100%';
            iframe.height = '400';
            iframe.frameBorder = '0';
            iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
            iframe.allowFullscreen = true;
            iframe.title = workTitle;
            
            featuredImageContainer.appendChild(iframe);
        } else if (workImage && workImage !== 'null') {
            // Show regular image
            const featuredImage = document.createElement('img');
            featuredImage.className = 'work-featured-image';
            featuredImage.alt = workTitle;
            featuredImage.dataset.originalSrc = workImage; // For debugging
            
            featuredImageContainer.appendChild(featuredImage);

            try {
                const imagePath = `${baseUrl}/assets/img/work_images/${workImage}`;
                await imageLoader.loadImageWithLoader(
                    featuredImageContainer,
                    featuredImage,
                    imagePath
                );
            } catch (error) {
                // Fallback if image loading fails
                console.warn('Image loader failed, using direct approach:', error);
                featuredImage.src = `${baseUrl}/assets/img/work_images/${workImage}`;
            }
        }

        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });

        // Update URL for bookmarking/sharing
        const slug = workTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        const newUrl = `${baseUrl}/work/${slug}`;
        history.pushState({ page: 'work-details', id, title: workTitle, dataClass }, '', newUrl);
        document.title = `MOXOPIXEL // ${workTitle}`;

    } catch (error) {
        console.error('Error loading content:', error);
        imageLoader.cleanup();

        // Navigate back to work list if there's an error
        const router = getRouter();
        router.navigateTo('work');
    }
}

/**
 * Convert YouTube URL to embed URL
 * @param {string} youtubeUrl - The YouTube watch URL
 * @returns {string} The embed URL
 */
function getYouTubeEmbedUrl(youtubeUrl) {
    // Handle different YouTube URL formats
    let videoId;
    
    if (youtubeUrl.includes('youtube.com/watch?v=')) {
        videoId = youtubeUrl.split('youtube.com/watch?v=')[1].split('&')[0];
    } else if (youtubeUrl.includes('youtu.be/')) {
        videoId = youtubeUrl.split('youtu.be/')[1].split('?')[0];
    } else if (youtubeUrl.includes('youtube.com/embed/')) {
        return youtubeUrl; // Already an embed URL
    } else {
        console.warn('Unsupported YouTube URL format:', youtubeUrl);
        return youtubeUrl;
    }
    
    // Add quality parameters to request highest quality (1080p)
    const qualityParams = new URLSearchParams({
        'vq': 'hd1080',      // Request 1080p quality
        'hd': '1',           // Enable HD
        'rel': '0',          // Don't show related videos from other channels
        'modestbranding': '1' // Reduce YouTube branding
    });
    
    return `https://www.youtube.com/embed/${videoId}?${qualityParams.toString()}`;
}

/**
 * Handle work item click event
 * @param {HTMLElement} card - The clicked card element
 * @param {HTMLElement} linksDiv - The links container element
 * @param {HTMLElement} titleElement - The title element
 * @param {HTMLElement} workDetails - The work details element
 */
export function handleWorkClick(card, linksDiv, titleElement, workDetails) {
    // Clear any existing animation timeouts
    if (state.animationTimeout) {
        clearTimeout(state.animationTimeout);
    }

    // Extract card data attributes
    const dataClass = card.getAttribute('data-class');
    const id = dataClass ? dataClass.replace('desc_', '') : '';
    const websiteUrl = card.getAttribute('data-web');
    const workTitle = card.getAttribute('data-title');
    const workImage = card.getAttribute('data-slider_img');
    const sliderImagesData = card.getAttribute('data-slider_images');
    const workCategoryOne = card.getAttribute('data-category_one');
    const workCategoryTwo = card.getAttribute('data-category_two');
    const githubUrl = card.getAttribute('data-github');
    const codingLanguages = card.getAttribute('data-coding_languages');
    const softwareUsed = card.getAttribute('data-software_used');

    const useGithubReadme = card.dataset.useGithubReadme === 'true';

    if (!dataClass) return;

    // Start the transition animation
    workTransitionAnimator.animateToDetail(card, workDetails).then(() => {
        // Load work details with all parameters
        loadWorkDetails({
            card,
            id,
            dataClass,
            linksDiv,
            titleElement,
            workDetails,
            workTitle,
            workImage,
            sliderImagesData,
            githubUrl,
            websiteUrl,
            useGithubReadme,
            workCategoryOne,
            workCategoryTwo,
            codingLanguages,
            softwareUsed
        });
    });
}

/**
 * Initialize work click handlers for multiple cards
 * @param {NodeList|Array} cards - Collection of card elements
 * @param {HTMLElement} linksDiv - The links container element
 * @param {HTMLElement} titleElement - The title element
 * @param {HTMLElement} workDetails - The work details element
 */
export function initWorkHandlers(cards, linksDiv, titleElement, workDetails) {
    if (!cards || cards.length === 0) {
        console.warn('No cards provided to initWorkHandlers');
        return;
    }
    
    // Simple approach: remove any existing listeners and attach new ones
    for (const card of cards) {
        // Add a data attribute to indicate this card has been initialized
        if (card.getAttribute('data-initialized') === 'true') {
            continue;
        }
        
        card.setAttribute('data-initialized', 'true');
        card.addEventListener('click', () => handleWorkClick(card, linksDiv, titleElement, workDetails));
    }
}

// Export legacy function names for backward compatibility
export const initWorkDetails = initWorkHandlers;
export const initWorkClickHandler = initWorkHandlers;
