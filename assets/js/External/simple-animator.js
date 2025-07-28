export function animateSimpleText(element) {
    if (!element || !(element instanceof HTMLElement)) return;
    element.classList.add('text-animation-active');

    const chars = element.querySelectorAll('.char');

    if (!chars.length) {
        const wasSplit = ensureTextIsSplit(element);
        if (wasSplit) {
            const newChars = element.querySelectorAll('.char');
            if (newChars.length) {
                animateChars(newChars);
            } else {
                fallbackAnimation(element);
            }
        } else {
            fallbackAnimation(element);
        }
    } else {
        animateChars(chars);
    }

    setTimeout(() => {
        element.classList.remove('text-animation-active');
    }, 1500);
}

// Animate individual characters with staggered timing
function animateChars(chars) {
    chars.forEach((char, i) => {
        char.style.setProperty('--opa', '0');

        setTimeout(() => {
            char.style.setProperty('--opa', '0.9');

            setTimeout(() => {
                char.style.setProperty('--opa', '0');
            }, 250);
        }, i * 15);
    });
}

// Fallback animation when no .char elements are found
function fallbackAnimation(element) {
    const originalTransition = element.style.transition;
    const originalColor = element.style.color;

    element.style.transition = 'color 0.2s ease';
    element.style.color = 'var(--main-color)';

    setTimeout(() => {
        element.style.transition = originalTransition;
        element.style.color = originalColor;
    }, 300);
}

// Check if split-type is available and apply it
export function ensureTextIsSplit(element) {
    if (!element) return false;

    if (element.querySelector('.char')) {
        return true;
    }

    try {
        if (typeof window.SplitType === 'function') {
            new window.SplitType(element, { types: 'words,chars' });
            return true;
        }

        const text = element.innerText;
        let html = '';

        for (let i = 0; i < text.length; i++) {
            if (text[i] === ' ') {
                html += ' ';
            } else {
                html += `<span class="char">${text[i]}</span>`;
            }
        }

        element.innerHTML = `<span class="word">${html}</span>`;
        return true;
    } catch (error) {
        console.warn('Failed to split text:', error);
        return false;
    }
}
