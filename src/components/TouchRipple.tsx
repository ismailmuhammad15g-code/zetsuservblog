import React, { useState, useEffect, useRef } from 'react';

interface Ripple {
  x: number;
  y: number;
  id: string;
}

const RIPPLE_DURATION = 800; // milliseconds
const RIPPLE_Z_INDEX = 9999;

export const TouchRipple: React.FC = () => {
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const idCounterRef = useRef(0);

  useEffect(() => {
    const handleTouch = (e: TouchEvent | MouseEvent) => {
      const x = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const y = 'touches' in e ? e.touches[0].clientY : e.clientY;

      // Use counter-based ID generation to avoid collisions
      const newRipple: Ripple = {
        x,
        y,
        id: `ripple-${idCounterRef.current++}`,
      };

      setRipples((prev) => [...prev, newRipple]);

      // Remove ripple after animation completes
      setTimeout(() => {
        setRipples((prev) => prev.filter((r) => r.id !== newRipple.id));
      }, RIPPLE_DURATION);
    };

    // Add touch and click listeners
    document.addEventListener('touchstart', handleTouch);
    document.addEventListener('mousedown', handleTouch);

    return () => {
      document.removeEventListener('touchstart', handleTouch);
      document.removeEventListener('mousedown', handleTouch);
    };
  }, []);

  return (
    <>
      <style>{`
        @keyframes ripple-animation {
          0% {
            transform: translate(-50%, -50%) scale(0);
            opacity: 1;
          }
          100% {
            transform: translate(-50%, -50%) scale(30);
            opacity: 0;
          }
        }
        .touch-ripple {
          animation: ripple-animation ${RIPPLE_DURATION}ms ease-out;
        }
      `}</style>
      <div 
        className="fixed inset-0 pointer-events-none overflow-hidden" 
        style={{ zIndex: RIPPLE_Z_INDEX }}
      >
        {ripples.map((ripple) => (
          <div
            key={ripple.id}
            className="absolute rounded-full bg-purple-500/30 touch-ripple"
            style={{
              left: ripple.x,
              top: ripple.y,
              transform: 'translate(-50%, -50%)',
              width: '20px',
              height: '20px',
            }}
          />
        ))}
      </div>
    </>
  );
};
