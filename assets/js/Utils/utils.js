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
 * Debounces a function call, limiting how often it can fire
 * @param {Function} func The function to debounce
 * @param {number} delay Delay in milliseconds
 * @returns {Function} Debounced function
 */
export const debounce = (func, delay) => {
  let timerId;
  return (...args) => {
    clearTimeout(timerId);
    timerId = setTimeout(() => {
      func.apply(this, args);
    }, delay);
  };
};

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
 * Creates a virtual card element from a work item object
 * @param {Object} item - The work item data
 * @returns {HTMLElement} The virtual card element
 */
export function createVirtualCard(item) {
    const card = document.createElement('a');
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
    return card;
}
