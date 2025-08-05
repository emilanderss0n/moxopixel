/**
 * Work Transition Animations - GSAP-powered transitions for work items
 */

export class WorkTransitionAnimator {
    constructor() {
        this.isAnimating = false;
        this.currentTl = null;
        this.expandedCard = null;
        this.state = {
            originalCard: null,
            originalImage: null,
            originalTitle: null,
            clonedCard: null,
            overlay: null
        };
        
        // Clean up any existing overlays on initialization
        const existingOverlays = document.querySelectorAll('.work-transition-overlay');
        existingOverlays.forEach(overlay => overlay.remove());
        
        // Add resize listener to handle screen size changes
        this.handleResize = this.debounce(() => {
            const cards = document.querySelectorAll('.card-bfx');
            if (cards.length > 0) {
                this.refreshHoverAnimations(cards);
                
                // Re-initialize click handlers after DOM manipulation
                // Dispatch a custom event to let the main app know to re-init handlers
                const event = new CustomEvent('workCards:needsReinit', { 
                    detail: { cards } 
                });
                window.dispatchEvent(event);
            }
        }, 250);
        
        window.addEventListener('resize', this.handleResize);
    }

    /**
     * Animate from work listing to detail view
     */
    async animateToDetail(card, workDetails, options = {}) {
        if (this.isAnimating || !window.gsap) return;
        
        // Validate required elements
        if (!card || !workDetails) {
            console.warn('WorkTransitionAnimator: Missing required elements for animation');
            return;
        }
        
        this.isAnimating = true;
        this.state.originalCard = card;

        return new Promise((resolve) => {
            // Create timeline
            this.currentTl = gsap.timeline({
                onComplete: () => {
                    this.isAnimating = false;
                    resolve();
                }
            });

            // Step 1: Create ripple effect from clicked item
            const allCards = document.querySelectorAll('.card-bfx');
            const cardArray = Array.from(allCards);
            const clickedIndex = cardArray.indexOf(card);

            card.classList.add('clicked');
            
            if (clickedIndex === -1) {
                console.warn('Clicked card not found in card array');
                return;
            }

            // Create ripple animation inward toward clicked item
            const maxDistance = Math.max(clickedIndex, cardArray.length - 1 - clickedIndex);
            
            for (let distance = 1; distance <= maxDistance; distance++) {
                const cardsAtDistance = [];
                
                // Get cards above clicked item at this distance
                if (clickedIndex - distance >= 0) {
                    cardsAtDistance.push(cardArray[clickedIndex - distance]);
                }
                
                // Get cards below clicked item at this distance
                if (clickedIndex + distance < cardArray.length) {
                    cardsAtDistance.push(cardArray[clickedIndex + distance]);
                }
                
                // Animate cards at this distance with delay (reverse order - furthest first)
                if (cardsAtDistance.length > 0) {
                    this.currentTl.to(cardsAtDistance, {
                        opacity: 0,
                        scale: 0.8,
                        duration: 0.25,
                        ease: "power2.out"
                    }, (maxDistance - distance) * 0.1); // Snappier 100ms delay per distance level
                }
            }

            // Animate the clicked card last (after all other cards)
            this.currentTl.to(card, {
                opacity: 0,
                scale: 0.9,
                duration: 0.3,
                ease: "power2.out"
            }, maxDistance * 0.1 + 0.1); // Start after all other cards with shorter overlap

            // Step 2: Fade in detail view
            this.currentTl.fromTo(workDetails, {
                opacity: 0
            }, {
                opacity: 1,
                duration: 0.5,
                ease: "power2.out"
            }, "-=0.1");

            // Step 3: Animate detail content
            const detailElements = workDetails.querySelectorAll('.work-header, .work-content > *');
            if (detailElements.length > 0) {
                this.currentTl.fromTo(detailElements, {
                    opacity: 0,
                    y: 20
                }, {
                    opacity: 1,
                    y: 0,
                    duration: 0.6,
                    stagger: 0.08,
                    ease: "power2.out"
                }, "-=0.3");
            }
        });
    }

    /**
     * Animate back to work listing
     */
    async animateToListing(workDetails, targetCard, options = {}) {
        if (this.isAnimating || !window.gsap) return;
        
        this.isAnimating = true;

        return new Promise((resolve) => {
            this.currentTl = gsap.timeline({
                onComplete: () => {
                    this.cleanupTransition();
                    this.isAnimating = false;
                    resolve();
                }
            });

            // Animate back to listing
            this.animateFromDetailView(workDetails, targetCard);
        });
    }

    /**
     * Animate from detail view back to listing
     */
    animateFromDetailView(workDetails, targetCard) {
        // Fade out detail view
        this.currentTl.to(workDetails, {
            opacity: 0,
            duration: 0.4,
            ease: "power2.in"
        });

        // Fade in all cards with stagger
        const allCards = document.querySelectorAll('.card-bfx');
        if (allCards.length > 0) {
            this.currentTl.to(allCards, {
                opacity: 1,
                scale: 1,
                duration: 0.5,
                ease: "power2.out",
                stagger: {
                    amount: 0.3,
                    from: "start"
                }
            }, "-=0.2");
        }
    }

    /**
     * Animate work listing entrance with improved performance and accessibility
     * @param {Object} options - Animation options
     * @param {boolean} options.force - Force animation even if cards are visible (default: false)
     * @param {number} options.duration - Animation duration in seconds (default: 0.8)
     * @param {number} options.stagger - Stagger amount in seconds (default: 0.6)
     * @param {boolean} options.respectPrefersReducedMotion - Respect user's motion preferences (default: true)
     */
    animateListingEntrance(options = {}) {
        const { 
            force = false, 
            duration = 0.8, 
            stagger = 0.6, 
            respectPrefersReducedMotion = true 
        } = options;

        const cards = document.querySelectorAll('.card-bfx');
        
        if (cards.length === 0) {
            console.warn('No work cards found for listing entrance animation');
            return;
        }

        // Check for reduced motion preference
        const prefersReducedMotion = respectPrefersReducedMotion && 
            window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        if (!window.gsap) {
            console.warn('GSAP not available for listing entrance animation');
            this.fallbackEntrance(cards);
            return;
        }

        // Optimized visibility check - only check first and last card
        if (!force) {
            const firstCard = cards[0];
            const lastCard = cards[cards.length - 1];
            const firstOpacity = parseFloat(window.getComputedStyle(firstCard).opacity);
            const lastOpacity = parseFloat(window.getComputedStyle(lastCard).opacity);
            
            // If both first and last cards are visible, assume all are visible
            if (firstOpacity >= 1 && lastOpacity >= 1) {
                this.addHoverAnimations(cards);
                return;
            }
        }

        // Kill any existing timeline to prevent conflicts
        if (this.currentTl) {
            this.currentTl.kill();
        }

        // Create optimized animation
        this.currentTl = gsap.timeline({
            onComplete: () => {
                // Cleanup and ensure accessibility
                this.ensureAnimationComplete(cards);
                this.addHoverAnimations(cards);
            }
        });

        if (prefersReducedMotion) {
            // Simplified animation for reduced motion preference
            this.currentTl.fromTo(cards, {
                opacity: 0
            }, {
                opacity: 1,
                duration: 0.3,
                ease: "none",
                stagger: 0.1
            });
        } else {
            // Full animation with proper performance settings
            this.currentTl.fromTo(cards, {
                opacity: 0,
                y: 60,
                scale: 0.9,
                rotationX: 10
            }, {
                opacity: 1,
                y: 0,
                scale: 1,
                rotationX: 0,
                duration: duration,
                ease: "power3.out",
                stagger: {
                    amount: stagger,
                    from: "start"
                },
                // Use will-change for better performance
                onStart: () => {
                    cards.forEach(card => {
                        card.style.willChange = 'transform, opacity';
                    });
                },
                onComplete: () => {
                    cards.forEach(card => {
                        card.style.willChange = 'auto';
                    });
                }
            });
        }
    }

    /**
     * Fallback entrance animation when GSAP is not available
     * @param {NodeList} cards - The card elements to animate
     */
    fallbackEntrance(cards) {
        cards.forEach((card, index) => {
            // Reset any stuck styles
            card.style.cssText = '';
            card.style.opacity = '0';
            card.style.transform = 'translateY(20px)';
            card.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
            
            // Stagger the appearance
            setTimeout(() => {
                card.style.opacity = '1';
                card.style.transform = 'translateY(0)';
                
                // Clean up transition after animation
                setTimeout(() => {
                    card.style.transition = '';
                }, 300);
            }, index * 100);
        });
    }

    /**
     * Ensure animation completed successfully and setup accessibility
     * @param {NodeList} cards - The card elements to check
     */
    ensureAnimationComplete(cards) {
        cards.forEach((card, index) => {
            const computedStyle = window.getComputedStyle(card);
            const opacity = parseFloat(computedStyle.opacity);
            
            // Force visibility if animation failed
            if (opacity < 1) {
                card.style.opacity = '1';
                card.style.transform = 'none';
            }
            
            // Ensure proper accessibility attributes
            if (!card.hasAttribute('tabindex')) {
                card.setAttribute('tabindex', '0');
            }
            
            // Add ARIA labels if missing
            if (!card.hasAttribute('aria-label') && card.dataset.title) {
                card.setAttribute('aria-label', `View details for ${card.dataset.title}`);
            }
        });
    }

    /**
     * Add hover animations to cards
     */
    addHoverAnimations(cards) {
        const links = cards;
        
        // Check if screen width is mobile/small tablet (768px or less)
        const isMobileOrSmallTablet = window.innerWidth <= 768;

        links.forEach(link => {
            const headingStart = link.querySelector('.card-title.primary')
            const headingEnd = link.querySelector('.card-title.secondary')
            const cardTag = link.querySelector('.tag-content')
            const cardImage = link.querySelector('.image > img')
            
            // Remove any existing hover event listeners stored on the element
            if (link._hoverEnterHandler) {
                link.removeEventListener('mouseenter', link._hoverEnterHandler);
            }
            if (link._hoverLeaveHandler) {
                link.removeEventListener('mouseleave', link._hoverLeaveHandler);
            }
            
            if (isMobileOrSmallTablet) {
                // On mobile/small tablets, ensure only primary title is visible and no hover effects
                gsap.set(headingStart, { yPercent: 0, opacity: 1 });
                gsap.set(headingEnd, { yPercent: 100, opacity: 0 });
                gsap.set(cardTag, { y: 10, opacity: 0 });
                gsap.set(cardImage, { opacity: 0.7 });
                return; // Skip hover animation setup
            }
            
            // Desktop hover animations
            let linkTL = gsap.timeline({
                defaults: {
                    duration: .4,
                    ease: "power4.inOut"
                }
            })
            
            linkTL
                .to(headingStart, {
                    yPercent: -100
                })
                .to(headingEnd, {
                    yPercent: -85,
                    color: "var(--main-color)"
                }, "<")
                .to(cardTag, {
                    y: 0,
                    opacity: 1
                }, "<")
                .to(cardImage, {
                    opacity: 1
                }, "<")

            linkTL.pause()
            
            // Store event handlers on the element so they can be removed later
            link._hoverEnterHandler = () => linkTL.play();
            link._hoverLeaveHandler = () => linkTL.reverse();
            
            link.addEventListener('mouseenter', link._hoverEnterHandler);
            link.addEventListener('mouseleave', link._hoverLeaveHandler);
        })
    }

    /**
     * Refresh hover animations when screen size changes
     */
    refreshHoverAnimations(cards) {
        // Instead of cloning (which removes click handlers), just reset GSAP properties
        cards.forEach(link => {
            // Kill any existing GSAP animations on this element
            gsap.killTweensOf(link);
            
            // Reset all GSAP-controlled properties to their default state
            const headingStart = link.querySelector('.card-title.primary');
            const headingEnd = link.querySelector('.card-title.secondary');
            const cardTag = link.querySelector('.tag-content');
            const cardImage = link.querySelector('.image > img');
            
            if (headingStart) gsap.killTweensOf(headingStart);
            if (headingEnd) gsap.killTweensOf(headingEnd);
            if (cardTag) gsap.killTweensOf(cardTag);
            if (cardImage) gsap.killTweensOf(cardImage);
            
            // More careful clearProps that won't affect event handlers
            if (headingStart) gsap.set(headingStart, { clearProps: "transform,opacity,x,y,scale,rotation" });
            if (headingEnd) gsap.set(headingEnd, { clearProps: "transform,opacity,x,y,scale,rotation" });
            if (cardTag) gsap.set(cardTag, { clearProps: "transform,opacity,x,y,scale,rotation" });
            if (cardImage) gsap.set(cardImage, { clearProps: "transform,opacity,x,y,scale,rotation" });
        });
        
        // Re-apply hover animations with current screen size
        this.addHoverAnimations(cards);
    }

    /**
     * Simple debounce utility
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    /**
     * Cleanup transition elements
     */
    cleanupTransition() {
        // Reset all card states to ensure they're visible
        const allCards = document.querySelectorAll('.card-bfx');
        gsap.set(allCards, { 
            opacity: 1, 
            scale: 1, 
            zIndex: "auto",
            clearProps: "all"
        });

        // Remove clicked class from all cards
        allCards.forEach(card => {
            card.classList.remove('clicked');
        });

        // Reset state
        this.state = {
            originalCard: null,
            originalImage: null,
            originalTitle: null,
            clonedCard: null,
            overlay: null
        };
    }

    /**
     * Cancel any running animations and cleanup
     */
    cancel() {
        if (this.currentTl) {
            this.currentTl.kill();
            this.currentTl = null;
        }
        this.isAnimating = false;
        this.cleanupTransition();
    }

    /**
     * Cleanup method for memory management
     */
    destroy() {
        this.cancel();
        
        // Remove resize listener
        if (this.handleResize) {
            window.removeEventListener('resize', this.handleResize);
            this.handleResize = null;
        }
        
        // Clear any stored references
        this.expandedCard = null;
        this.state = {
            originalCard: null,
            originalImage: null,
            originalTitle: null,
            clonedCard: null,
            overlay: null
        };
    }
}

// Create global instance
export const workTransitionAnimator = new WorkTransitionAnimator();
