<?php

// Get page number from query parameter, default to 1
$page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
$imagesPerPage = 12;

// open the directory
$myDirectory = opendir("assets/img/dump/");

// create an array to hold image files
$images = array();

// get each entry
while($entryName = readdir($myDirectory)) {
    $extension = pathinfo($entryName, PATHINFO_EXTENSION);
    // filter image files (you can add more extensions if needed)
    if (in_array(strtolower($extension), ['jpg', 'jpeg', 'png', 'webp'])) {
        $images[] = $entryName;
    }
}

// close directory
closedir($myDirectory);

// Get total number of images
$totalImages = count($images);
$totalPages = ceil($totalImages / $imagesPerPage);

// Ensure page number is valid
$page = max(1, min($page, $totalPages));

// Get the subset of images for the current page
$offset = ($page - 1) * $imagesPerPage;
$pagedImages = array_slice($images, $offset, $imagesPerPage);

// Prepare response
$response = [
    'images' => $pagedImages,
    'pagination' => [
        'currentPage' => $page,
        'totalPages' => $totalPages,
        'imagesPerPage' => $imagesPerPage,
        'totalImages' => $totalImages
    ]
];

// set content type to JSON and echo the response
header('Content-Type: application/json');
echo json_encode($response);
?>