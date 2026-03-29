import { useEffect, useState, type RefObject } from "react";

interface ScrollRevealOptions {
  threshold?: number;
  delay?: number;
}

export function useScrollReveal(
  ref: RefObject<HTMLElement | null>,
  options: ScrollRevealOptions = {}
): boolean {
  const { threshold = 0.15, delay = 0 } = options;
  const [isRevealed, setIsRevealed] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    let cleanupTimeout: ReturnType<typeof setTimeout> | undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting) {
          observer.unobserve(element);
          if (delay > 0) {
            cleanupTimeout = setTimeout(() => setIsRevealed(true), delay);
          } else {
            setIsRevealed(true);
          }
        }
      },
      { threshold }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
      if (cleanupTimeout !== undefined) {
        clearTimeout(cleanupTimeout);
      }
    };
  }, [ref, threshold, delay]);

  return isRevealed;
}
