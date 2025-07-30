import { ImageLoader } from './Utils/imageLoader.js';
import { fetchGitHubReadme } from './github.js';
import { ensureRouterIsInitialized } from './main.js';
import { fetchAndDisplayWorkItems } from './initWorks.js';
import { animateText } from './External/text-animator.js';

// Try to import the main text-animator, but fall back if it fails
let animateText;

// Add this helper function to get router safely
function getRouter() {
    return window.router || ensureRouterIsInitialized();
}

// Store references to current view elements for back navigation
let currentAnimationTimeout = null;

export function handleWorkClick(card, linksDiv, titleElement, workDetails) {
    if (currentAnimationTimeout) {
        clearTimeout(currentAnimationTimeout);
    }

    const dataClass = card.getAttribute('data-class');
    const id = dataClass.replace('desc_', '');
    const websiteUrl = card.getAttribute('data-web');
    const workTitle = card.getAttribute('data-title');
    const workImage = card.getAttribute('data-slider_img');
    const sliderImagesData = card.getAttribute('data-slider_images');
    const workCategoryOne = card.getAttribute('data-category_one');
    const workCategoryTwo = card.getAttribute('data-category_two');
    const githubLink = card.getAttribute('data-github');
    const useGithubReadme = card.dataset.useGithubReadme === 'true';
    const codingLanguages = card.getAttribute('data-coding_languages');
    const softwareUsed = card.getAttribute('data-software_used');
    const imageLoader = new ImageLoader();

    if (!dataClass) return;

    const baseUrl = window.location.pathname.includes('/moxo')
        ? '/moxo'  // Local development
        : '';      // Production

    // First, add the clicked state to the card to trigger animations
    const cardTitle = card.querySelector('.card-title');

    // Remove clicked state from all cards first
    document.querySelectorAll('.card-bfx').forEach(c => {
        c.classList.remove('clicked');
        c.style.opacity = '';
        c.style.pointerEvents = '';
    });

    // Add clicked state to trigger hover animations
    card.classList.add('clicked');

    // Wait for 2 seconds before proceeding with transition
    currentAnimationTimeout = setTimeout(() => {

        // Simplify handleBackClick
        const handleBackClick = (event) => {
            if (event) {
                event.preventDefault();
                event.stopPropagation();
            }

            const baseUrl = window.location.pathname.includes('/moxo') ? '/moxo/' : '/';
            history.pushState(null, '', baseUrl);

            if (linksDiv) {
                linksDiv.style.display = 'grid';
            }
            workDetails.style.display = 'none';
            titleElement.innerHTML = `<span class="default-title">Modding Work</span>`;
            titleElement.classList.remove('back-link');

            const router = getRouter();
            router.navigateTo('work', {}, false);
            document.title = 'MOXOPIXEL // Game Art';

            fetchAndDisplayWorkItems();

            document.querySelectorAll('.card-bfx').forEach(c => {
                c.classList.remove('clicked');
                c.style.opacity = '';
                c.style.pointerEvents = '';
            });
        };

        // Update the loadWorkDetails function to fix image handling
        const loadWorkDetails = async () => {
            try {
                // Move all variable declarations to the top of the function
                const backLink = document.createElement('a');
                const icon = document.createElement('i');
                const tempContainer = document.createElement('div');

                // Pre-fetch content based on useGithubReadme flag
                let data;
                let contentSource = '';
                
                if (useGithubReadme && githubLink) {
                    try {
                        data = await fetchGitHubReadme(githubLink);
                        contentSource = `<div class="content-source">
                            <small><i class="bi bi-github"></i> Content from GitHub README</small>
                        </div>`;
                    } catch (error) {
                        console.warn('Failed to fetch GitHub README, falling back to HTML file:', error);
                        const response = await fetch(`${baseUrl}/data/${dataClass}.html`);
                        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                        data = await response.text();
                    }
                } else {
                    const response = await fetch(`${baseUrl}/data/${dataClass}.html`);
                    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                    data = await response.text();
                }

                // Set up back button
                backLink.href = "#";
                backLink.className = 'work-back-btn btn';
                backLink.setAttribute('aria-label', 'Go Back to Work List');
                backLink.style.position = 'relative';
                backLink.style.zIndex = '1000';
                backLink.setAttribute('role', 'button');
                icon.className = 'bi bi-chevron-left';
                backLink.appendChild(icon);
                backLink.appendChild(document.createTextNode(" Go Back"));

                // Update display states
                if (linksDiv) {
                    linksDiv.style.display = 'none';
                }
                titleElement.innerHTML = '';
                titleElement.appendChild(backLink);
                titleElement.classList.add('back-link');
                tempContainer.className = 'work-item';
                
                // Create the HTML structure - assign it to a variable
                const workItemHTML = `
                    <div class="work-header">
                        <div class="work-title">
                            <h3 class="hover-effect hover-effect-cursor-square">${workTitle}</h3>
                        </div>
                        <div class="work-more">
                            ${githubLink ? `<a class="btn btn-outline-secondary me-2" href="${githubLink}" target="_blank">
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
                            ${contentSource}
                            <div class="work-description-content${useGithubReadme ? ' github-readme' : ''}">
                                ${data}
                            </div>
                            <table class="work-meta-content">
                                <tr>
                                    <td class="label">Coding Languages</td>
                                    <td class="content"><div class="cont">${codingLanguages ? JSON.parse(codingLanguages).map(lang => `<span class="tag-sm ${lang.toLowerCase()}">${lang}</span>`).join('') : ''}</div></td>
                                </tr>
                                <tr>
                                    <td class="label">Software Used</td>
                                    <td class="content"><div class="cont">${softwareUsed ? JSON.parse(softwareUsed).map(soft => `<span class="tag-sm ${soft.toLowerCase()}">${soft}</span>`).join('') : ''}</div></td>
                                </tr>
                            </table>
                            <div class="work-categories">
                                <div class="tag">${workCategoryOne}</div><div class="tag">${workCategoryTwo}</div>
                            </div>
                        </div>
                    </div>
                `;

                // Update DOM with explicit display settings
                tempContainer.innerHTML = workItemHTML;
                workDetails.innerHTML = '';
                workDetails.appendChild(tempContainer);

                // Explicitly show work details and set proper styles
                workDetails.style.display = 'block';

                // Animate the title immediately
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

                    // Add data attribute with original image source for debugging
                    featuredImage.dataset.originalSrc = workImage;

                    // Add error handler before appending
                    featuredImage.onerror = () => {
                        // Try a different approach with the full path
                        const fullPath = `${baseUrl}/assets/img/work_images/${workImage}`;
                        featuredImage.src = fullPath;
                    };

                    featuredImageContainer.appendChild(featuredImage);

                    try {
                        const imagePath = `${baseUrl}/assets/img/work_images/${workImage}`;
                        await imageLoader.loadImageWithLoader(
                            featuredImageContainer,
                            featuredImage,
                            imagePath
                        );
                    } catch (error) {
                        // Try once more with direct approach
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

                // Ensure the click event is handled properly with direct onclick
                backLink.onclick = handleBackClick;
            } catch (error) {
                console.error('Error loading content:', error);
                imageLoader.cleanup();

                // Get router safely
                const router = getRouter();
                router.navigateTo('work');
            }
        };

        loadWorkDetails();

    }, 1000);
}

// Improve the initialization to avoid duplicates
export function initWorkClickHandler(cards, linksDiv, titleElement, workDetails) {
    for (const card of cards) {
        // Remove any previous click handler
        card.removeEventListener('click', card._workClickHandler);
        // Create and store the handler so it can be removed later
        card._workClickHandler = () => handleWorkClick(card, linksDiv, titleElement, workDetails);
        card.addEventListener('click', card._workClickHandler);
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