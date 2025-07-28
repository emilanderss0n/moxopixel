<?php
// Prevent any output before headers
ob_start();

// Force PHP to show errors
ini_set('display_errors', 1);
error_reporting(E_ALL);

// Determine if we're in local development or production
$isLocal = strpos($_SERVER['HTTP_HOST'], 'localhost') !== false;
$baseDir = $isLocal ? '/moxo' : '';

// Get the requested file
$file = $_GET['file'] ?? '';

if (empty($file)) {
    die('console.error("No file specified");');
}

// Validate file path to prevent directory traversal
$file = str_replace('..', '', $file);

// Construct the full file path
$fullPath = __DIR__ . '/assets/js/' . $file;

// Set appropriate content type
header('Content-Type: application/javascript');
header('X-Content-Type-Options: nosniff');

// Check if file exists
if (file_exists($fullPath)) {
    // Read and serve the file
    readfile($fullPath);
} else {
    http_response_code(404);
    echo "console.error('File not found: $file');";
}
