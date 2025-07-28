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
     * Animate work listing entrance
     */
    animateListingEntrance() {
        if (!window.gsap) return;

        const cards = document.querySelectorAll('.card-bfx');
        
        if (cards.length > 0) {
            gsap.fromTo(cards, {
                opacity: 0,
                y: 60,
                scale: 0.9
            }, {
                opacity: 1,
                y: 0,
                scale: 1,
                duration: 0.8,
                ease: "power3.out",
                stagger: {
                    amount: 0.6,
                    from: "start"
                }
            });

            // Add hover animations
            this.addHoverAnimations(cards);
        }
    }

    /**
     * Add hover animations to cards
     */
    addHoverAnimations(cards) {
        const links = cards;

        links.forEach(link => {
            let linkTL = gsap.timeline({
                defaults: {
                    duration: .4,
                    ease: "power4.inOut"
                }
            })
            
            const headingStart = link.querySelector('.card-title.primary')
            const headingEnd = link.querySelector('.card-title.secondary')
            const cardTag = link.querySelector('.tag-content')
            const cardImage = link.querySelector('.image > img')
            
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
            
            link.addEventListener('mouseenter', () => {
                linkTL.play()
            })
            link.addEventListener('mouseleave', () => {
                linkTL.reverse()
            })
        })
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
     * Cancel current animation
     */
    cancel() {
        if (this.currentTl) {
            this.currentTl.kill();
            this.currentTl = null;
        }
        
        // Force cleanup of any problematic elements
        const problematicCards = document.querySelectorAll('.card-bfx[style*="position: fixed"], .card-bfx[style*="z-index: 1001"]');
        problematicCards.forEach(card => {
            gsap.set(card, { clearProps: "all" });
        });
        
        // Reset all cards to default state
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
        
        this.isAnimating = false;
        
        // Reset state
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
