// Utility to animate any title element using text-animator.js
// Usage: animateTitleElement(elementOrSelector)

export async function animateTitleElement(elementOrSelector) {
    let el = elementOrSelector;
    if (typeof elementOrSelector === 'string') {
        el = document.querySelector(elementOrSelector);
    }
    if (!el || !window.gsap) return false;
    try {
        const module = await import('../External/text-animator.js');
        module.animateText(el);
        return true;
    } catch (error) {
        console.error('Error animating title:', error);
        return false;
    }
}
