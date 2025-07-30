import { fetchGitHubData, preloadGitHubData, isGitHubDataPreloaded } from './github.js';
import { animateText, animateTitleElement } from './External/text-animator.js';
import { scheduleIdleTask, addPreloadHoverListener } from './Utils/utils.js';

let isAboutPageInitialized = false;
let titleAnimationStarted = false;

/**
 * Initialize the About page
 * @param {boolean} preloadOnly If true, only preload data without rendering
 * @param {boolean} forceAnimation Force animation even if already started
 * @returns {Promise} Promise that resolves when initialization is complete
 */
export async function initializeAboutPage(preloadOnly = false, forceAnimation = false) {
    if (isAboutPageInitialized && !preloadOnly && !forceAnimation) return;

    // Preload GitHub data
    if (!isGitHubDataPreloaded()) {
        try {
            await preloadGitHubData();
        } catch (error) {
            console.warn('Failed to preload GitHub data:', error);
        }
    }

    // Stop here if we're only preloading
    if (preloadOnly) return;

    // Initialize the about page content
    const aboutContainer = document.getElementById('aboutContainer');
    if (!aboutContainer) return;

    // Animate the about title - if forceAnimation is true or not started yet
    if (forceAnimation || !titleAnimationStarted) {
        const aboutTitle = aboutContainer.querySelector('.about-title');
        if (aboutTitle && window.gsap) {
            // Use direct animation instead of scheduleIdleTask for more reliable behavior
            animateText(aboutTitle);
            titleAnimationStarted = true;
        }
    }    // Render GitHub component if data is preloaded
    const githubComponent = aboutContainer.querySelector('.github-component');
    if (githubComponent) {
        await fetchGitHubData(githubComponent);
    }

    isAboutPageInitialized = true;
    return true;
}

/**
 * Reset the about page state - useful when navigating back
 */
export function resetAboutPageState() {
    titleAnimationStarted = false;
}

/**
 * Directly animate the about title - for use in click handlers
 * @returns {Promise<boolean>} Success status
 */
export async function animateAboutTitle() {
    const aboutContainer = document.getElementById('aboutContainer');
    if (!aboutContainer) return false;
    const aboutTitle = aboutContainer.querySelector('.about-title');
    const success = await animateTitleElement(aboutTitle);
    if (success) {
        titleAnimationStarted = true;
        return true;
    }
    return false;
}

/**
 * Setup About page hover listeners for preloading data
 * @param {Element} triggerElement Element that triggers the About page
 */
export function setupAboutPreloading(triggerElement) {
    if (!triggerElement) return;

    let hasPreloaded = false;

    // Preload on hover with a short delay
    const preloadHandler = () => {
        if (hasPreloaded) return;

        // Schedule as an idle task to not block main thread
        scheduleIdleTask(() => {
            initializeAboutPage(true).then(() => {
                hasPreloaded = true;
            });
        });
    };

    // Use our utility for consistent hover handling
    const cleanupListener = addPreloadHoverListener(triggerElement, preloadHandler);

    // Add click handler to ensure data is loaded
    const clickHandler = () => {
        if (!hasPreloaded) {
            // If user clicks before hover completes preloading
            initializeAboutPage(true);
        }
    };

    triggerElement.addEventListener('click', clickHandler);

    return {
        cleanup: () => {
            cleanupListener();
            triggerElement.removeEventListener('click', clickHandler);
        },
        isPreloaded: () => hasPreloaded
    };
}
