export class Router {
    constructor(baseUrl = '') {
        this.routes = new Map();
        this.baseUrl = baseUrl;
        this.currentRoute = null;
        this.previousRoute = null;
        this.onNavigateBack = null;
        this.onRouteChange = null;
        
        // Animation state management
        this.animationState = {
            isAnimating: false,
            hasInitiallyAnimated: false,
            getCurrentRoute: () => this.currentRoute,
            getPreviousRoute: () => this.previousRoute
        };
        
        // Make animation state globally available
        window.cardAnimationState = this.animationState;

        // Handle initial load and back/forward
        window.addEventListener('popstate', (e) => this.handlePopState(e));
        this.handleInitialLoad();
    }

    async handleInitialLoad() {
        const path = this.getPathFromUrl();
        const params = this.getParamsFromPath(path);
        await this.handleRoute(path, params);
    }

    async handlePopState(event) {
        const path = this.getPathFromUrl();
        const state = event.state || {};

        // Hide all containers
        document.querySelectorAll('.container').forEach(container => {
            container.style.display = 'none';
        });

        await this.handleRoute(path, state);

        // Call navigateBack handler if defined
        if (this.onNavigateBack) {
            this.onNavigateBack(path);
        }

        // Call route change handler if defined
        if (this.onRouteChange) {
            this.onRouteChange(path, state);
        }
    }

    getPathFromUrl() {
        const path = window.location.pathname.replace(this.baseUrl, '').replace(/^\//, '');

        // Check if path starts with 'work/'
        if (path.startsWith('work/')) {
            return 'work-details';
        }

        // Check if path is 'gallery' or starts with 'gallery/'
        if (path === 'gallery' || path.startsWith('gallery/')) {
            return 'gallery';
        }

        return path || 'work';
    }

    getParamsFromPath(path) {
        if (path === 'work-details') {
            // Extract the slug from /work/slug
            const matches = window.location.pathname.match(/\/work\/([^/]+)/);
            if (matches && matches[1]) {
                return { id: matches[1] };
            }
        }

        return {};
    }

    addRoute(path, handler) {
        this.routes.set(path, handler);
        return this;
    }

    async navigateTo(path, params = {}, pushState = true) {
        // If we're already on this route, don't navigate
        if (this.currentRoute === path && !params.force) {
            return;
        }

        let urlPath;

        // Create appropriate URL path based on route
        if (path === 'work') {
            urlPath = this.baseUrl + '/';
        } else if (path === 'gallery') {
            urlPath = this.baseUrl + '/gallery';
        } else if (path === 'work-details' && params.id) {
            urlPath = `${this.baseUrl}/work/${params.id}`;
        } else {
            urlPath = this.baseUrl + '/' + path;
        }

        // Special handling for work route
        if (path === 'work') {
            // Just ensure the UI reflects the work view
            document.querySelector('#mainContentInner')?.style.removeProperty('display');
            document.querySelector('#imageContainer')?.style.setProperty('display', 'none');
            document.querySelector('.work-details')?.style.setProperty('display', 'none');
            document.querySelector('.links')?.style.removeProperty('display');

            // Update document title for work route
            document.title = 'MOXOPIXEL // Game Art';
        } else if (path === 'gallery') {
            // Update document title for gallery route
            document.title = 'Gallery // MOXOPIXEL';
        }

        if (pushState) {
            history.pushState({ page: path, ...params }, '', urlPath);
        }

        await this.handleRoute(path, params);

        // Call route change handler if defined
        if (this.onRouteChange) {
            this.onRouteChange(path, params);
        }
    }

    async handleRoute(path, params = {}) {
        const handler = this.routes.get(path);
        
        // Store previous route before updating current
        this.previousRoute = this.currentRoute;

        if (handler) {
            this.currentRoute = path;
            
            // Handle animation coordination for work route
            if (path === 'work') {
                await this.handleWorkRouteAnimation();
            }
            
            await handler(params);
            return true;
        }

        // Default to work route if not found
        const defaultHandler = this.routes.get('work');
        if (defaultHandler) {
            this.previousRoute = this.currentRoute;
            this.currentRoute = 'work';
            
            await this.handleWorkRouteAnimation();
            await defaultHandler(params);
            return true;
        }

        return false;
    }
    
    async handleWorkRouteAnimation() {
        const cards = document.querySelectorAll('.card-bfx');
        if (cards.length === 0) return;
        
        const workDetails = document.querySelector('.work-details');
        const comingFromWorkDetails = workDetails && workDetails.style.display !== 'none';
        
        // Import animation utilities
        const { whenGsapReady } = await import('./Utils/utils.js');
        const animatorModule = await import('./Utils/workTransitionAnimator.js');
        
        if (comingFromWorkDetails) {
            // Coming from work details - animate entrance
            setTimeout(() => {
                this.animationState.isAnimating = true;
                whenGsapReady(() => {
                    animatorModule.workTransitionAnimator.animateListingEntrance({ 
                        force: true,
                        duration: 0.6,
                        stagger: 0.4 
                    });
                    this.animationState.isAnimating = false;
                }, 3000, { checkVisibility: false });
            }, 100);
        } else if (this.animationState.hasInitiallyAnimated && 
                   (this.previousRoute === 'gallery' || this.previousRoute === 'about')) {
            // Coming from Gallery/About - hide cards first, then animate after delay
            cards.forEach(card => {
                card.style.opacity = '0';
                card.style.transform = 'translateY(60px) scale(0.9)';
                card.style.visibility = 'visible';
            });
            
            // 500ms delay before animation
            setTimeout(() => {
                if (!this.animationState.isAnimating) {
                    this.animationState.isAnimating = true;
                    whenGsapReady(() => {
                        animatorModule.workTransitionAnimator.animateListingEntrance({ 
                            force: true,
                            duration: 0.5,
                            stagger: 0.3,
                            respectPrefersReducedMotion: true
                        });
                        this.animationState.isAnimating = false;
                    }, 3000, { checkVisibility: false });
                }
            }, 500);
        } else if (!this.animationState.hasInitiallyAnimated && !this.animationState.isAnimating) {
            // First time loading - prepare cards for initWorks animation
            cards.forEach(card => {
                card.style.opacity = '0';
                card.style.transform = 'translateY(60px) scale(0.9)';
                card.style.visibility = 'visible';
            });
        }
    }
    
    // Methods to update animation state
    setAnimating(state) {
        this.animationState.isAnimating = state;
    }
    
    setInitiallyAnimated(state) {
        this.animationState.hasInitiallyAnimated = state;
    }

    // Helper method to get clean URL for current route
    getCurrentUrl() {
        if (this.currentRoute === 'work') {
            return this.baseUrl + '/';
        } else if (this.currentRoute === 'gallery') {
            return this.baseUrl + '/gallery';
        } else {
            return window.location.pathname;
        }
    }

    // Update the current URL without changing history
    updateCurrentUrl() {
        const currentUrl = this.getCurrentUrl();
        window.history.replaceState(
            { page: this.currentRoute },
            '',
            currentUrl
        );
    }
}
