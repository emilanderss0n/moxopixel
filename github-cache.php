<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

class GitHubCacheManager {
    private $cacheDir;
    private $cacheLifetime;

    public function __construct($cacheDir = './cache', $cacheLifetimeHours = 24) {
        $this->cacheDir = $cacheDir;
        $this->cacheLifetime = $cacheLifetimeHours * 3600; // Convert to seconds
        
        // Create cache directory if it doesn't exist
        if (!is_dir($this->cacheDir)) {
            mkdir($this->cacheDir, 0755, true);
        }
    }

    /**
     * Generate cache file path for a GitHub repository
     */
    private function getCacheFilePath($owner, $repo) {
        $filename = sprintf('github_readme_%s_%s.json', $owner, $repo);
        return $this->cacheDir . '/' . $filename;
    }

    /**
     * Check if cache file exists and is still valid
     */
    private function isCacheValid($filePath) {
        if (!file_exists($filePath)) {
            return false;
        }
        
        return (time() - filemtime($filePath)) < $this->cacheLifetime;
    }

    /**
     * Get cached README data
     */
    private function getCachedData($filePath) {
        if (!$this->isCacheValid($filePath)) {
            return null;
        }
        
        $data = file_get_contents($filePath);
        return $data ? json_decode($data, true) : null;
    }

    /**
     * Save README data to cache
     */
    private function saveToCache($filePath, $data) {
        $jsonData = json_encode($data, JSON_PRETTY_PRINT);
        return file_put_contents($filePath, $jsonData) !== false;
    }

    /**
     * Fetch README from GitHub API
     */
    private function fetchFromGitHub($owner, $repo) {
        // Check if allow_url_fopen is enabled
        if (!ini_get('allow_url_fopen')) {
            return $this->fetchWithCurl($owner, $repo);
        }
        
        // Fetch README metadata
        $readmeUrl = "https://api.github.com/repos/{$owner}/{$repo}/readme";
        $context = stream_context_create([
            'http' => [
                'method' => 'GET',
                'header' => [
                    'User-Agent: MoxoPixel-Cache/1.0',
                    'Accept: application/vnd.github.v3+json'
                ],
                'timeout' => 30,
                'ignore_errors' => true // Don't treat HTTP errors as fatal
            ],
            'ssl' => [
                'verify_peer' => false,
                'verify_peer_name' => false,
                'allow_self_signed' => true
            ]
        ]);

        $readmeResponse = @file_get_contents($readmeUrl, false, $context);
        
        if ($readmeResponse === false) {
            // Check if it's a network/connectivity issue
            if (function_exists('curl_version')) {
                return $this->fetchWithCurl($owner, $repo);
            }
            
            $error = error_get_last();
            throw new Exception("Failed to fetch README from GitHub API: " . ($error['message'] ?? 'Unknown error'));
        }
        
        // Check HTTP response code
        if (isset($http_response_header)) {
            $responseCode = null;
            foreach ($http_response_header as $header) {
                if (preg_match('/HTTP\/\d\.\d\s+(\d+)/', $header, $matches)) {
                    $responseCode = (int)$matches[1];
                    break;
                }
            }
            
            if ($responseCode && $responseCode !== 200) {
                if ($responseCode === 404) {
                    throw new Exception("Repository or README not found (HTTP 404)");
                } elseif ($responseCode === 403) {
                    throw new Exception("GitHub API rate limit exceeded (HTTP 403)");
                } else {
                    throw new Exception("GitHub API returned HTTP $responseCode");
                }
            }
        }

        $readmeData = json_decode($readmeResponse, true);
        if (!$readmeData || !isset($readmeData['content'])) {
            throw new Exception("Invalid README response from GitHub API");
        }

        // Decode base64 content with proper UTF-8 handling
        $markdownContent = base64_decode($readmeData['content']);
        
        // Use GitHub's Markdown API to render it
        $renderUrl = "https://api.github.com/markdown";
        $renderPayload = json_encode([
            'text' => $markdownContent,
            'mode' => 'gfm',
            'context' => "{$owner}/{$repo}"
        ]);

        $renderContext = stream_context_create([
            'http' => [
                'method' => 'POST',
                'header' => [
                    'User-Agent: MoxoPixel-Cache/1.0',
                    'Accept: application/vnd.github.v3+json',
                    'Content-Type: application/json',
                    'Content-Length: ' . strlen($renderPayload)
                ],
                'content' => $renderPayload,
                'timeout' => 30,
                'ignore_errors' => true
            ],
            'ssl' => [
                'verify_peer' => false,
                'verify_peer_name' => false,
                'allow_self_signed' => true
            ]
        ]);

        $htmlContent = @file_get_contents($renderUrl, false, $renderContext);
        if ($htmlContent === false) {
            // Try with cURL for markdown rendering
            $htmlContent = $this->renderMarkdownWithCurl($markdownContent, $owner, $repo);
        }

        return [
            'success' => true,
            'content' => $htmlContent,
            'cached_at' => time(),
            'source' => 'github_api'
        ];
    }

    /**
     * Simple markdown to HTML converter (fallback)
     */
    private function simpleMarkdownToHtml($markdown) {
        $html = $markdown;
        
        // Convert headers
        $html = preg_replace('/^### (.*)$/m', '<h3>$1</h3>', $html);
        $html = preg_replace('/^## (.*)$/m', '<h2>$1</h2>', $html);
        $html = preg_replace('/^# (.*)$/m', '<h1>$1</h1>', $html);
        
        // Convert bold and italic
        $html = preg_replace('/\*\*(.*?)\*\*/s', '<strong>$1</strong>', $html);
        $html = preg_replace('/\*(.*?)\*/s', '<em>$1</em>', $html);
        
        // Convert links
        $html = preg_replace('/\[([^\]]+)\]\(([^)]+)\)/', '<a href="$2" target="_blank">$1</a>', $html);
        
        // Convert images
        $html = preg_replace('/!\[([^\]]*)\]\(([^)]+)\)/', '<img src="$2" alt="$1" style="max-width: 100%; height: auto;">', $html);
        
        // Convert code blocks
        $html = preg_replace('/```(.*?)```/s', '<pre><code>$1</code></pre>', $html);
        $html = preg_replace('/`([^`]+)`/', '<code>$1</code>', $html);
        
        // Convert line breaks
        $html = preg_replace('/\n\n/', '</p><p>', $html);
        $html = preg_replace('/\n/', '<br>', $html);
        
        // Wrap in paragraphs
        $html = '<p>' . $html . '</p>';
        
        // Clean up
        $html = preg_replace('/<p><\/p>/', '', $html);
        $html = preg_replace('/<p>(<h[1-6]>)/', '$1', $html);
        $html = preg_replace('/(<\/h[1-6]>)<\/p>/', '$1', $html);
        
        return $html;
    }

    /**
     * Get README content (from cache or GitHub API)
     */
    public function getReadme($owner, $repo) {
        $cacheFile = $this->getCacheFilePath($owner, $repo);
        
        // Try to get from cache first
        $cachedData = $this->getCachedData($cacheFile);
        if ($cachedData) {
            $cachedData['source'] = 'cache';
            return $cachedData;
        }

        try {
            // Fetch from GitHub API
            $data = $this->fetchFromGitHub($owner, $repo);
            
            // Save to cache
            $this->saveToCache($cacheFile, $data);
            
            return $data;
        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => $e->getMessage(),
                'source' => 'error'
            ];
        }
    }

    /**
     * Clear cache for a specific repository
     */
    public function clearCache($owner, $repo) {
        $cacheFile = $this->getCacheFilePath($owner, $repo);
        if (file_exists($cacheFile)) {
            return unlink($cacheFile);
        }
        return true;
    }

    /**
     * Clear all cache files older than specified time
     */
    public function clearOldCache($maxAgeHours = 24) {
        $maxAge = $maxAgeHours * 3600;
        $cleared = 0;
        
        if (is_dir($this->cacheDir)) {
            $files = glob($this->cacheDir . '/github_readme_*.json');
            foreach ($files as $file) {
                if ((time() - filemtime($file)) > $maxAge) {
                    if (unlink($file)) {
                        $cleared++;
                    }
                }
            }
        }
        
        return $cleared;
    }

    /**
     * Fetch README using cURL (fallback method)
     */
    private function fetchWithCurl($owner, $repo) {
        // Fetch README metadata with cURL
        $readmeUrl = "https://api.github.com/repos/{$owner}/{$repo}/readme";
        
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $readmeUrl);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_USERAGENT, 'MoxoPixel-Cache/1.0');
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Accept: application/vnd.github.v3+json'
        ]);
        curl_setopt($ch, CURLOPT_TIMEOUT, 30);
        curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false); // For local development
        curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false); // For local development
        curl_setopt($ch, CURLOPT_VERBOSE, false);
        curl_setopt($ch, CURLOPT_FAILONERROR, false); // Don't fail on HTTP errors
        
        $readmeResponse = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlError = curl_error($ch);
        curl_close($ch);
        
        if ($readmeResponse === false || !empty($curlError)) {
            throw new Exception("cURL failed to fetch README: " . $curlError);
        }
        
        if ($httpCode !== 200) {
            throw new Exception("GitHub API returned HTTP {$httpCode}");
        }
        
        $readmeData = json_decode($readmeResponse, true);
        if (!$readmeData || !isset($readmeData['content'])) {
            throw new Exception("Invalid README response from GitHub API via cURL");
        }
        
        // Decode base64 content with proper UTF-8 handling
        $markdownContent = base64_decode($readmeData['content']);
        
        // Use GitHub's Markdown API to render it with cURL
        $renderUrl = "https://api.github.com/markdown";
        $renderPayload = json_encode([
            'text' => $markdownContent,
            'mode' => 'gfm',
            'context' => "{$owner}/{$repo}"
        ]);
        
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $renderUrl);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $renderPayload);
        curl_setopt($ch, CURLOPT_USERAGENT, 'MoxoPixel-Cache/1.0');
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Accept: application/vnd.github.v3+json',
            'Content-Type: application/json',
            'Content-Length: ' . strlen($renderPayload)
        ]);
        curl_setopt($ch, CURLOPT_TIMEOUT, 30);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        
        $htmlContent = curl_exec($ch);
        $renderHttpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $renderCurlError = curl_error($ch);
        curl_close($ch);
        
        if ($htmlContent === false || !empty($renderCurlError) || $renderHttpCode !== 200) {
            $htmlContent = $this->simpleMarkdownToHtml($markdownContent);
        }
        
        return [
            'success' => true,
            'content' => $htmlContent,
            'cached_at' => time(),
            'source' => 'github_api_curl'
        ];
    }

    /**
     * Render markdown using cURL (fallback for GitHub Markdown API)
     */
    private function renderMarkdownWithCurl($markdownContent, $owner, $repo) {
        $renderUrl = "https://api.github.com/markdown";
        $renderPayload = json_encode([
            'text' => $markdownContent,
            'mode' => 'gfm',
            'context' => "{$owner}/{$repo}"
        ]);
        
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $renderUrl);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $renderPayload);
        curl_setopt($ch, CURLOPT_USERAGENT, 'MoxoPixel-Cache/1.0');
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Accept: application/vnd.github.v3+json',
            'Content-Type: application/json',
            'Content-Length: ' . strlen($renderPayload)
        ]);
        curl_setopt($ch, CURLOPT_TIMEOUT, 30);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
        
        $htmlContent = curl_exec($ch);
        $renderHttpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $renderCurlError = curl_error($ch);
        curl_close($ch);
        
        if ($htmlContent === false || !empty($renderCurlError) || $renderHttpCode !== 200) {
            return $this->simpleMarkdownToHtml($markdownContent);
        }
        
        return $htmlContent;
    }
}

// Handle the request
try {
    $input = json_decode(file_get_contents('php://input'), true);
    $method = $_SERVER['REQUEST_METHOD'];
    
    if ($method === 'GET' && isset($_GET['repo_url'])) {
        $repoUrl = $_GET['repo_url'];
    } elseif ($method === 'POST' && isset($input['repo_url'])) {
        $repoUrl = $input['repo_url'];
    } else {
        throw new Exception('No repository URL provided');
    }

    // Extract owner and repo from URL
    $repoUrl = str_replace('https://github.com/', '', $repoUrl);
    $parts = explode('/', $repoUrl);
    
    if (count($parts) < 2) {
        throw new Exception('Invalid GitHub URL format');
    }
    
    $owner = $parts[0];
    $repo = $parts[1];

    $cacheManager = new GitHubCacheManager('./cache', 24);
    
    // Handle cache clearing if requested
    if (isset($_GET['clear_cache']) && $_GET['clear_cache'] === 'true') {
        $cacheManager->clearCache($owner, $repo);
    }
    
    $result = $cacheManager->getReadme($owner, $repo);
    
    echo json_encode($result);
    
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>
