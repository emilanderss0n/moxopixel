<?php
header('Content-Type: application/xml; charset=utf-8');

$isLocal = strpos($_SERVER['HTTP_HOST'], 'localhost') !== false;
$baseUrl = $isLocal ? 'http://localhost:8000/moxo' : 'https://' . $_SERVER['HTTP_HOST'];

// Load work items
$workItemsJson = file_get_contents('data/work_items.json');
$workData = json_decode($workItemsJson, true);

echo '<?xml version="1.0" encoding="UTF-8"?>' . "\n";
?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
    
    <!-- Homepage -->
    <url>
        <loc><?php echo $baseUrl; ?>/</loc>
        <lastmod><?php echo date('Y-m-d'); ?></lastmod>
        <changefreq>weekly</changefreq>
        <priority>1.0</priority>
    </url>
    
    <!-- About page -->
    <url>
        <loc><?php echo $baseUrl; ?>/about</loc>
        <lastmod><?php echo date('Y-m-d'); ?></lastmod>
        <changefreq>monthly</changefreq>
        <priority>0.8</priority>
    </url>
    
    <!-- Gallery page -->
    <url>
        <loc><?php echo $baseUrl; ?>/gallery</loc>
        <lastmod><?php echo date('Y-m-d'); ?></lastmod>
        <changefreq>weekly</changefreq>
        <priority>0.8</priority>
    </url>
    
    <?php foreach ($workData['work_items'] as $item): 
        $slug = strtolower(preg_replace('/[^a-z0-9]+/', '-', $item['title']));
        $slug = trim($slug, '-');
        $imageUrl = $baseUrl . '/assets/img/work_thumbs/' . $item['thumb'];
    ?>
    <!-- Work item: <?php echo htmlspecialchars($item['title']); ?> -->
    <url>
        <loc><?php echo $baseUrl; ?>/work/<?php echo $slug; ?></loc>
        <lastmod><?php echo date('Y-m-d'); ?></lastmod>
        <changefreq>monthly</changefreq>
        <priority>0.9</priority>
        <image:image>
            <image:loc><?php echo $imageUrl; ?></image:loc>
            <image:title><?php echo htmlspecialchars($item['title']); ?></image:title>
            <image:caption><?php echo htmlspecialchars($item['short_desc']); ?></image:caption>
        </image:image>
    </url>
    <?php endforeach; ?>
    
</urlset>
