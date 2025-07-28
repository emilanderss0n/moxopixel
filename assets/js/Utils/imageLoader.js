export class ImageLoader {
    constructor() {
        this.activeLoaders = new Set();
        this.loadingCache = new Map();
        this.errorCache = new Set();
    }

    cleanup() {
        document.querySelectorAll('#activityContent').forEach(loader => loader.remove());
        this.activeLoaders.clear();
    }

    createLoader() {
        const loader = document.createElement('div');
        loader.id = 'activityContent';
        const spinnerDiv = document.createElement('div');
        spinnerDiv.className = 'loader';
        loader.appendChild(spinnerDiv);
        return loader;
    }

    async preloadImage(src) {
        // Don't try to preload images we know have failed
        if (this.errorCache.has(src)) {
            return Promise.reject(new Error(`Skipping previously failed image: ${src}`));
        }

        if (this.loadingCache.has(src)) {
            return this.loadingCache.get(src);
        }

        const promise = new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => {
                this.errorCache.add(src);
                reject(new Error(`Failed to preload image: ${src}`));
            };
            img.src = src;
        });

        this.loadingCache.set(src, promise);

        try {
            const result = await promise;
            return result;
        } catch (error) {
            this.loadingCache.delete(src);
            throw error;
        }
    }

    async loadImageWithLoader(container, img, src) {
        // Skip if already loading or previously failed
        if (this.activeLoaders.has(src) || this.errorCache.has(src)) return;

        this.activeLoaders.add(src);

        const loader = this.createLoader();
        container.appendChild(loader);

        return new Promise((resolve, reject) => {
            // Set initial styles for smooth transition
            img.style.opacity = '0';
            img.style.transition = 'opacity 0.3s ease';

            const cleanup = () => {
                this.activeLoaders.delete(src);
                if (loader.parentNode === container) {
                    loader.remove();
                }
            };

            const setFallbackImage = () => {
                // Get base URL from the src (everything before /assets/)
                const baseUrlMatch = src.match(/(.*?)(\/assets\/)/);
                const baseUrl = baseUrlMatch ? baseUrlMatch[1] : '';

                // Try a placeholder image
                this.errorCache.add(src);
                img.src = `${baseUrl}/assets/img/placeholder.png`;
                img.style.opacity = '1';
                cleanup();
                resolve(); // Resolve anyway to continue UI flow
            };

            img.onload = () => {
                cleanup();
                img.style.opacity = '1';
                resolve();
            };

            img.onerror = () => {
                console.warn(`Failed to load image: ${src}`);
                setFallbackImage();
            };

            // Start loading the image
            img.src = src;

            // No timeout fallback as requested
        });
    }

    // Direct method for critical images
    loadImageDirectly(img, src) {
        if (this.errorCache.has(src)) {
            const baseUrlMatch = src.match(/(.*?)(\/assets\/)/);
            const baseUrl = baseUrlMatch ? baseUrlMatch[1] : '';
            img.src = `${baseUrl}/assets/img/placeholder.png`;
            return Promise.resolve();
        }

        return new Promise((resolve) => {
            img.onload = () => resolve();
            img.onerror = () => {
                this.errorCache.add(src);
                const baseUrlMatch = src.match(/(.*?)(\/assets\/)/);
                const baseUrl = baseUrlMatch ? baseUrlMatch[1] : '';
                img.src = `${baseUrl}/assets/img/placeholder.png`;
                resolve();
            };
            img.src = src;
        });
    }
}
