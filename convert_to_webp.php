<?php
function convertToWebP($source, $destination, $quality = 80) {
    $info = getimagesize($source);
    $isAlpha = false;

    switch ($info['mime']) {
        case 'image/jpeg':
            $image = imagecreatefromjpeg($source);
            break;
        case 'image/gif':
            $image = imagecreatefromgif($source);
            break;
        case 'image/png':
            $image = imagecreatefrompng($source);
            $isAlpha = true;
            break;
        default:
            return false;
    }

    if ($isAlpha) {
        imagepalettetotruecolor($image);
        imagealphablending($image, true);
        imagesavealpha($image, true);
    }

    if (imagewebp($image, $destination, $quality)) {
        imagedestroy($image);
        return $destination;
    } else {
        imagedestroy($image);
        return false;
    }
}

$sourceImage = $_GET['src'];
$cacheDir = 'assets/img/cache/';
$pathInfo = pathinfo($sourceImage);
$webpImage = $cacheDir . $pathInfo['filename'] . '.webp';

if (!file_exists($webpImage)) {
    if (!file_exists($cacheDir)) {
        mkdir($cacheDir, 0755, true);
    }
    if (!convertToWebP($sourceImage, $webpImage)) {
        http_response_code(500);
        echo "Failed to convert image to WebP.";
        exit;
    }
}

header('Content-Type: image/webp');
readfile($webpImage);
?>