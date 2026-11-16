import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';

interface TrueFocusProps {
  sentence?: string;
  manualMode?: boolean;
  blurAmount?: number;
  borderColor?: string;
  glowColor?: string;
  animationDuration?: number;
  pauseBetweenAnimations?: number;
  className?: string;
}

export const TrueFocus: React.FC<TrueFocusProps> = ({
  sentence = 'Track. Analyze. Profit.',
  manualMode = false,
  blurAmount = 3,
  borderColor = '#00FF88',
  glowColor = 'rgba(0, 255, 136, 0.35)',
  animationDuration = 0.5,
  pauseBetweenAnimations = 1.2,
  className = '',
}) => {
  const words = sentence.split(' ');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [lastActiveIndex, setLastActiveIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const wordRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const [focusRect, setFocusRect] = useState<{ x: number; y: number; width: number; height: number }>({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  });

  // Cycle automatically if not manualMode
  useEffect(() => {
    if (manualMode) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % words.length);
    }, (animationDuration + pauseBetweenAnimations) * 1000);

    return () => clearInterval(interval);
  }, [manualMode, animationDuration, pauseBetweenAnimations, words.length]);

  // Update rect when currentIndex or layout changes
  useEffect(() => {
    if (currentIndex === null || currentIndex === -1) return;
    if (!wordRefs.current[currentIndex] || !containerRef.current) return;

    const parentRect = containerRef.current.getBoundingClientRect();
    const activeWord = wordRefs.current[currentIndex];
    if (!activeWord) return;

    const wordRect = activeWord.getBoundingClientRect();

    setFocusRect({
      x: wordRect.left - parentRect.left,
      y: wordRect.top - parentRect.top,
      width: wordRect.width,
      height: wordRect.height,
    });
  }, [currentIndex, words.length]);

  const handleMouseEnter = (index: number) => {
    if (manualMode) {
      setLastActiveIndex(index);
      setCurrentIndex(index);
    }
  };

  const handleMouseLeave = () => {
    if (manualMode) {
      setCurrentIndex(lastActiveIndex ?? 0);
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative inline-flex flex-wrap items-center justify-center gap-3 select-none ${className}`}
      onMouseLeave={handleMouseLeave}
    >
      {words.map((word, index) => {
        const isActive = index === currentIndex;
        return (
          <span
            key={index}
            ref={(el) => (wordRefs.current[index] = el)}
            onMouseEnter={() => handleMouseEnter(index)}
            className="relative cursor-pointer px-2 py-1 transition-all duration-300 font-bold"
            style={{
              filter: isActive ? 'none' : `blur(${blurAmount}px)`,
              opacity: isActive ? 1 : 0.45,
            }}
          >
            {word}
          </span>
        );
      })}

      <motion.div
        className="pointer-events-none absolute top-0 left-0"
        animate={{
          x: focusRect.x - 6,
          y: focusRect.y - 4,
          width: focusRect.width + 12,
          height: focusRect.height + 8,
          opacity: focusRect.width > 0 ? 1 : 0,
        }}
        transition={{
          duration: animationDuration,
          ease: [0.25, 1, 0.5, 1],
        }}
        style={{
          boxShadow: `0 0 16px ${glowColor}`,
        }}
      >
        {/* Top-Left Corner */}
        <span
          className="absolute -top-1 -left-1 w-3 h-3 border-t-2 border-l-2"
          style={{ borderColor }}
        />
        {/* Top-Right Corner */}
        <span
          className="absolute -top-1 -right-1 w-3 h-3 border-t-2 border-r-2"
          style={{ borderColor }}
        />
        {/* Bottom-Left Corner */}
        <span
          className="absolute -bottom-1 -left-1 w-3 h-3 border-b-2 border-l-2"
          style={{ borderColor }}
        />
        {/* Bottom-Right Corner */}
        <span
          className="absolute -bottom-1 -right-1 w-3 h-3 border-b-2 border-r-2"
          style={{ borderColor }}
        />
      </motion.div>
    </div>
  );
};

export default TrueFocus;
