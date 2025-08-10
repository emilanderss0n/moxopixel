import { fetchData } from './cache.js';
import { initWorkHandlers } from './workModule.js'; // Updated to use unified module
import { ImageLoader } from './Utils/imageLoader.js';
import { workTransitionAnimator } from './Utils/workTransitionAnimator.js';
import { whenGsapReady } from './Utils/utils.js';

// Track if we've already loaded work items to prevent duplicates
let hasLoadedWorkItems = false;
// Track which items have been added to prevent duplicates
const addedItemIds = new Set();
// Track if initial animation has been triggered
let hasTriggeredInitialAnimation = false;

export async function fetchAndDisplayWorkItems(baseUrl, linksDiv, titleElement, workDetails) {
    // Early return if work items are already loaded
    if (hasLoadedWorkItems) {
        return;
    }

    const imageLoader = new ImageLoader();
    let url = `${baseUrl}/data/work_items.json`;
    let options = { method: 'GET' };

    try {
        const data = await fetchData(url, options);
        const linksContainer = document.querySelector('#mainContent .links');

        if (linksContainer) {
            // Clear any existing content first to prevent duplicates
            linksContainer.innerHTML = '';
            // Also clear our tracking set
            addedItemIds.clear();

            const reversedItems = data.work_items.reverse();

            reversedItems.forEach((item, index) => {
                // Skip if we've already added this item
                if (addedItemIds.has(item.id)) {
                    return;
                }

                // Add to tracking set
                addedItemIds.add(item.id);

                const linkElement = document.createElement('a');
                
                // Create SEO-friendly URL slug from title
                const slug = item.title.toLowerCase()
                    .replace(/[^a-z0-9]+/g, '-')
                    .replace(/^-|-$/g, '');
                
                // Use proper URLs instead of javascript:void(0) for SEO
                const workUrl = `${baseUrl}/work/${slug}`;
                linkElement.href = workUrl;
                
                // Add proper attributes for accessibility and SEO
                linkElement.setAttribute('aria-label', `View details for ${item.title}`);
                linkElement.setAttribute('title', item.title);
                
                // Add microdata for SEO
                linkElement.setAttribute('itemscope', '');
                linkElement.setAttribute('itemtype', 'https://schema.org/CreativeWork');
                
                linkElement.dataset.class = `desc_${item.id}`;
                linkElement.dataset.slider_img = `${item.slider_images[0].image}`;
                linkElement.dataset.slider_images = JSON.stringify(item.slider_images);
                linkElement.dataset.title = `${item.title}`;
                linkElement.dataset.web = `${item.work_meta.website}`;
                linkElement.dataset.category_one = `${item.work_meta.category}`;
                linkElement.dataset.category_two = `${item.work_meta.category_two}`;
                linkElement.dataset.github = `${item.github}`;
                linkElement.dataset.useGithubReadme = item.useGithubReadme === true ? 'true' : 'false';
                linkElement.dataset.coding_languages = `${JSON.stringify(item.work_meta.coding_languages)}`;
                linkElement.dataset.software_used = `${JSON.stringify(item.work_meta.software_used)}`;
                linkElement.classList.add('card-bfx');
                linkElement.id = `work-card-${item.id}`;

                // Add structured data for SEO
                const structuredData = {
                    "@context": "https://schema.org",
                    "@type": "CreativeWork",
                    "name": item.title,
                    "description": item.short_desc,
                    "url": workUrl,
                    "image": `${baseUrl}/assets/img/work_thumbs/${item.thumb}`,
                    "author": {
                        "@type": "Person",
                        "name": "MoxoPixel"
                    },
                    "genre": item.work_meta.category,
                    "keywords": [
                        item.work_meta.category,
                        item.work_meta.category_two,
                        item.work_meta.game,
                        ...item.work_meta.coding_languages,
                        ...item.work_meta.software_used
                    ].filter(Boolean).join(', ')
                };
                
                // Store structured data for potential use
                linkElement.dataset.structuredData = JSON.stringify(structuredData);

                const cardBody = document.createElement('div');
                cardBody.classList.add('card-body');
                cardBody.classList.add('hover-effect-bg');

                const cardMain = document.createElement('div');
                cardMain.classList.add('card-main');

                const imageDiv = document.createElement('div');
                imageDiv.classList.add('image');

                // Create the image element
                const imgElement = document.createElement('img');
                imgElement.loading = 'eager';
                imgElement.alt = item.title;
                imgElement.classList.add('work-thumb');
                imgElement.setAttribute('itemprop', 'image'); // Microdata for image

                // Store original thumb file path
                const originalThumbPath = `${baseUrl}/assets/img/work_thumbs/${item.thumb}`;
                imgElement.dataset.originalSrc = originalThumbPath;

                // Add error handling for image
                imgElement.onerror = () => {
                    // Try different possible file extensions
                    const basename = item.thumb.split('.')[0];
                    const extensions = ['.jpg', '.png', '.webp', '.jpeg'];

                    // Try each extension
                    const tryNextExtension = (index) => {
                        if (index >= extensions.length) {
                            imgElement.src = `${baseUrl}/assets/img/placeholder.png`;
                            return;
                        }
                        const newUrl = `${baseUrl}/assets/img/work_thumbs/${basename}${extensions[index]}`;
                        imgElement.src = newUrl;
                    };

                    tryNextExtension(0);
                };

                // Append the image to the container first
                imageDiv.appendChild(imgElement);

                // Add a cloned thumbnail with 'work-thumb-blur' class instead of 'work-thumb'
                const imgClone = imgElement.cloneNode(true);
                imgClone.classList.remove('work-thumb');
                imgClone.classList.add('work-thumb-blur');
                imageDiv.appendChild(imgClone);

                // Add thumb ring divs directly under the images
                const thumbRing = document.createElement('div');
                thumbRing.classList.add('thumb-ring');
                imageDiv.appendChild(thumbRing);

                const thumbRingOuter = document.createElement('div');
                thumbRingOuter.classList.add('thumb-ring', 'thumb-ring-outer');
                imageDiv.appendChild(thumbRingOuter);

                // Always use direct loading approach for all thumbnails
                imgElement.src = originalThumbPath;
                imgClone.src = originalThumbPath;

                const infoDiv = document.createElement('div');
                infoDiv.classList.add('info');
                
                // Create header wrapper for titles and tag
                const headerDiv = document.createElement('div');
                headerDiv.classList.add('card-bfx-header');
                
                // Create titles wrapper
                const titlesWrapper = document.createElement('div');
                titlesWrapper.classList.add('titles-wrapper');
                
                const workTitle = document.createElement('h2');
                workTitle.classList.add('card-title', 'primary');
                workTitle.textContent = item.title;
                workTitle.id = `work-title-${item.id}`;
                workTitle.setAttribute('itemprop', 'name'); // Microdata for work title

                const workTitle2 = document.createElement('h2');
                workTitle2.classList.add('card-title', 'secondary');
                workTitle2.textContent = item.title;
                workTitle2.id = `work-title-${item.id}-secondary`;

                // Create the tag span element
                const tagSpan = document.createElement('span');
                tagSpan.classList.add('tag-content');
                tagSpan.textContent = item.work_meta.tag || '';

                const descriptionElement = document.createElement('p');
                descriptionElement.classList.add('card-text');
                descriptionElement.textContent = item.short_desc;
                descriptionElement.setAttribute('itemprop', 'description'); // Microdata for description

                // Append titles to titles wrapper
                titlesWrapper.appendChild(workTitle);
                titlesWrapper.appendChild(workTitle2);
                
                // Append titles wrapper and tag to header
                headerDiv.appendChild(titlesWrapper);
                headerDiv.appendChild(tagSpan);
                
                // Append header and description to info
                infoDiv.appendChild(headerDiv);
                infoDiv.appendChild(descriptionElement);

                cardMain.appendChild(imageDiv);
                cardMain.appendChild(infoDiv);

                const cardType = document.createElement('div');
                cardType.classList.add('card-type');
                cardType.textContent = item.work_meta.category;

                cardBody.appendChild(cardMain);
                cardBody.appendChild(cardType);

                linkElement.appendChild(cardBody);
                linksContainer.appendChild(linkElement);
            });

            // Mark that we've loaded work items
            hasLoadedWorkItems = true;

            // Now that we've added all items, set up the click handlers
            const cards = document.querySelectorAll('.card-bfx');
            initWorkHandlers(cards, linksDiv, titleElement, workDetails);

            // Add entrance animation after all items are loaded, but wait for GSAP to be ready
            // More robust check: animate if we haven't triggered the initial animation yet
            const shouldAnimate = !hasTriggeredInitialAnimation;
            
            if (shouldAnimate) {
                hasTriggeredInitialAnimation = true;
                
                // Mark that we're animating
                if (window.router) {
                    window.router.setAnimating(true);
                }
                
                whenGsapReady(() => {
                    workTransitionAnimator.animateListingEntrance({
                        duration: 0.8,
                        stagger: 0.6,
                        respectPrefersReducedMotion: true
                    });
                    
                    // Mark animation as complete
                    if (window.router) {
                        window.router.setAnimating(false);
                    }
                }, 5000, { 
                    checkVisibility: true,
                    fallbackOnError: true 
                }).then(success => {
                    if (!success) {
                        console.warn('Failed to animate listing entrance - GSAP not loaded in time');
                        // Fallback: make cards visible without animation
                        const cards = document.querySelectorAll('.card-bfx');
                        cards.forEach(card => {
                            card.style.opacity = '1';
                            card.style.transform = 'none';
                            card.style.visibility = 'visible';
                        });
                    }
                    // Mark as not animating regardless of success/failure
                    if (window.router) {
                        window.router.setAnimating(false);
                        window.router.setInitiallyAnimated(true);
                    }
                }).catch(error => {
                    console.error('Error in animation timing:', error);
                    // Fallback: make cards visible without animation
                    const cards = document.querySelectorAll('.card-bfx');
                    cards.forEach(card => {
                        card.style.opacity = '1';
                        card.style.transform = 'none';
                        card.style.visibility = 'visible';
                    });
                    // Mark as not animating
                    if (window.router) {
                        window.router.setAnimating(false);
                        window.router.setInitiallyAnimated(true);
                    }
                });
            } else {
                // Cards should not be animated (probably returning from another route)
                // Let the route handler manage the animation
                console.log('Skipping initial animation - will be handled by route transition');
            }
        }
    } catch (error) {
        console.error('Error fetching work items:', error);
    }
}

// Update reset function to also clear the tracking set
export function resetWorkItemsLoadedState() {
    hasLoadedWorkItems = false;
    addedItemIds.clear();
}