<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

class GitHubProfileCacheManager {
    private $cacheDir;
    private $cacheLifetime;
    private $username;

    public function __construct($username = 'emilanderss0n', $cacheDir = './cache', $cacheLifetimeHours = 24) {
        $this->username = $username;
        $this->cacheDir = $cacheDir;
        $this->cacheLifetime = $cacheLifetimeHours * 3600; // Convert to seconds
        
        // Create cache directory if it doesn't exist
        if (!is_dir($this->cacheDir)) {
            mkdir($this->cacheDir, 0755, true);
        }
    }

    /**
     * Generate cache file path for GitHub profile data
     */
    private function getCacheFilePath($type) {
        $filename = sprintf('github_%s_%s.json', $type, $this->username);
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
     * Get cached data
     */
    private function getCachedData($filePath) {
        if (!$this->isCacheValid($filePath)) {
            return null;
        }
        
        $data = file_get_contents($filePath);
        return $data ? json_decode($data, true) : null;
    }

    /**
     * Save data to cache
     */
    private function saveToCache($filePath, $data) {
        $cacheData = [
            'data' => $data,
            'cached_at' => time(),
            'expires_at' => time() + $this->cacheLifetime
        ];
        
        $jsonData = json_encode($cacheData, JSON_PRETTY_PRINT);
        return file_put_contents($filePath, $jsonData) !== false;
    }

    /**
     * Fetch data from GitHub API using cURL
     */
    private function fetchFromGitHub($endpoint) {
        $url = "https://api.github.com/{$endpoint}";
        
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_USERAGENT, 'MoxoPixel-Profile-Cache/1.0');
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Accept: application/vnd.github.v3+json'
        ]);
        curl_setopt($ch, CURLOPT_TIMEOUT, 30);
        curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
        curl_setopt($ch, CURLOPT_FAILONERROR, false);
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlError = curl_error($ch);
        curl_close($ch);
        
        if ($response === false || !empty($curlError)) {
            throw new Exception("cURL failed to fetch data: " . $curlError);
        }
        
        if ($httpCode !== 200) {
            throw new Exception("GitHub API returned HTTP {$httpCode}");
        }
        
        return json_decode($response, true);
    }

    /**
     * Get user profile data
     */
    public function getUserData() {
        $cacheFile = $this->getCacheFilePath('user');
        
        // Try to get from cache first
        $cachedData = $this->getCachedData($cacheFile);
        if ($cachedData) {
            return [
                'success' => true,
                'data' => $cachedData['data'],
                'source' => 'cache'
            ];
        }

        try {
            // Fetch from GitHub API
            $userData = $this->fetchFromGitHub("users/{$this->username}");
            
            // Save to cache
            $this->saveToCache($cacheFile, $userData);
            
            return [
                'success' => true,
                'data' => $userData,
                'source' => 'github_api'
            ];
        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => $e->getMessage(),
                'source' => 'error'
            ];
        }
    }

    /**
     * Get repositories data
     */
    public function getReposData() {
        $cacheFile = $this->getCacheFilePath('repos');
        
        // Try to get from cache first
        $cachedData = $this->getCachedData($cacheFile);
        if ($cachedData) {
            return [
                'success' => true,
                'data' => $cachedData['data'],
                'source' => 'cache'
            ];
        }

        try {
            // Fetch from GitHub API
            $reposData = $this->fetchFromGitHub("users/{$this->username}/repos");
            
            // Save to cache
            $this->saveToCache($cacheFile, $reposData);
            
            return [
                'success' => true,
                'data' => $reposData,
                'source' => 'github_api'
            ];
        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => $e->getMessage(),
                'source' => 'error'
            ];
        }
    }

    /**
     * Get both user and repos data
     */
    public function getAllData() {
        $userData = $this->getUserData();
        $reposData = $this->getReposData();
        
        return [
            'success' => $userData['success'] && $reposData['success'],
            'user' => $userData,
            'repos' => $reposData
        ];
    }

    /**
     * Clear cache for user data
     */
    public function clearUserCache() {
        $cacheFile = $this->getCacheFilePath('user');
        if (file_exists($cacheFile)) {
            return unlink($cacheFile);
        }
        return true;
    }

    /**
     * Clear cache for repos data
     */
    public function clearReposCache() {
        $cacheFile = $this->getCacheFilePath('repos');
        if (file_exists($cacheFile)) {
            return unlink($cacheFile);
        }
        return true;
    }

    /**
     * Clear all profile cache
     */
    public function clearAllCache() {
        return $this->clearUserCache() && $this->clearReposCache();
    }
}

// Handle the request
try {
    $input = json_decode(file_get_contents('php://input'), true);
    $method = $_SERVER['REQUEST_METHOD'];
    
    $type = 'all'; // Default to both user and repos
    
    if ($method === 'GET' && isset($_GET['type'])) {
        $type = $_GET['type'];
    } elseif ($method === 'POST' && isset($input['type'])) {
        $type = $input['type'];
    }

    $cacheManager = new GitHubProfileCacheManager('emilanderss0n', './cache', 24);
    
    // Handle cache clearing if requested
    if (isset($_GET['clear_cache']) && $_GET['clear_cache'] === 'true') {
        $cacheManager->clearAllCache();
    }
    
    switch ($type) {
        case 'user':
            $result = $cacheManager->getUserData();
            break;
        case 'repos':
            $result = $cacheManager->getReposData();
            break;
        case 'all':
        default:
            $result = $cacheManager->getAllData();
            break;
    }
    
    echo json_encode($result);
    
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>
