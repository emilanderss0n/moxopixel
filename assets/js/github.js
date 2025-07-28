// Add data caching to avoid multiple fetches

// Cache for GitHub data
let cachedUserData = null;
let cachedRepos = null;
let isFetching = false;

/**
 * Preload GitHub data without rendering (using server-side cache)
 * @returns {Promise} Promise that resolves when data is loaded
 */
export function preloadGitHubData() {
    // Skip if we already have data or are currently fetching
    if (cachedUserData && cachedRepos || isFetching) {
        return Promise.resolve();
    }

    isFetching = true;

    const baseUrl = window.location.pathname.includes('/moxo') ? '/moxo' : '';
    const cacheEndpoint = `${baseUrl}/github-profile-cache.php`;

    return fetch(cacheEndpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            type: 'all'
        })
    })
        .then(response => response.json())
        .then(result => {
            if (result.success && result.user.success && result.repos.success) {
                cachedUserData = result.user.data;
                cachedRepos = result.repos.data;
            } else {
                throw new Error('Failed to fetch GitHub data from cache');
            }
            isFetching = false;
        })
        .catch(error => {
            console.warn('Failed to preload GitHub data from cache, falling back to direct API:', error);
            // Fallback to direct API calls
            return Promise.all([
                fetch('https://api.github.com/users/emilanderss0n'),
                fetch('https://api.github.com/users/emilanderss0n/repos')
            ])
                .then(([userResponse, reposResponse]) =>
                    Promise.all([userResponse.json(), reposResponse.json()])
                )
                .then(([userData, repos]) => {
                    cachedUserData = userData;
                    cachedRepos = repos;
                    isFetching = false;
                })
                .catch(fallbackError => {
                    console.warn('Direct GitHub API also failed:', fallbackError);
                    isFetching = false;
                });
        });
}

/**
 * Render GitHub data in the container
 * @param {HTMLElement} container The container to render GitHub data into
 */
export async function fetchGitHubData(container) {
    if (!container) return;

    // If we're already loading, wait for it to complete
    if (isFetching) {
        const waitForLoad = async () => {
            while (isFetching) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        };
        await waitForLoad();
    }

    try {
        // Use cached data if available, otherwise fetch it
        let userData = cachedUserData;
        let repos = cachedRepos;

        if (!userData || !repos) {
            isFetching = true;

            const baseUrl = window.location.pathname.includes('/moxo') ? '/moxo' : '';
            const cacheEndpoint = `${baseUrl}/github-profile-cache.php`;

            try {
                const response = await fetch(cacheEndpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        type: 'all'
                    })
                });

                const result = await response.json();

                if (result.success && result.user.success && result.repos.success) {
                    userData = result.user.data;
                    repos = result.repos.data;
                    
                    // Update cache
                    cachedUserData = userData;
                    cachedRepos = repos;
                } else {
                    throw new Error('Cache endpoint failed');
                }
            } catch (cacheError) {
                console.warn('Cache failed, falling back to direct API:', cacheError);
                
                // Fallback to direct GitHub API calls
                const [userResponse, reposResponse] = await Promise.all([
                    fetch('https://api.github.com/users/emilanderss0n'),
                    fetch('https://api.github.com/users/emilanderss0n/repos')
                ]);

                userData = await userResponse.json();
                repos = await reposResponse.json();

                // Update cache
                cachedUserData = userData;
                cachedRepos = repos;
            }

            isFetching = false;
        }

        // Render the data
        const userBadge = `
            <div class="github-header">
                <div class="user-badge">
                    <div class="github-brand">
                        <i class="bi bi-github"></i>
                        <a href="${userData.html_url}" target="_blank">emilanderss0n</a>
                    </div>
                    <img class="avatar" src="${userData.avatar_url}" alt="Profile picture" />
                </div>
            </div>`;

        const reposList = repos
            .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
            .slice(0, 20)
            .map(repo => `
                <div class="repo-item">
                    <h2><a href="${repo.html_url}" target="_blank" class="github-link">${repo.name}</a></h2>
                    <p>${repo.description || ''}</p>
                </div>
            `).join('');

        container.innerHTML = userBadge + reposList;
    } catch (error) {
        console.warn('Failed to fetch GitHub data:', error);
        container.style.display = 'none';
    }
}

/**
 * Check if GitHub data has been preloaded
 * @returns {boolean} True if data is already loaded
 */
export function isGitHubDataPreloaded() {
    return !!(cachedUserData && cachedRepos);
}

/**
 * Reset GitHub data cache
 */
export function clearGitHubCache() {
    cachedUserData = null;
    cachedRepos = null;
    isFetching = false;
}

/**
 * Fetch README content from a GitHub repository (using server-side cache)
 * @param {string} repoUrl - The GitHub repository URL
 * @returns {Promise<string>} Promise that resolves to the README HTML content
 */
export async function fetchGitHubReadme(repoUrl) {
    try {
        const baseUrl = window.location.pathname.includes('/moxo') ? '/moxo' : '';
        
        // Use our server-side caching endpoint
        const cacheEndpoint = `${baseUrl}/github-cache.php`;
        
        const response = await fetch(cacheEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                repo_url: repoUrl
            })
        });

        if (!response.ok) {
            throw new Error(`Cache endpoint failed: ${response.status}`);
        }

        const result = await response.json();
        
        if (!result.success) {
            throw new Error(`GitHub cache error: ${result.error}`);
        }

        // Return the content directly without cache info or CSS injection
        return result.content;
    } catch (error) {
        console.warn('Failed to fetch GitHub README from cache, falling back to direct API:', error);
        
        // Fallback to direct GitHub API call
        return await fetchGitHubReadmeDirect(repoUrl);
    }
}

/**
 * Fallback function to fetch README directly from GitHub API (no caching)
 * @param {string} repoUrl - The GitHub repository URL
 * @returns {Promise<string>} Promise that resolves to the README HTML content
 */
async function fetchGitHubReadmeDirect(repoUrl) {
    try {
        // Extract owner and repo from URL
        const urlParts = repoUrl.replace('https://github.com/', '').split('/');
        const owner = urlParts[0];
        const repo = urlParts[1];
        
        if (!owner || !repo) {
            throw new Error('Invalid GitHub URL format');
        }

        // First, get the README content
        const readmeResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/readme`);
        
        if (!readmeResponse.ok) {
            throw new Error(`Failed to fetch README: ${readmeResponse.status}`);
        }

        const readmeData = await readmeResponse.json();
        
        // Decode base64 content with proper UTF-8 handling
        const markdownContent = decodeBase64UTF8(readmeData.content);
        
        // Use GitHub's Markdown API to render it exactly as GitHub does
        const renderResponse = await fetch('https://api.github.com/markdown', {
            method: 'POST',
            headers: {
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                text: markdownContent,
                mode: 'gfm', // GitHub Flavored Markdown
                context: `${owner}/${repo}` // Repository context for relative links
            })
        });

        if (!renderResponse.ok) {
            console.warn('GitHub Markdown API failed, falling back to simple converter');
            return convertMarkdownToHtml(markdownContent);
        }

        const htmlContent = await renderResponse.text();
        
        // Return content directly without wrapper or cache info
        return htmlContent;
        
    } catch (error) {
        console.warn('Direct GitHub API also failed:', error);
        throw error;
    }
}

/**
 * Simple markdown to HTML converter
 * @param {string} markdown - The markdown content
 * @returns {string} HTML content
 */
function convertMarkdownToHtml(markdown) {
    let html = markdown;
    
    // Convert headers
    html = html.replace(/^### (.*$)/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.*$)/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.*$)/gm, '<h1>$1</h1>');
    
    // Convert bold and italic
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    // Convert links
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
    
    // Convert images
    html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" style="max-width: 100%; height: auto;">');
    
    // Convert code blocks
    html = html.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
    
    // Convert lists
    html = html.replace(/^\* (.*$)/gm, '<li>$1</li>');
    html = html.replace(/^- (.*$)/gm, '<li>$1</li>'); 
    
    // Wrap lists in ul tags
    html = html.replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>');
    
    // Convert line breaks
    html = html.replace(/\n\n/g, '</p><p>');
    html = html.replace(/\n/g, '<br>');
    
    // Wrap in paragraphs
    html = '<p>' + html + '</p>';
    
    // Clean up multiple paragraph tags
    html = html.replace(/<p><\/p>/g, '');
    html = html.replace(/<p>(<h[1-6]>)/g, '$1');
    html = html.replace(/(<\/h[1-6]>)<\/p>/g, '$1');
    html = html.replace(/<p>(<ul>)/g, '$1');
    html = html.replace(/(<\/ul>)<\/p>/g, '$1');
    html = html.replace(/<p>(<pre>)/g, '$1');
    html = html.replace(/(<\/pre>)<\/p>/g, '$1');
    
    return html;
}

/**
 * Properly decode base64 content with UTF-8 support
 * @param {string} base64Content - Base64 encoded content
 * @returns {string} UTF-8 decoded content
 */
function decodeBase64UTF8(base64Content) {
    try {
        // Remove any whitespace/newlines from base64 content
        const cleanBase64 = base64Content.replace(/\s/g, '');
        
        // Decode base64 to binary string
        const binaryString = atob(cleanBase64);
        
        // Convert binary string to Uint8Array
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        
        // Decode UTF-8 bytes to string
        return new TextDecoder('utf-8').decode(bytes);
    } catch (error) {
        console.warn('Failed to decode base64 UTF-8 content, falling back to simple atob:', error);
        return atob(base64Content.replace(/\s/g, ''));
    }
}
