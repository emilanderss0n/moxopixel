(function (window) {
  // Internal utility functions
  const isSupported = node => node.tagName === 'IMG';
  const isNodeList = selector => NodeList.prototype.isPrototypeOf(selector);
  const isNode = selector => selector && selector.nodeType === 1;
  const isSvg = image => {
    const source = image.currentSrc || image.src;
    return source.substr(-4).toLowerCase() === '.svg';
  };

  const getImagesFromSelector = selector => {
    try {
      if (Array.isArray(selector)) {
        return selector.filter(isSupported);
      }
      if (isNodeList(selector)) {
        return [].slice.call(selector).filter(isSupported);
      }
      if (isNode(selector)) {
        return [selector].filter(isSupported);
      }
      if (typeof selector === 'string') {
        return [].slice.call(document.querySelectorAll(selector)).filter(isSupported);
      }
      return [];
    } catch (err) {
      throw new TypeError(
        'The provided selector is invalid.\n' +
        'Expects a CSS selector, a Node element, a NodeList or an array.\n' +
        'See: https://github.com/francoischalifour/medium-zoom'
      );
    }
  };

  const createOverlay = background => {
    const overlay = document.createElement('div');
    overlay.classList.add('medium-zoom-overlay');
    overlay.style.background = background;
    return overlay;
  };

  const cloneTarget = template => {
    const { top, left, width, height } = template.getBoundingClientRect();
    const clone = template.cloneNode();
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft || document.body.scrollLeft || 0;

    clone.removeAttribute('id');
    clone.style.position = 'absolute';
    clone.style.top = `${top + scrollTop}px`;
    clone.style.left = `${left + scrollLeft}px`;
    clone.style.width = `${width}px`;
    clone.style.height = `${height}px`;
    clone.style.transform = '';

    return clone;
  };

  const createCustomEvent = (type, params) => {
    const eventParams = {
      bubbles: false,
      cancelable: false,
      detail: undefined,
      ...params
    };

    if (typeof window.CustomEvent === 'function') {
      return new CustomEvent(type, eventParams);
    }

    const customEvent = document.createEvent('CustomEvent');
    customEvent.initCustomEvent(type, eventParams.bubbles, eventParams.cancelable, eventParams.detail);
    return customEvent;
  };

  // Main function
  const mediumZoom = (selector, options = {}) => {
    let images = []
    let eventListeners = []
    let isAnimating = false
    let scrollTop = 0
    let zoomOptions = options
    const active = {
      original: null,
      zoomed: null,
      zoomedHd: null,
      template: null,
    }

    // Create zoom object first so it can be referenced
    const zoom = {
      open: () => { },  // These will be assigned later
      close: () => { },
      toggle: () => { },
      update: () => { },
      clone: () => { },
      attach: () => { },
      detach: () => { },
      on: () => { },
      off: () => { },
      getOptions: () => zoomOptions,
      getImages: () => images,
      getZoomedImage: () => active.original,
    }

    const _handleClick = event => {
      const { target } = event

      if (target === overlay) {
        zoom.close()
        return
      }

      if (images.indexOf(target) === -1) {
        return
      }

      zoom.toggle({ target })
    }

    const _handleScroll = () => {
      if (isAnimating || !active.original) {
        return
      }

      const currentScroll =
        window.pageYOffset ||
        document.documentElement.scrollTop ||
        document.body.scrollTop ||
        0

      if (Math.abs(scrollTop - currentScroll) > zoomOptions.scrollOffset) {
        setTimeout(zoom.close, 150)
      }
    }

    const _handleKeyUp = event => {
      const key = event.key || event.keyCode

      // Close if escape key is pressed
      if (key === 'Escape' || key === 'Esc' || key === 27) {
        zoom.close()
      }
    }

    // Now assign the actual methods
    zoom.open = ({ target } = {}) => {
      const _animate = () => {
        let container = {
          width: document.documentElement.clientWidth,
          height: document.documentElement.clientHeight,
          left: 0,
          top: 0,
          right: 0,
          bottom: 0,
        }
        let viewportWidth
        let viewportHeight

        if (zoomOptions.container) {
          if (zoomOptions.container instanceof Object) {
            // The container is given as an object with properties like width, height, left, top
            container = {
              ...container,
              ...zoomOptions.container,
            }

            // We need to adjust custom options like container.right or container.bottom
            viewportWidth =
              container.width -
              container.left -
              container.right -
              zoomOptions.margin * 2
            viewportHeight =
              container.height -
              container.top -
              container.bottom -
              zoomOptions.margin * 2
          } else {
            // The container is given as an element
            const zoomContainer = isNode(zoomOptions.container)
              ? zoomOptions.container
              : document.querySelector(zoomOptions.container)

            const {
              width,
              height,
              left,
              top,
            } = zoomContainer.getBoundingClientRect()

            container = {
              ...container,
              width,
              height,
              left,
              top,
            }
          }
        }

        viewportWidth = viewportWidth || container.width - zoomOptions.margin * 2
        viewportHeight =
          viewportHeight || container.height - zoomOptions.margin * 2

        const zoomTarget = active.zoomedHd || active.original
        const naturalWidth = isSvg(zoomTarget)
          ? viewportWidth
          : zoomTarget.naturalWidth || viewportWidth
        const naturalHeight = isSvg(zoomTarget)
          ? viewportHeight
          : zoomTarget.naturalHeight || viewportHeight
        const { top, left, width, height } = zoomTarget.getBoundingClientRect()

        const scaleX =
          Math.min(Math.max(width, naturalWidth), viewportWidth) / width
        const scaleY =
          Math.min(Math.max(height, naturalHeight), viewportHeight) / height
        const scale = Math.min(scaleX, scaleY)
        const translateX =
          (-left +
            (viewportWidth - width) / 2 +
            zoomOptions.margin +
            container.left) /
          scale
        const translateY =
          (-top +
            (viewportHeight - height) / 2 +
            zoomOptions.margin +
            container.top) /
          scale
        const transform = `scale(${scale}) translate3d(${translateX}px, ${translateY}px, 0)`

        active.zoomed.style.transform = transform

        if (active.zoomedHd) {
          active.zoomedHd.style.transform = transform
        }
      }

      return new Promise(resolve => {
        if (target && images.indexOf(target) === -1) {
          resolve(zoom)
          return
        }

        const _handleOpenEnd = () => {
          isAnimating = false
          active.zoomed.removeEventListener('transitionend', _handleOpenEnd)
          active.original.dispatchEvent(
            createCustomEvent('medium-zoom:opened', {
              detail: { zoom },
            })
          )

          resolve(zoom)
        }

        if (active.zoomed) {
          resolve(zoom)
          return
        }

        if (target) {
          // The zoom was triggered manually via a click
          active.original = target
        } else if (images.length > 0) {
          // The zoom was triggered programmatically, select the first image in the list
          ;[active.original] = images
        } else {
          resolve(zoom)
          return
        }

        active.original.dispatchEvent(
          createCustomEvent('medium-zoom:open', {
            detail: { zoom },
          })
        )

        scrollTop =
          window.pageYOffset ||
          document.documentElement.scrollTop ||
          document.body.scrollTop ||
          0
        isAnimating = true
        active.zoomed = cloneTarget(active.original)

        document.body.appendChild(overlay)

        if (zoomOptions.template) {
          const template = isNode(zoomOptions.template)
            ? zoomOptions.template
            : document.querySelector(zoomOptions.template)
          active.template = document.createElement('div')
          active.template.appendChild(template.content.cloneNode(true))

          document.body.appendChild(active.template)
        }

        // If the selected <img> tag is inside a <picture> tag, set the
        // currently-applied source as the cloned `src=` attribute.
        // (as these might differ, or src= might be unset in some cases)
        if (
          active.original.parentElement &&
          active.original.parentElement.tagName === 'PICTURE' &&
          active.original.currentSrc
        ) {
          active.zoomed.src = active.original.currentSrc
        }

        document.body.appendChild(active.zoomed)

        window.requestAnimationFrame(() => {
          document.body.classList.add('medium-zoom--opened')
        })

        active.original.classList.add('medium-zoom-image--hidden')
        active.zoomed.classList.add('medium-zoom-image--opened')

        active.zoomed.addEventListener('click', zoom.close)
        active.zoomed.addEventListener('transitionend', _handleOpenEnd)

        if (active.original.getAttribute('data-zoom-src')) {
          active.zoomedHd = active.zoomed.cloneNode()

          // Reset the `scrset` property or the HD image won't load.
          active.zoomedHd.removeAttribute('srcset')
          active.zoomedHd.removeAttribute('sizes')
          // Remove loading attribute so the browser can load the image normally
          active.zoomedHd.removeAttribute('loading')

          active.zoomedHd.src = active.zoomed.getAttribute('data-zoom-src')

          active.zoomedHd.onerror = () => {
            clearInterval(getZoomTargetSize)
            console.warn(
              `Unable to reach the zoom image target ${active.zoomedHd.src}`
            )
            active.zoomedHd = null
            _animate()
          }

          // We need to access the natural size of the full HD
          // target as fast as possible to compute the animation.
          const getZoomTargetSize = setInterval(() => {
            if (active.zoomedHd.complete) {
              clearInterval(getZoomTargetSize)
              active.zoomedHd.classList.add('medium-zoom-image--opened')
              active.zoomedHd.addEventListener('click', zoom.close)
              document.body.appendChild(active.zoomedHd)
              _animate()
            }
          }, 10)
        } else if (active.original.hasAttribute('srcset')) {
          // If an image has a `srcset` attribuet, we don't know the dimensions of the
          // zoomed (HD) image (like when `data-zoom-src` is specified).
          // Therefore the approach is quite similar.
          active.zoomedHd = active.zoomed.cloneNode()

          // Resetting the sizes attribute tells the browser to load the
          // image best fitting the current viewport size, respecting the `srcset`.
          active.zoomedHd.removeAttribute('sizes')

          // In Firefox, the `loading` attribute needs to be set to `eager` (default
          // value) for the load event to be fired.
          active.zoomedHd.removeAttribute('loading')

          // Wait for the load event of the hd image. This will fire if the image
          // is already cached.
          const loadEventListener = active.zoomedHd.addEventListener(
            'load',
            () => {
              active.zoomedHd.removeEventListener('load', loadEventListener)
              active.zoomedHd.classList.add('medium-zoom-image--opened')
              active.zoomedHd.addEventListener('click', zoom.close)
              document.body.appendChild(active.zoomedHd)
              _animate()
            }
          )
        } else {
          _animate()
        }
      })
    }

    zoom.close = () =>
      new Promise(resolve => {
        if (isAnimating || !active.original) {
          resolve(zoom)
          return
        }

        const _handleCloseEnd = () => {
          active.original.classList.remove('medium-zoom-image--hidden')
          document.body.removeChild(active.zoomed)
          if (active.zoomedHd) {
            document.body.removeChild(active.zoomedHd)
          }
          document.body.removeChild(overlay)
          active.zoomed.classList.remove('medium-zoom-image--opened')
          if (active.template) {
            document.body.removeChild(active.template)
          }

          isAnimating = false
          active.zoomed.removeEventListener('transitionend', _handleCloseEnd)

          active.original.dispatchEvent(
            createCustomEvent('medium-zoom:closed', {
              detail: { zoom },
            })
          )

          active.original = null
          active.zoomed = null
          active.zoomedHd = null
          active.template = null

          resolve(zoom)
        }

        isAnimating = true
        document.body.classList.remove('medium-zoom--opened')
        active.zoomed.style.transform = ''

        if (active.zoomedHd) {
          active.zoomedHd.style.transform = ''
        }

        // Fade out the template so it's not too abrupt
        if (active.template) {
          active.template.style.transition = 'opacity 150ms'
          active.template.style.opacity = 0
        }

        active.original.dispatchEvent(
          createCustomEvent('medium-zoom:close', {
            detail: { zoom },
          })
        )

        active.zoomed.addEventListener('transitionend', _handleCloseEnd)
      })

    zoom.toggle = ({ target } = {}) => {
      if (active.original) {
        return zoom.close()
      }

      return zoom.open({ target })
    }

    zoom.update = (options = {}) => {
      const newOptions = options

      if (options.background) {
        overlay.style.background = options.background
      }

      if (options.container && options.container instanceof Object) {
        newOptions.container = {
          ...zoomOptions.container,
          ...options.container,
        }
      }

      if (options.template) {
        const template = isNode(options.template)
          ? options.template
          : document.querySelector(options.template)

        newOptions.template = template
      }

      zoomOptions = { ...zoomOptions, ...newOptions }

      images.forEach(image => {
        image.dispatchEvent(
          createCustomEvent('medium-zoom:update', {
            detail: { zoom },
          })
        )
      })

      return zoom
    }

    zoom.clone = (options = {}) => mediumZoom({ ...zoomOptions, ...options })

    zoom.attach = (...selectors) => {
      const newImages = selectors.reduce(
        (imagesAccumulator, currentSelector) => [
          ...imagesAccumulator,
          ...getImagesFromSelector(currentSelector),
        ],
        []
      )

      newImages
        .filter(newImage => images.indexOf(newImage) === -1)
        .forEach(newImage => {
          images.push(newImage)
          newImage.classList.add('medium-zoom-image')
        })

      eventListeners.forEach(({ type, listener, options }) => {
        newImages.forEach(image => {
          image.addEventListener(type, listener, options)
        })
      })

      return zoom
    }

    zoom.detach = (...selectors) => {
      if (active.zoomed) {
        zoom.close()
      }

      const imagesToDetach =
        selectors.length > 0
          ? selectors.reduce(
            (imagesAccumulator, currentSelector) => [
              ...imagesAccumulator,
              ...getImagesFromSelector(currentSelector),
            ],
            []
          )
          : images

      imagesToDetach.forEach(image => {
        image.classList.remove('medium-zoom-image')
        image.dispatchEvent(
          createCustomEvent('medium-zoom:detach', {
            detail: { zoom },
          })
        )
      })

      images = images.filter(image => imagesToDetach.indexOf(image) === -1)

      return zoom
    }

    zoom.on = (type, listener, options = {}) => {
      images.forEach(image => {
        image.addEventListener(`medium-zoom:${type}`, listener, options)
      })

      eventListeners.push({ type: `medium-zoom:${type}`, listener, options })

      return zoom
    }

    zoom.off = (type, listener, options = {}) => {
      images.forEach(image => {
        image.removeEventListener(`medium-zoom:${type}`, listener, options)
      })

      eventListeners = eventListeners.filter(
        eventListener =>
          !(
            eventListener.type === `medium-zoom:${type}` &&
            eventListener.listener.toString() === listener.toString()
          )
      )

      return zoom
    }

    // Initialize
    if (Object.prototype.toString.call(selector) === '[object Object]') {
      zoomOptions = selector
    } else if (selector || typeof selector === 'string') {
      zoom.attach(selector)
    }

    zoomOptions = {
      margin: 0,
      background: '#fff',
      scrollOffset: 40,
      container: null,
      template: null,
      ...zoomOptions,
    }

    const overlay = createOverlay(zoomOptions.background)

    document.addEventListener('click', _handleClick)
    document.addEventListener('keyup', _handleKeyUp)
    document.addEventListener('scroll', _handleScroll)
    window.addEventListener('resize', zoom.close)

    return zoom
  }

  // Attach to window object
  window.mediumZoom = mediumZoom
})(window)
