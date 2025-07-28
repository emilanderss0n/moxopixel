import { fetchData } from './cache.js';
import { initWorkHandlers } from './workModule.js'; // Updated to use unified module
import { ImageLoader } from './Utils/imageLoader.js';
import { workTransitionAnimator } from './Utils/workTransitionAnimator.js';

// Track if we've already loaded work items to prevent duplicates
let hasLoadedWorkItems = false;
// Track which items have been added to prevent duplicates
const addedItemIds = new Set();

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

            // Pre-load all thumbnails first to avoid issues with the last items
            const thumbnailPromises = reversedItems.map(item => {
                const thumbnailUrl = `${baseUrl}/assets/img/work_thumbs/${item.thumb}`;
                return fetch(thumbnailUrl, { method: 'HEAD' })
                    .then(response => {
                        return { item, exists: response.ok };
                    })
                    .catch(error => {
                        return { item, exists: false };
                    });
            });

            // Wait for all thumbnail checks
            const thumbnailResults = await Promise.all(thumbnailPromises);

            reversedItems.forEach((item, index) => {
                // Skip if we've already added this item
                if (addedItemIds.has(item.id)) {
                    return;
                }

                // Add to tracking set
                addedItemIds.add(item.id);

                const linkElement = document.createElement('a');
                linkElement.href = "javascript:void(0);";
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
                linkElement.classList.add('list__item');
                linkElement.id = `work-card-${item.id}`;

                const cardBody = document.createElement('div');
                cardBody.classList.add('card-body');
                cardBody.classList.add('hover-effect-bg');

                const cardMain = document.createElement('div');
                cardMain.classList.add('card-main');

                const imageDiv = document.createElement('div');
                imageDiv.classList.add('image');

                // Create the image element
                const imgElement = document.createElement('img');
                imgElement.loading = 'lazy';
                imgElement.alt = item.title;
                imgElement.id = `work-image-${item.id}`;

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

                // Always use direct loading approach for all thumbnails
                imgElement.src = originalThumbPath;

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

            // Add entrance animation after all items are loaded
            workTransitionAnimator.animateListingEntrance();
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