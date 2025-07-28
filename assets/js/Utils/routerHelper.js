import { Router } from '../router.js';

/**
 * Global router reference
 */
let globalRouter = null;

/**
 * Gets the current router instance, creating one if necessary
 * @returns {Router} The router instance
 */
export function getRouter() {
    if (window.router) {
        return window.router;
    }

    if (globalRouter) {
        return globalRouter;
    }

    // Create a new router if none exists
    const baseUrl = window.location.hostname.includes('localhost') ? '/moxo' : '';
    globalRouter = new Router(baseUrl);
    window.router = globalRouter;

    return globalRouter;
}

/**
 * Safely navigate to a route, ensuring the router exists
 * @param {string} path The route path
 * @param {Object} params Route parameters
 * @param {boolean} pushState Whether to push state to history
 */
export function safeNavigate(path, params = {}, pushState = true) {
    const router = getRouter();
    return router.navigateTo(path, params, pushState);
}

/**
 * Update URL without navigation when returning to main view
 * @param {string} route The route to set
 * @param {Object} params Additional parameters for the route
 * @param {string} title Optional title to set
 */
export function updateUrlForRoute(route, params = {}, title = '') {
    let baseUrl = '';

    if (route === 'work') {
        baseUrl = window.location.hostname.includes('localhost') ? '/moxo/' : '/';
        title = title || 'MOXOPIXEL // Game Art';

        // Only update if needed
        if (window.location.pathname !== baseUrl) {
            history.replaceState({ page: 'work', ...params }, title, baseUrl);
        }
    } else if (route === 'gallery') {
        baseUrl = (window.location.hostname.includes('localhost') ? '/moxo' : '') + '/gallery';
        title = title || 'Gallery // MOXOPIXEL';

        if (window.location.pathname !== baseUrl) {
            history.replaceState({ page: 'gallery', ...params }, title, baseUrl);
        }
    } else if (route === 'work-details' && params.slug) {
        baseUrl = (window.location.hostname.includes('localhost') ? '/moxo' : '') + `/work/${params.slug}`;
        title = title || `${params.title || 'Work Details'} // MOXOPIXEL`;

        if (window.location.pathname !== baseUrl) {
            history.replaceState({ page: 'work-details', ...params }, title, baseUrl);
        }
    }

    // Update document title if provided
    if (title) {
        document.title = title;
    }
}

/**
 * Navigate to a specific route with URL update
 * @param {string} route The route name ('work', 'gallery', 'work-details')
 * @param {Object} params Route parameters
 * @param {boolean} pushState Whether to push state or replace state
 * @param {string} title Optional title to set
 */
export function navigateToRoute(route, params = {}, pushState = true, title = '') {
    const router = getRouter();
    const baseUrl = window.location.hostname.includes('localhost') ? '/moxo' : '';

    let urlPath = '';

    // Prepare URL and title
    if (route === 'work') {
        urlPath = baseUrl + '/';
        title = title || 'MOXOPIXEL // Game Art';
    } else if (route === 'gallery') {
        urlPath = baseUrl + '/gallery';
        title = title || 'Gallery // MOXOPIXEL';
    } else if (route === 'work-details' && params.slug) {
        urlPath = `${baseUrl}/work/${params.slug}`;
        title = title || `${params.title || 'Work Details'} // MOXOPIXEL`;
    }

    // Update URL if needed
    if (urlPath && window.location.pathname !== urlPath) {
        if (pushState) {
            history.pushState({ page: route, ...params }, title, urlPath);
        } else {
            history.replaceState({ page: route, ...params }, title, urlPath);
        }
    }

    // Update title
    if (title) {
        document.title = title;
    }

    // Navigate using the router (without pushing state again)
    return router.navigateTo(route, params, false);
}

/**
 * Add an event listener to safely use the router
 * @param {Element} element The element to attach the listener to
 * @param {string} eventType The event type (e.g., 'click')
 * @param {string} routePath The route path to navigate to
 * @param {Object} params Optional route parameters
 * @param {Function} beforeNavigate Optional callback to run before navigation
 */
export function addRouterListener(element, eventType, routePath, params = {}, beforeNavigate = null) {
    if (!element) return;

    element.addEventListener(eventType, async (event) => {
        event.preventDefault();

        if (beforeNavigate && typeof beforeNavigate === 'function') {
            await beforeNavigate(event);
        }

        safeNavigate(routePath, params);
    });
}
