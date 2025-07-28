/**
 * View Transition Helpers - Utility functions for smoother page transitions
 */

/**
 * Checks if the View Transitions API is supported in the current browser
 * @returns {boolean} True if supported, false otherwise
 */
export function supportsViewTransition() {
    return Boolean(document.startViewTransition);
}

/**
 * Executes a view transition with enhanced reliability
 * @param {Function} callback The function to execute during transition
 * @returns {Promise} Promise that resolves when the transition completes
 */
export async function safeViewTransition(callback) {
    if (!supportsViewTransition()) {
        await callback();
        return;
    }

    try {
        const transition = document.startViewTransition(async () => {
            await Promise.resolve(callback());
        });

        await transition.finished;
        return transition;
    } catch (error) {
        console.warn('View transition failed:', error);
        await callback();
    }
}

/**
 * Applies view transition naming to elements for morphing effects with depth priority
 * @param {Object} elements An object mapping transition names to DOM elements
 * @param {Object} options Configuration options
 */
export function applyViewTransitionNames(elements, options = {}) {
    if (!supportsViewTransition()) return;

    const { preserveExisting = false, applyZIndex = false } = options;

    if (!preserveExisting) {
        document.querySelectorAll('[style*="view-transition-name"]').forEach(el => {
            el.style.viewTransitionName = '';
        });
    }

    Object.entries(elements).forEach(([name, element]) => {
        if (element) {
            element.style.viewTransitionName = name;
            if (applyZIndex) {
                element.style.zIndex = name.includes('image') ? '20' :
                    name.includes('title') ? '30' : '10';
            }
        }
    });
}
