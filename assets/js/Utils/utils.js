export const getImagesFromSelector = selector => {
  try {
    if (Array.isArray(selector)) {
      return selector.filter(isSupported)
    }

    if (isNodeList(selector)) {
      // Do not use spread operator or Array.from() for IE support
      return [].slice.call(selector).filter(isSupported)
    }

    if (isNode(selector)) {
      return [selector].filter(isSupported)
    }

    if (typeof selector === 'string') {
      // Do not use spread operator or Array.from() for IE support
      return [].slice
        .call(document.querySelectorAll(selector))
        .filter(isSupported)
    }

    return []
  } catch (err) {
    throw new TypeError(
      'The provided selector is invalid.\n' +
        'Expects a CSS selector, a Node element, a NodeList or an array.\n' +
        'See: https://github.com/francoischalifour/medium-zoom'
    )
  }
}

export const createOverlay = background => {
  const overlay = document.createElement('div')
  overlay.classList.add('medium-zoom-overlay')
  overlay.style.background = background

  return overlay
}

export const cloneTarget = template => {
  const { top, left, width, height } = template.getBoundingClientRect()
  const clone = template.cloneNode()
  const scrollTop =
    window.pageYOffset ||
    document.documentElement.scrollTop ||
    document.body.scrollTop ||
    0
  const scrollLeft =
    window.pageXOffset ||
    document.documentElement.scrollLeft ||
    document.body.scrollLeft ||
    0

  clone.removeAttribute('id')
  clone.style.position = 'absolute'
  clone.style.top = `${top + scrollTop}px`
  clone.style.left = `${left + scrollLeft}px`
  clone.style.width = `${width}px`
  clone.style.height = `${height}px`
  clone.style.transform = ''

  return clone
}

export const createCustomEvent = (type, params) => {
  const eventParams = {
    bubbles: false,
    cancelable: false,
    detail: undefined,
    ...params,
  }

  if (typeof window.CustomEvent === 'function') {
    return new CustomEvent(type, eventParams)
  }

  const customEvent = document.createEvent('CustomEvent')
  customEvent.initCustomEvent(
    type,
    eventParams.bubbles,
    eventParams.cancelable,
    eventParams.detail
  )

  return customEvent
}

/**
 * Creates a focus trap within the specified container element
 * Keeps keyboard focus within a specific container when it's active
 * @param {HTMLElement} containerElement - The DOM element to trap focus within
 * @returns {Object} API for activating and deactivating the focus trap
 */
export function createFocusTrap(containerElement) {
    // Find all focusable elements in the container
    function getFocusableElements() {
        // All elements that can receive focus
        return Array.from(containerElement.querySelectorAll(
            'a[href]:not([tabindex="-1"]), button:not([disabled]):not([tabindex="-1"]), ' +
            'input:not([disabled]):not([tabindex="-1"]), select:not([disabled]):not([tabindex="-1"]), ' +
            'textarea:not([disabled]):not([tabindex="-1"]), [tabindex]:not([tabindex="-1"])'
        )).filter(el => el.offsetParent !== null); // Filter out hidden elements
    }
    
    // Track the previous active element to restore focus later
    let previousActiveElement = null;
    
    // Event handler for trapping focus
    function trapFocus(e) {
        // If not tab key, do nothing
        if (e.key !== 'Tab') return;
        
        const focusableElements = getFocusableElements();
        
        // If there are no focusable elements, do nothing
        if (focusableElements.length === 0) return;
        
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];
        
        // If shift+tab and on the first element, move to the last element
        if (e.shiftKey && document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
        } 
        // If tab and on the last element, move to the first element
        else if (!e.shiftKey && document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
        }
    }
    
    // Activate the focus trap
    function activate() {
        previousActiveElement = document.activeElement;
        document.addEventListener('keydown', trapFocus);
    }
    
    // Deactivate the focus trap and restore previous focus
    function deactivate() {
        document.removeEventListener('keydown', trapFocus);
        
        // Restore focus to the previous active element
        if (previousActiveElement && previousActiveElement.focus) {
            setTimeout(() => {
                previousActiveElement.focus();
            }, 0);
        }
    }
    
    // Return the API
    return {
        activate,
        deactivate,
        getFocusableElements
    };
}


/**
 * General utility functions for performance optimization and common tasks
 */

/**
 * Throttle function calls to limit execution rate
 * @param {Function} func The function to throttle
 * @param {number} limit Time limit in milliseconds
 * @returns {Function} Throttled function
 */
export const throttle = (func, limit) => {
  let lastCall = 0;
  return function (...args) {
    const now = Date.now();
    if (now - lastCall >= limit) {
      lastCall = now;
      func.apply(this, args);
    }
  };
};

/**
 * Schedule a task to run during browser idle time
 * @param {Function} callback - Function to execute during idle time
 * @param {Object} options - requestIdleCallback options
 * @returns {number} - The ID returned by requestIdleCallback
 */
export function scheduleIdleTask(callback, options = { timeout: 1000 }) {
  if ('requestIdleCallback' in window) {
    return window.requestIdleCallback(callback, options);
  }
  return setTimeout(() => callback({ didTimeout: false, timeRemaining: () => 50 }), 1);
}

/**
 * Cancels a previously scheduled idle task
 * @param {number} id The ID returned by scheduleIdleTask
 */
export function cancelIdleTask(id) {
  if ('cancelIdleCallback' in window) {
    window.cancelIdleCallback(id);
  } else {
    clearTimeout(id);
  }
}

/**
 * Adds passive hover listeners for preloading content
 * @param {Element} element Element to listen for hover events
 * @param {Function} enterCallback Function to call on hover
 * @returns {Function} Cleanup function to remove listeners
 */
export function addPreloadHoverListener(element, enterCallback) {
  if (!element) return () => { };

  let hoverTimer = null;
  let touchTimer = null;

  // Mouse hover with short delay
  const mouseEnterHandler = () => {
    if (hoverTimer) clearTimeout(hoverTimer);
    hoverTimer = setTimeout(() => {
      enterCallback();
    }, 200);
  };

  const mouseLeaveHandler = () => {
    if (hoverTimer) clearTimeout(hoverTimer);
  };

  const touchStartHandler = () => {
    if (touchTimer) clearTimeout(touchTimer);
    touchTimer = setTimeout(() => {
      enterCallback();
    }, 100);
  };

  const touchEndHandler = () => {
    if (touchTimer) clearTimeout(touchTimer);
  };

  element.addEventListener('mouseenter', mouseEnterHandler);
  element.addEventListener('mouseleave', mouseLeaveHandler);
  element.addEventListener('touchstart', touchStartHandler);
  element.addEventListener('touchend', touchEndHandler);

  return () => {
    element.removeEventListener('mouseenter', mouseEnterHandler);
    element.removeEventListener('mouseleave', mouseLeaveHandler);
    element.removeEventListener('touchstart', touchStartHandler);
    element.removeEventListener('touchend', touchEndHandler);
    if (hoverTimer) clearTimeout(hoverTimer);
    if (touchTimer) clearTimeout(touchTimer);
  };
}

/**
 * Finds a work card element by its ID or slug
 * @param {string} idOrSlug - The work item's ID or slug
 * @returns {HTMLElement|null} The matching card element or null
 */
export function findCardByIdOrSlug(idOrSlug) {
    // Try to find by data-class (desc_ID)
    let card = document.querySelector(`[data-class="desc_${idOrSlug}"]`);
    if (card) return card;

    // Try to find by slug in data-title
    const allCards = document.querySelectorAll('.card-bfx');
    for (const el of allCards) {
        const title = el.dataset.title || '';
        const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        if (slug === idOrSlug) {
            return el;
        }
    }
    return null;
}

/**
 * GSAP Utilities - Functions for handling GSAP loading and animations
 */

/**
 * Wait for GSAP to be available
 * @param {number} timeout - Maximum time to wait in milliseconds (default: 5000)
 * @returns {Promise<boolean>} - Resolves with true when GSAP is available, false on timeout
 */
export function waitForGsap(timeout = 5000) {
    return new Promise((resolve) => {
        // If GSAP is already available, resolve immediately
        if (window.gsap) {
            resolve(true);
            return;
        }

        let timeoutId;
        let checkInterval;

        // Set up timeout
        timeoutId = setTimeout(() => {
            clearInterval(checkInterval);
            console.warn('GSAP loading timeout after', timeout, 'ms');
            resolve(false);
        }, timeout);

        // Check for GSAP every 50ms
        checkInterval = setInterval(() => {
            if (window.gsap) {
                clearTimeout(timeoutId);
                clearInterval(checkInterval);
                resolve(true);
            }
        }, 50);
    });
}

/**
 * Execute a function when GSAP is ready with improved error handling and performance
 * @param {Function} callback - Function to execute when GSAP is ready
 * @param {number} timeout - Maximum time to wait in milliseconds (default: 5000)
 * @param {Object} options - Additional options
 * @param {boolean} options.fallbackOnError - Whether to show fallback UI on error (default: true)
 * @param {boolean} options.checkVisibility - Whether to check element visibility before animation (default: true)
 * @returns {Promise<boolean>} - Resolves with true if callback was executed, false on timeout
 */
export async function whenGsapReady(callback, timeout = 5000, options = {}) {
    const { fallbackOnError = true, checkVisibility = true } = options;
    
    if (typeof callback !== 'function') {
        console.warn('whenGsapReady: Invalid callback provided');
        return false;
    }

    const isReady = await waitForGsap(timeout);
    if (!isReady) {
        console.warn('GSAP not ready, executing fallback');
        if (fallbackOnError) {
            ensureCardsVisible();
        }
        return false;
    }

    try {
        // Optimized visibility check - only run if requested and elements exist
        if (checkVisibility) {
            const shouldEnsureVisibility = document.hidden || 
                (document.querySelectorAll('.card-bfx[style*="opacity: 0"]').length > 0);

            if (shouldEnsureVisibility) {
                ensureCardsVisible();
                // Use RAF for better performance than setTimeout
                return new Promise(resolve => {
                    requestAnimationFrame(() => {
                        try {
                            callback();
                            resolve(true);
                        } catch (error) {
                            console.error('Error in GSAP callback after visibility fix:', error);
                            resolve(false);
                        }
                    });
                });
            }
        }

        // Execute callback immediately if no visibility issues
        callback();
        return true;
        
    } catch (error) {
        console.error('Error executing GSAP ready callback:', error);
        if (fallbackOnError) {
            ensureCardsVisible();
        }
        return false;
    }
}

/**
 * Global safety mechanism to ensure cards are visible even if animations fail
 * Improved with better performance and accessibility
 */
let lastEnsureCardsVisibleCall = 0;
export function ensureCardsVisible() {
    // Throttle calls to prevent performance issues
    const now = Date.now();
    if (now - lastEnsureCardsVisibleCall < 500) {
        return;
    }
    lastEnsureCardsVisibleCall = now;

    const cards = document.querySelectorAll('.card-bfx');
    if (cards.length === 0) return;

    // Use requestAnimationFrame for better performance
    requestAnimationFrame(() => {
        cards.forEach((card, index) => {
            const computedStyle = window.getComputedStyle(card);
            const currentOpacity = parseFloat(computedStyle.opacity);
            
            if (currentOpacity < 0.5) {
                // Reset all transform properties at once
                card.style.cssText += `
                    opacity: 1 !important;
                    transform: none !important;
                    scale: 1 !important;
                    transition: none !important;
                    visibility: visible !important;
                `;
                
                // Ensure proper tabindex for accessibility
                if (!card.hasAttribute('tabindex')) {
                    card.setAttribute('tabindex', '0');
                }
                
                // Add a slight delay between cards for smoother appearance
                if (index > 0) {
                    card.style.animationDelay = `${index * 50}ms`;
                }
            }
        });
    });
}

/**
 * Animation Performance Utilities
 */

/**
 * Create a performance-optimized GSAP animation with monitoring
 * @param {string} animationName - Name for debugging purposes
 * @param {Function} animationCallback - Function that creates and returns the GSAP timeline
 * @param {Object} options - Performance options
 * @returns {Promise} - Resolves when animation completes
 */
export function createOptimizedAnimation(animationName, animationCallback, options = {}) {
    const { 
        timeout = 10000, 
        logPerformance = false,
        fallbackCallback = null 
    } = options;

    return new Promise((resolve, reject) => {
        const startTime = performance.now();
        
        if (!window.gsap) {
            console.warn(`Animation "${animationName}" skipped - GSAP not available`);
            if (fallbackCallback) fallbackCallback();
            resolve(false);
            return;
        }

        try {
            const timeline = animationCallback();
            
            if (!timeline || typeof timeline.then !== 'function') {
                console.warn(`Animation "${animationName}" returned invalid timeline`);
                resolve(false);
                return;
            }

            // Set up timeout protection
            const timeoutId = setTimeout(() => {
                console.warn(`Animation "${animationName}" timed out after ${timeout}ms`);
                if (fallbackCallback) fallbackCallback();
                resolve(false);
            }, timeout);

            // Handle completion
            timeline.then(() => {
                clearTimeout(timeoutId);
                const duration = performance.now() - startTime;
                
                if (logPerformance) {
                    console.log(`Animation "${animationName}" completed in ${duration.toFixed(2)}ms`);
                }
                
                resolve(true);
            }).catch(error => {
                clearTimeout(timeoutId);
                console.error(`Animation "${animationName}" failed:`, error);
                if (fallbackCallback) fallbackCallback();
                reject(error);
            });

        } catch (error) {
            console.error(`Error creating animation "${animationName}":`, error);
            if (fallbackCallback) fallbackCallback();
            reject(error);
        }
    });
}

/**
 * Debounce function calls for better performance
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @param {boolean} immediate - Execute immediately on first call
 * @returns {Function} - Debounced function
 */
export function debounce(func, wait, immediate = false) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            timeout = null;
            if (!immediate) func.apply(this, args);
        };
        const callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow) func.apply(this, args);
    };
}

/**
 * Check if animations should be reduced based on user preferences
 * @returns {boolean} - True if animations should be reduced
 */
export function shouldReduceMotion() {
    return window.matchMedia && 
           window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Reset cards to their natural visible state without animation
 * Used when returning from other routes to avoid animation conflicts
 */
export function resetCardsToNaturalState() {
    const cards = document.querySelectorAll('.card-bfx');
    cards.forEach(card => {
        // Reset to natural state without triggering animations
        card.style.opacity = '';
        card.style.transform = '';
        card.style.scale = '';
        card.style.visibility = '';
        card.style.display = '';
        card.style.position = '';
        card.style.top = '';
        card.style.left = '';
        card.style.zIndex = '';
        card.style.transition = '';
        card.style.willChange = '';
    });
}
