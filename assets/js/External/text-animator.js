import { TextSplitter } from './textSplitter.js';
import * as SplitType from './split-type.min.js';

const lettersAndSymbols = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z', '!', '@', '#', '$', '%', '^', '&', '*', '-', '_', '+', '=', ';', ':', '<', '>', ','];

export class TextAnimator {
  constructor(textElement) {
    if (!textElement || !(textElement instanceof HTMLElement)) {
      throw new Error('Invalid text element provided.');
    }

    this.textElement = textElement;
    this.splitText();
  }

  splitText() {
    this.splitter = new TextSplitter(this.textElement, {
      splitTypeTypes: 'words, chars'
    });

    this.originalChars = this.splitter.getChars().map(char => char.innerHTML);
  }

  animate(options = {}) {
    const { oneTime = false } = options;
    this.reset();

    const chars = this.splitter.getChars();

    chars.forEach((char, position) => {
      let initialHTML = char.innerHTML;
      let repeatCount = 0;

      gsap.fromTo(char, {
        opacity: 0
      },
        {
          duration: 0.03,
          onStart: () => {
            gsap.set(char, { '--opa': 1 });
          },
          onComplete: () => {
            gsap.set(char, { innerHTML: initialHTML, delay: 0.03 });
            // For one-time animations, keep the final state
            if (oneTime) {
              gsap.set(char, { '--opa': 0.9 });
            }
          },
          repeat: oneTime ? 0 : 3,
          onRepeat: () => {
            repeatCount++;
            if (repeatCount === 1 && !oneTime) {
              gsap.set(char, { '--opa': 0 });
            }
          },
          repeatRefresh: true,
          repeatDelay: 0.04,
          delay: (position + 1) * 0.07,
          innerHTML: () => lettersAndSymbols[Math.floor(Math.random() * lettersAndSymbols.length)],
          opacity: 1
        });
    });
  }

  reset() {
    const chars = this.splitter.getChars();
    chars.forEach((char, index) => {
      gsap.killTweensOf(char);
      char.innerHTML = this.originalChars[index];
    });
  }
}

export function animateText(element) {
  if (!element) return;

  const animator = new TextAnimator(element);
  animator.animate();

  return animator;
}