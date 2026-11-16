import React, { useEffect, useState } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';

interface Spatial3DBackgroundProps {
  gridColor?: string;
  horizonGlow?: boolean;
  className?: string;
}

export const Spatial3DBackground: React.FC<Spatial3DBackgroundProps> = ({
  gridColor = 'rgba(0, 255, 136, 0.12)',
  horizonGlow = true,
  className = '',
}) => {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const springConfig = { damping: 35, stiffness: 200 };
  const tiltX = useSpring(useTransform(mouseY, [-0.5, 0.5], [64, 60]), springConfig);
  const tiltY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-3, 3]), springConfig);
  const panX = useSpring(useTransform(mouseX, [-0.5, 0.5], [-15, 15]), springConfig);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const x = e.clientX / window.innerWidth - 0.5;
      const y = e.clientY / window.innerHeight - 0.5;
      mouseX.set(x);
      mouseY.set(y);
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [mouseX, mouseY]);

  return (
    <div className={`fixed inset-0 pointer-events-none overflow-hidden -z-10 bg-black ${className}`}>
      {/* 3D Horizon Ambient Atmosphere */}
      {horizonGlow && (
        <div 
          className="absolute inset-x-0 bottom-0 h-3/4 opacity-40"
          style={{
            background: 'radial-gradient(circle at 50% 100%, rgba(0, 255, 136, 0.15) 0%, rgba(6, 182, 212, 0.05) 45%, transparent 75%)',
          }}
        />
      )}

      {/* 3D Perspective Plane */}
      <div 
        className="absolute inset-0 flex items-end justify-center"
        style={{ perspective: '800px' }}
      >
        <motion.div
          className="w-[200vw] h-[120vh] origin-bottom -mb-[10vh]"
          style={{
            rotateX: tiltX,
            rotateZ: tiltY,
            x: panX,
            backgroundImage: `
              linear-gradient(to right, ${gridColor} 1px, transparent 1px),
              linear-gradient(to bottom, ${gridColor} 1px, transparent 1px)
            `,
            backgroundSize: '64px 64px',
            transformStyle: 'preserve-3d',
            maskImage: 'radial-gradient(ellipse 65% 55% at 50% 100%, black 25%, transparent 80%)',
            WebkitMaskImage: 'radial-gradient(ellipse 65% 55% at 50% 100%, black 25%, transparent 80%)',
          }}
        />
      </div>

      {/* Subtle 3D Depth Vignette */}
      <div 
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(circle at 50% 30%, transparent 40%, rgba(0, 0, 0, 0.75) 100%)',
        }}
      />
    </div>
  );
};

export default Spatial3DBackground;
