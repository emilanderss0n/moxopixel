<?php
$base = (strpos($_SERVER['HTTP_HOST'], 'localhost') !== false) ? '/moxo/' : '/';
?>
<!DOCTYPE html>
<html lang="en" data-bs-theme="dark">
<head>
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    
    <meta charset="UTF-8" />
    <base href="<?php echo $base; ?>">
    <title>MOXOPIXEL // Game Art</title>
    <meta name="viewport" content="width=device-width,initial-scale=1,minimum-scale=1,maximum-scale=1">
    <meta name="description" content="Modding work of MoxoPixel. MoxoPixel has been creating digital art for 20+ years." />
    <meta property="og:image" content="assets/img/icon.png" />
    <meta property="og:description" content="Modding work of MoxoPixel. MoxoPixel has been creating digital art for 20+ years." />
    <meta property="og:title" content="MOXOPIXEL // Game Art" />
    <meta name="view-transition" content="same-origin" />

    <link rel="stylesheet" type="text/css" href="assets/css/main.css">
    <link rel="stylesheet" href="assets/css/bootstrap-icons.min.css" media="print" onload="this.media='all'">
    <link rel="stylesheet" type="text/css" href="assets/css/medium-zoom.css" media="print" onload="this.media='all'">
    <link rel="stylesheet" href="https://unpkg.com/lenis@1.3.1/dist/lenis.css">
    
    <link rel="icon" href="assets/img/favicon.png">

    <link href="https://fonts.googleapis.com/css2?family=Tektur:wght@400..900&family=Titillium+Web:ital,wght@0,200;0,300;0,400;0,600;0,700;0,900;1,200;1,300;1,400;1,600;1,700&display=swap" 
          rel="stylesheet"
          media="print"
          onload="this.media='all'">

    <style>
        .fonts-loading {
            font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
        }
    </style>
</head>
<body class="fonts-loading">
    <script>
        // Remove loading class once fonts are loaded
        if (document.fonts) {
            document.fonts.ready.then(() => {
                document.body.classList.remove('fonts-loading');
            });
        }
    </script>

    <div class="content-wrap">

        <nav class="navbar flex-default animate-in">
            <a class="navbar-brand" href="./"><img src="assets/img/moxopixel_logo.png" alt="MoxoPixel Logotype" /></a>
            <div id="navbarSupportedContent">
                <div class="right link-container">
                    <div class="social-links">
                        <a class="icon github" href="https://github.com/emilanderss0n" target="_blank" tabindex="-1">
                            <span class="tooltip">GitHub</span>
                            <i class="bi bi-github"></i>
                        </a>
                        <a class="icon youtube" href="https://www.youtube.com/@moxopixel" target="_blank" tabindex="-1">
                            <span class="tooltip">YouTube</span>
                            <i class="bi bi-youtube"></i>
                        </a>
                        <a class="icon ex" href="https://x.com/bobemil_sw13" target="_blank" tabindex="-1">
                            <span class="tooltip">X</span>
                            <i class="bi bi-twitter-x"></i>
                        </a>
                        <a class="icon artstation" href="https://www.artstation.com/emils-graphics" target="_blank" tabindex="-1">
                            <span class="tooltip">ArtStation</span>
                            <svg width="20px" height="20px" viewBox="0 0 24 24" role="img" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"><title>ArtStation icon</title><path d="M0 17.723l2.027 3.505h.001a2.424 2.424 0 0 0 2.164 1.333h13.457l-2.792-4.838H0zm24 .025c0-.484-.143-.935-.388-1.314L15.728 2.728a2.424 2.424 0 0 0-2.142-1.289H9.419L21.598 22.54l1.92-3.325c.378-.637.482-.919.482-1.467zm-11.129-3.462L7.428 4.858l-5.444 9.428h10.887z"></path></g></svg>
                        </a>
                    </div>
                </div>
                <label id="nav-mobile" class="hamburger" tabindex="0" for="nav-checkbox" role="button" aria-haspopup="true" aria-expanded="false" aria-label="Toggle navigation menu">
                    <input type="checkbox" id="nav-checkbox">
                    <svg viewBox="0 0 32 32">
                        <path class="line line-top-bottom" d="M27 10 13 10C10.8 10 9 8.2 9 6 9 3.5 10.8 2 13 2 15.2 2 17 3.8 17 6L17 26C17 28.2 18.8 30 21 30 23.2 30 25 28.2 25 26 25 23.8 23.2 22 21 22L7 22"></path>
                        <path class="line" d="M7 16 27 16"></path>
                    </svg>
                </label>
            </div>
            <div class="navbar-gradient-blur"></div>
        </nav>

        <div class="container-fluid main-app">

            <div id="loadingContainer" class="item-info-item">
                <div class="body" id="loadingContent">
                </div>
            </div>
            
            <div id="mainContainer" class="item-info-item">
                <div class="body" id="mainContent">
                    <div class="main-sidebar">
                        <div class="main-title">
                            <span class="default-title animate-in animate-d1">Modding Work</span>
                        </div>
                        <nav class="nav-menu" role="navigation" aria-label="Main menu">
                            <div class="nav-menu-inner">
                                <div class="nav-item animate-in animate-d2">
                                    <a href="#" class="nav-link home-trigger hover-effect hover-effect-cursor-square" tabindex="-1">
                                        <span>Home</span>
                                    </a>
                                </div>
                                <div class="nav-item animate-in animate-d3">
                                    <a href="#" class="nav-link about-trigger hover-effect hover-effect-cursor-square" tabindex="-1">
                                        <span>About Me</span>
                                    </a>
                                </div>
                                <div class="nav-item animate-in animate-d4">
                                    <a href="#" class="nav-link image-gallery-trigger hover-effect hover-effect-cursor-square" tabindex="-1">
                                        <span>Gallery</span>
                                    </a>
                                </div>
                            </div>
                        </nav>
                    </div>

                    <div id="mainContentInner">

                        <div class="work-details">
                            
                        </div>

                        <div class="links animate-in animate-d2"></div>

                    </div>

                    <div id="aboutContent">
                        <div class="about-title hover-effect hover-effect-cursor-square">Hello! I'm MoxoPixel</div>
                        <div class="about-content animate-in">
                            <p class="about-intro">My real name is Emil, and I have been a digital artist for over 20 years, specializing in high-detail custom content. Based in Sweden, I began exploring game modding a few years ago and quickly developed a passion for texturing 3D models. This website serves as a portfolio of my work and projects in the modding community, highlighting my dedication to enhancing the longevity and experience of the games I modify.</p>
                            <div class="github-component grid" grid-max-col-count="3"></div>
                            <p class="foot-note">This site was built by me with JS, PHP and CSS. Web development is also a passion of mine. Visit <a href="https://emils.graphics" target="_blank">https://emils.graphics</a> to learn more.</p>
                            <a class="kofi" href="https://ko-fi.com/moxopixel" target="_blank"></a>
                        </div>
                    </div>

                    <div id="imageContainer">
                        <div class="body animate-in animate-d1" id="imageContent">

                        </div>
                    </div>

                </div><!-- /#mainContent -->
            </div><!-- /#mainContainer -->

        </div> <!-- /.main-app -->

    </div> <!-- /.content-wrap -->

    <!-- Optimize script loading -->
    <script src="https://unpkg.com/lenis@1.3.1/dist/lenis.min.js"></script> 

    <script defer src="serve-module.php?file=External/medium-zoom.js"></script>
    <script defer src="serve-module.php?file=External/gsap.min.js"></script>
    <script defer src="serve-module.php?file=External/Flip.min.js"></script>
    <script defer src="serve-module.php?file=External/InertiaPlugin.min.js"></script>
    <script defer src="serve-module.php?file=/External/split-type.min.js"></script>
    <script type="module" src="serve-module.php?file=main.js"></script>

</body>
</html>