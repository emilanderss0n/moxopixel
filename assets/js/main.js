import { fetchData } from './cache.js';
import { fetchAndDisplayWorkItems } from './initWorks.js';
import { initializeImageGallery, updatePaginationState } from './imageGallery.js';
import { ImageLoader } from './Utils/imageLoader.js';
import { Router } from './router.js';
import { handleWorkClick } from './workModule.js'; // Updated to use unified module
import { fetchGitHubData, preloadGitHubData } from './github.js';
import { animateText, animateTitleElement } from './External/text-animator.js';
import { setupAboutPreloading } from './about.js';
import { scheduleIdleTask } from './Utils/utils.js';

let router;
let workItemsLoaded = false; // Add a flag to track if work items have been loaded

// Store common DOM elements globally to avoid repeated queries
let mainContainer, imageContainer, workDetails, linksDiv, titleElement;

document.addEventListener('DOMContentLoaded', () => {
    const baseUrl = window.location.hostname.includes('localhost') ? '/moxo' : '';

    // Initialize DOM element references once
    linksDiv = document.querySelector('.links');
    titleElement = document.querySelector('.main-title');
    workDetails = document.querySelector('.work-details');
    const githubComponent = document.querySelector('.github-component');
    const imageGalleryTrigger = document.querySelector('.image-gallery-trigger');
    const aboutTrigger = document.querySelector('.about-trigger');
    imageContainer = document.getElementById('imageContainer');
    mainContainer = document.getElementById('mainContentInner');
    const loadingContainer = document.getElementById('loadingContainer');
    const imageLoader = new ImageLoader();
    const homeTrigger = document.querySelector('.home-trigger');
    const aboutContainer = document.getElementById('aboutContent');
    const navItem = document.querySelector('.nav-item');
    const navLinks = document.querySelectorAll('.nav-link');
    const navCheckbox = document.getElementById('nav-checkbox');

    const lenis = new Lenis({
        autoRaf: true,
    });

    // Initialize the router
    router = new Router(baseUrl);

    // Make router globally available through window object
    window.router = router;

    // Make handleWorkClick globally available
    window.handleWorkClick = handleWorkClick;

    (async () => {
        if (!workItemsLoaded) { // Only load work items once
            await fetchAndDisplayWorkItems(baseUrl, linksDiv, titleElement, workDetails);
            workItemsLoaded = true;
        }

        const path = router.getPathFromUrl();
        const params = router.getParamsFromPath(path);
        router.handleRoute(path, params);
    })();

    // Helper function to hide all containers
    function hideAllContainers() {
        mainContainer.style.display = 'none';
        imageContainer.style.display = 'none';
        aboutContainer.style.display = 'none';
        if (workDetails) {
            workDetails.style.display = 'none';
        }
    }
    
    // Define routes without view transitions
    router.addRoute('work', () => {
        // Check if coming from work details BEFORE hiding containers
        const comingFromWorkDetails = workDetails && workDetails.style.display !== 'none';
        
        // Immediate cleanup of any morphed cards stuck on screen
        const morphedCards = document.querySelectorAll('.card-bfx[style*="position: fixed"]');
        morphedCards.forEach(card => {
            card.removeAttribute('style');
            card.style.cssText = '';
        });
        
        // Clean up any lingering transition elements from workTransitionAnimator
        import('./Utils/workTransitionAnimator.js').then(module => {
            module.workTransitionAnimator.cancel();
        });
        
        hideAllContainers();
        mainContainer.style.display = 'flex';
        if (linksDiv) {
            linksDiv.style.display = 'flex';
        }
        titleElement.innerHTML = `
            <span class="animate-in animate-d1">Modding Work</span>
        `;
        titleElement.classList.remove('back-link');

        // Handle transition from work details if coming from browser back button
        if (comingFromWorkDetails) {
            // Trigger the listing entrance animation
            setTimeout(() => {
                const cards = document.querySelectorAll('.card-bfx');
                if (cards.length > 0) {
                    // Import and use the work transition animator
                    import('./Utils/workTransitionAnimator.js').then(module => {
                        module.workTransitionAnimator.animateListingEntrance();
                    });
                }
            }, 100);
        } else {
            // Don't re-initialize here, just ensure they're visible
            const cards = document.querySelectorAll('.card-bfx');
            cards.forEach(card => {
                if (card.style.display === 'none') {
                    card.style.display = '';
                }
            });
        }

        updateNavigation('home');

        // Update URL when returning to work route
        const baseUrl = window.location.pathname.includes('/moxo') ? '/moxo/' : '/';
        if (window.location.pathname !== baseUrl) {
            history.replaceState(null, '', baseUrl);
        }

        // Update the document title
        document.title = 'MOXOPIXEL // Game Art';
    });
    
    // Update gallery route handling without view transitions
    router.addRoute('gallery', () => {
        hideAllContainers();
        imageContainer.style.display = 'block';

        // Ensure URL is updated to /gallery
        const galleryUrl = baseUrl + '/gallery';
        if (window.location.pathname !== galleryUrl) {
            history.replaceState({ page: 'gallery' }, 'MOXOPIXEL // Gallery', galleryUrl);
        }

        document.title = 'MOXOPIXEL // Gallery';
        
        // Remove any existing event listener before adding a new one
        window.removeEventListener('gallery-page-change', handlePageChange);
        window.addEventListener('gallery-page-change', handlePageChange);
        
        // Check if gallery already has content
        const imageContainerBody = imageContainer.querySelector('.body');
        const hasExistingImages = imageContainerBody && 
            imageContainerBody.querySelectorAll('.image-container').length > 0;
            
        if (!hasExistingImages || !isLoadingGallery) {
            // Load the first page of the gallery if not already loaded
            loadGalleryPage(1);
        }
        
        updateNavigation('gallery');
    });

    // More reliable work details route handler
    router.addRoute('work-details', async (params) => {
        // Import utilities from utils.js instead of workUtils.js
        const { findCardByIdOrSlug, createVirtualCard } = await import('./Utils/utils.js');
        // Find card by ID or slug
        let card = findCardByIdOrSlug(params.id);
        
        // If still not found, fetch work_items.json and create virtual card
        if (!card) {
            try {
                const response = await fetch(`${baseUrl}/data/work_items.json`);
                const data = await response.json();

                // Try to find by slug in the data
                const item = data.work_items.find(item => {
                    const slug = item.title
                        .toLowerCase()
                        .replace(/[^a-z0-9]+/g, '-')
                        .replace(/^-|-$/g, '');
                    return slug === params.id;
                }) || data.work_items.find(item => item.id === params.id);

                if (item) {
                    card = document.createElement('a');
                    card.dataset.class = `desc_${item.id}`;
                    card.dataset.slider_img = item.slider_images[0].image;
                    card.dataset.slider_images = JSON.stringify(item.slider_images);
                    card.dataset.title = item.title;
                    card.dataset.web = item.work_meta.website;
                    card.dataset.category_one = item.work_meta.category;
                    card.dataset.category_two = item.work_meta.category_two;
                    card.dataset.github = item.github;
                    card.dataset.useGithubReadme = item.useGithubReadme === true ? 'true' : 'false';
                    card.dataset.coding_languages = JSON.stringify(item.work_meta.coding_languages);
                    card.dataset.software_used = JSON.stringify(item.work_meta.software_used);
                    card.classList.add('card-bfx');
                }
            } catch (error) {
                console.error('Error fetching work items for direct URL access:', error);
            }
        }
        
        if (card) {
            // If we found or created a card, trigger the work click handler
            handleWorkClick(card, linksDiv, titleElement, workDetails);
        } else {
            // If no card was found, navigate back to work
            router.navigateTo('work');
        }
    });
    
    // Add about route to router without view transitions
    router.addRoute('about', () => {
        hideAllContainers();
        aboutContainer.style.display = 'block';

        // Update URL
        const aboutUrl = baseUrl + '/about';
        if (window.location.pathname !== aboutUrl) {
            history.replaceState({ page: 'about' }, 'MOXOPIXEL // About ', aboutUrl);
        }

        document.title = 'MOXOPIXEL // About';
        updateNavigation('about');

        // Directly animate the title to ensure it works
        const aboutTitle = document.querySelector('.about-title');
        if (aboutTitle && window.gsap) {
            // Make sure GSAP is available before animating
            try {
                animateText(aboutTitle);
            } catch (error) {
                console.error('Error animating about title in route handler:', error);
            }
        } else if (!window.gsap) {
            console.warn('GSAP not available for about title animation in route handler');
        }

        // Also load GitHub component
        const aboutGithubComponent = document.querySelector('.github-component');
        if (aboutGithubComponent) {
            fetchGitHubData(aboutGithubComponent);
        }
    });

    // Add hover event to About nav to preload GitHub data
    if (aboutTrigger) {
        const aboutPreloader = setupAboutPreloading(aboutTrigger);

        // Clean up on page unload
        window.addEventListener('beforeunload', () => {
            aboutPreloader.cleanup();
        });
    }
    
    // Update event listeners without view transitions
    imageGalleryTrigger.addEventListener('click', (e) => {
        e.preventDefault();
        
        // Prevent multiple rapid clicks
        if (isLoadingGallery) {
            return;
        }

        const galleryUrl = baseUrl + '/gallery';

        // Update URL immediately
        history.pushState({ page: 'gallery' }, 'MOXOPIXEL // Gallery', galleryUrl);
        router.navigateTo('gallery', {}, false); // Don't push state again
    });

    homeTrigger.addEventListener('click', (e) => {
        e.preventDefault();
        router.navigateTo('work');
    });
    
    aboutTrigger.addEventListener('click', (e) => {
        e.preventDefault();
        const aboutUrl = baseUrl + '/about';

        // Ensure data is being loaded, but don't wait for it
        scheduleIdleTask(() => {
            preloadGitHubData().catch(() => {/* Ignore errors */ });
        });

        history.pushState({ page: 'about' }, 'MOXOPIXEL // About', aboutUrl);
        router.navigateTo('about', {}, false);
        
        // Force the animation to run immediately after navigation
        setTimeout(() => {
            const aboutTitle = document.querySelector('.about-title');
            if (aboutTitle && window.gsap) {
                // Make sure GSAP is available before animating
                try {
                    animateText(aboutTitle);
                } catch (error) {
                    console.error('Error animating about title:', error);
                }
            } else if (!window.gsap) {
                console.warn('GSAP not available for about title animation');
            }
        }, 300); // Slightly longer delay to ensure everything is loaded
    });

    // Use the already declared navLinks variable
    navLinks.forEach(link => {
        // Only animate if inside .nav-menu and not active
        if (link.closest('.nav-menu')) {
            link.addEventListener('mouseenter', () => {
                if (!link.classList.contains('active')) {
                    animateTitleElement(link);
                }
            });
        }
    });

    function updateNavigation(active) {
        const navLinks = document.querySelectorAll('.nav-link');
        // Fix gallery link selector by adding both possibilities
        const activeLink = document.querySelector(
            active === 'gallery'
                ? '.nav-link.image-gallery-trigger'
                : `.nav-link.${active}-trigger`
        );
        // Remove active from all nav-items
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        // Remove active from all nav-links
        navLinks.forEach(link => {
            link.classList.remove('active');
        });
        if (activeLink) {
            activeLink.classList.add('active');
            const parentNavItem = activeLink.closest('.nav-item');
            if (parentNavItem) {
                parentNavItem.classList.add('active');
            }
        }
    }
    
    let galleryCleanup = null;
    
    // Track active loading to prevent duplicate gallery loading
    let isLoadingGallery = false;
    
    function handlePageChange(event) {
        const page = event.detail.page;
        // Only update gallery view, do not update URL
        if (!isLoadingGallery) {
            loadGalleryPage(page);
            // Removed history.pushState to prevent URL change on pagination
        }
    }
      async function loadGalleryPage(page = 1) {
        // Prevent multiple simultaneous loads of the same page
        if (isLoadingGallery) {
            return;
        }
        
        isLoadingGallery = true;
        
        const imageContainerBody = imageContainer.querySelector('.body');
        imageContainerBody.innerHTML = '';

        const url = `${baseUrl}/get_images.php?page=${page}`;
        const options = { method: 'GET' };

        try {
            const response = await fetchData(url, options);
            const { images, pagination } = response;
            const loadedImages = new Set();
            
            // Clear any existing images to prevent duplicates
            const existingImages = imageContainerBody.querySelectorAll('.image-container');
            if (existingImages.length > 0) {
                imageContainerBody.innerHTML = '';
            }

            for (const image of images) {
                const container = document.createElement('div');
                container.className = 'image-container';
                container.dataset.imageId = image; // Add a data attribute for tracking

                const img = document.createElement('img');
                img.className = 'thumbnail';
                img.loading = 'lazy';
                img.alt = 'Image';
                img.style.opacity = '0';
                img.style.transition = 'opacity 0.3s ease';

                container.appendChild(img);
                imageContainerBody.appendChild(container);

                const observer = new IntersectionObserver((entries) => {
                    entries.forEach(async entry => {
                        if (entry.isIntersecting && !loadedImages.has(image)) {
                            loadedImages.add(image);

                            const pathInfo = image.split('.').slice(0, -1).join('.');
                            const cachedWebpImageUrl = `${baseUrl}/assets/img/cache/${pathInfo}.webp`;
                            const originalImageUrl = `${baseUrl}/assets/img/dump/${image}`;
                            const webpImageUrl = `${baseUrl}/convert_to_webp.php?src=assets/img/dump/${image}`;

                            try {
                                const response = await fetch(cachedWebpImageUrl, { method: 'HEAD' });
                                if (response.ok) {
                                    await imageLoader.loadImageWithLoader(container, img, cachedWebpImageUrl);
                                } else {
                                    try {
                                        await imageLoader.loadImageWithLoader(container, img, webpImageUrl);
                                    } catch {
                                        await imageLoader.loadImageWithLoader(container, img, originalImageUrl);
                                    }
                                }
                            } catch {
                                await imageLoader.loadImageWithLoader(container, img, originalImageUrl);
                            }

                            observer.unobserve(container);
                        }
                    });
                });

                observer.observe(container);
            }
            
            // Make sure to clean up any previous gallery initialization
            if (galleryCleanup) {
                galleryCleanup();
                galleryCleanup = null;
            }
            
            // Check for duplicate images
            const currentImageCount = imageContainerBody.querySelectorAll('.image-container').length;
            if (currentImageCount !== images.length) {
                console.warn(`Image count mismatch: ${currentImageCount} containers vs ${images.length} images`);
            }
            
            galleryCleanup = initializeImageGallery();
            updatePaginationState(pagination.currentPage, pagination.totalPages);
        } catch (error) {
            console.error('Error loading gallery page:', error);
        } finally {
            // Reset loading status regardless of success or failure
            isLoadingGallery = false;
        }
    }

    loadingContainer.style.display = 'none';
    mainContainer.style.display = 'block';

    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            if (navCheckbox && navCheckbox.checked) {
                navCheckbox.checked = false;
            }
            // Remove active from all nav-items
            document.querySelectorAll('.nav-item').forEach(item => {
                item.classList.remove('active');
            });
            // Add active to the parent nav-item of the clicked link
            const parentNavItem = link.closest('.nav-item');
            if (parentNavItem) {
                parentNavItem.classList.add('active');
            }
        });
    });

});

// Move these functions outside the DOMContentLoaded handler
// but make sure they reference global router
const updateUIForRoute = function (route, params = {}) {
    const linksDiv = document.querySelector('.links');
    const titleElement = document.querySelector('.main-sidebar');
    const workDetails = document.querySelector('.work-details');
    const imageContainer = document.getElementById('imageContainer');
    const mainContainer = document.getElementById('mainContentInner');

    switch (route) {
        case 'work':
            mainContainer.style.display = 'block';
            imageContainer.style.display = 'none';
            workDetails.style.display = 'none';

            if (linksDiv) {
                linksDiv.style.display = 'grid';
            }
            titleElement.innerHTML = `<span class="animate-in animate-d1">Modding Work</span>`;
            titleElement.classList.remove('back-link');
            break;

        case 'work-details':
            // Handled by workClickHandler.js
            break;

        case 'gallery':
            mainContainer.style.display = 'none';
            imageContainer.style.display = 'block';
            break;
    }
};

// Add a initialization function to set up router handlers after router is created
function initializeRouter() {
    if (!router) {
        console.warn('Router not initialized yet');
        return;
    }

    // Add to your router setup
    router.onRouteChange = updateUIForRoute;
}

// Add a function to check if router is initialized
function ensureRouterIsInitialized() {
    if (!router || !window.router) {
        console.warn('Router not found, initializing...');
        router = new Router(
            window.location.hostname.includes('localhost') ? '/moxo' : ''
        );
        window.router = router;
        initializeRouter();
    }
    return router;
}

// Export necessary functions for external use
export { ensureRouterIsInitialized, updateUIForRoute };