import React, { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';

interface DecryptedTextProps {
  text: string;
  speed?: number;
  maxIterations?: number;
  sequential?: boolean;
  revealDirection?: 'start' | 'end' | 'center';
  useOriginalCharsOnly?: boolean;
  characters?: string;
  className?: string;
  parentClassName?: string;
  encryptedClassName?: string;
  animateOn?: 'view' | 'hover' | 'both';
}

export const DecryptedText: React.FC<DecryptedTextProps> = ({
  text,
  speed = 45,
  maxIterations = 8,
  sequential = true,
  revealDirection = 'start',
  useOriginalCharsOnly = false,
  characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+~|}{[]:;?><',
  className = '',
  parentClassName = '',
  encryptedClassName = 'text-primary/70 font-mono',
  animateOn = 'hover',
}) => {
  const [displayText, setDisplayText] = useState<string>(text);
  const [isHovering, setIsHovering] = useState<boolean>(false);
  const [isScrambling, setIsScrambling] = useState<boolean>(false);
  const [revealedIndices, setRevealedIndices] = useState<Set<number>>(new Set());
  const [hasAnimatedView, setHasAnimatedView] = useState<boolean>(false);
  const containerRef = useRef<HTMLSpanElement>(null);

  const getAvailableChars = () => {
    if (useOriginalCharsOnly) {
      return Array.from(new Set(text.split(''))).filter((c) => c !== ' ').join('');
    }
    return characters;
  };

  const getNextIndex = (revealedSet: Set<number>) => {
    const textLen = text.length;
    switch (revealDirection) {
      case 'start':
        for (let i = 0; i < textLen; i++) {
          if (!revealedSet.has(i)) return i;
        }
        return -1;
      case 'end':
        for (let i = textLen - 1; i >= 0; i--) {
          if (!revealedSet.has(i)) return i;
        }
        return -1;
      case 'center': {
        const middle = Math.floor(textLen / 2);
        for (let offset = 0; offset <= middle; offset++) {
          const left = middle - offset;
          const right = middle + offset;
          if (left >= 0 && !revealedSet.has(left)) return left;
          if (right < textLen && !revealedSet.has(right)) return right;
        }
        return -1;
      }
      default:
        for (let i = 0; i < textLen; i++) {
          if (!revealedSet.has(i)) return i;
        }
        return -1;
    }
  };

  const triggerAnimation = () => {
    if (isScrambling) return;
    setIsScrambling(true);
    setRevealedIndices(new Set());
  };

  useEffect(() => {
    let intervalId: any;
    let iterationCount = 0;
    const availableChars = getAvailableChars();

    if (isScrambling) {
      intervalId = setInterval(() => {
        setRevealedIndices((prevRevealed) => {
          if (sequential) {
            if (prevRevealed.size < text.length) {
              const nextIndex = getNextIndex(prevRevealed);
              const newRevealed = new Set(prevRevealed);
              if (nextIndex !== -1) {
                newRevealed.add(nextIndex);
              }
              setDisplayText(
                text
                  .split('')
                  .map((char, i) => {
                    if (char === ' ') return ' ';
                    if (newRevealed.has(i)) return text[i];
                    return availableChars[Math.floor(Math.random() * availableChars.length)];
                  })
                  .join('')
              );
              return newRevealed;
            } else {
              clearInterval(intervalId);
              setIsScrambling(false);
              setDisplayText(text);
              return prevRevealed;
            }
          } else {
            iterationCount++;
            setDisplayText(
              text
                .split('')
                .map((char) => {
                  if (char === ' ') return ' ';
                  return availableChars[Math.floor(Math.random() * availableChars.length)];
                })
                .join('')
            );
            if (iterationCount >= maxIterations) {
              clearInterval(intervalId);
              setIsScrambling(false);
              setDisplayText(text);
            }
            return prevRevealed;
          }
        });
      }, speed);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isScrambling, text, speed, maxIterations, sequential]);

  return (
    <motion.span
      ref={containerRef}
      className={`inline-block whitespace-pre-wrap cursor-pointer select-none ${parentClassName}`}
      onMouseEnter={() => {
        if (animateOn === 'hover' || animateOn === 'both') {
          setIsHovering(true);
          triggerAnimation();
        }
      }}
      onMouseLeave={() => {
        setIsHovering(false);
      }}
      onViewportEnter={() => {
        if ((animateOn === 'view' || animateOn === 'both') && !hasAnimatedView) {
          setHasAnimatedView(true);
          triggerAnimation();
        }
      }}
    >
      {displayText.split('').map((char, index) => {
        const isRevealed = revealedIndices.has(index) || !isScrambling;
        return (
          <span
            key={index}
            className={isRevealed ? className : `${encryptedClassName} transition-colors duration-100`}
          >
            {char}
          </span>
        );
      })}
    </motion.span>
  );
};

export default DecryptedText;
