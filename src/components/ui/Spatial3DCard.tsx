import React, { useRef, useState, useCallback } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { clsx } from 'clsx';

interface Spatial3DCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  maxTilt?: number;
  glareOpacity?: number;
  glowColor?: string;
  depth?: number;
  onClick?: () => void;
}

export const Spatial3DCard: React.FC<Spatial3DCardProps> = ({
  children,
  className = '',
  maxTilt = 8,
  glareOpacity = 0.15,
  glowColor = 'rgba(0, 255, 136, 0.15)',
  depth = 30,
  onClick,
  style,
  ...props
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  // Raw mouse coordinates relative to card center (-1 to 1)
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Smooth spring physics for rotation and sheen
  const springConfig = { damping: 26, stiffness: 280, mass: 0.5 };
  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [maxTilt, -maxTilt]), springConfig);
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-maxTilt, maxTilt]), springConfig);
  
  // Dynamic 3D specular glare coordinates
  const glareX = useSpring(useTransform(mouseX, [-0.5, 0.5], [0, 100]), springConfig);
  const glareY = useSpring(useTransform(mouseY, [-0.5, 0.5], [0, 100]), springConfig);

  // Dynamic 3D depth shadow offsets
  const shadowX = useSpring(useTransform(mouseX, [-0.5, 0.5], [-12, 12]), springConfig);
  const shadowY = useSpring(useTransform(mouseY, [-0.5, 0.5], [-12, 12]), springConfig);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    mouseX.set(x);
    mouseY.set(y);
  }, [mouseX, mouseY]);

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    mouseX.set(0);
    mouseY.set(0);
  };

  return (
    <div
      style={{ perspective: 1200 }}
      className="relative w-full h-full"
    >
      <motion.div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={onClick}
        style={{
          rotateX,
          rotateY,
          transformStyle: 'preserve-3d',
          willChange: 'transform',
          ...style,
        }}
        className={clsx(
          'relative w-full h-full rounded-2xl transition-shadow duration-300',
          className
        )}
        {...(props as any)}
      >
        {/* Dynamic 3D Specular Sheen Glare */}
        <motion.div
          className="pointer-events-none absolute -inset-px rounded-2xl z-30 transition-opacity duration-300 overflow-hidden"
          style={{
            opacity: isHovered ? glareOpacity : 0,
            background: useTransform(
              [glareX, glareY],
              ([gx, gy]) =>
                `radial-gradient(500px circle at ${gx}% ${gy}%, rgba(255, 255, 255, 0.4), transparent 60%)`
            ),
          }}
        />

        {/* Dynamic 3D Ambient Edge Illumination */}
        <motion.div
          className="pointer-events-none absolute -inset-[1px] rounded-2xl z-10 transition-opacity duration-300"
          style={{
            opacity: isHovered ? 1 : 0,
            background: useTransform(
              [glareX, glareY],
              ([gx, gy]) =>
                `radial-gradient(400px circle at ${gx}% ${gy}%, ${glowColor}, transparent 70%)`
            ),
          }}
        />

        {/* 3D Content Container with preserve-3d */}
        <div
          className="relative z-20 w-full h-full"
          style={{
            transformStyle: 'preserve-3d',
            transform: 'translateZ(0px)',
          }}
        >
          {children}
        </div>
      </motion.div>
    </div>
  );
};

export default Spatial3DCard;
