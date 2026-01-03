import React, { useState, useEffect, useRef } from 'react';

interface Ripple {
  x: number;
  y: number;
  id: string;
}

const RIPPLE_DURATION = 400; // Faster, more subtle animation
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
        @keyframes cursor-tap {
          0% {
            transform: translate(-50%, -50%) scale(0.5);
            opacity: 0.8;
          }
          50% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 0.6;
          }
          100% {
            transform: translate(-50%, -50%) scale(1.5);
            opacity: 0;
          }
        }
        .touch-ripple-cursor {
          animation: cursor-tap ${RIPPLE_DURATION}ms ease-out forwards;
        }
      `}</style>
      <div 
        className="fixed inset-0 pointer-events-none overflow-hidden" 
        style={{ zIndex: RIPPLE_Z_INDEX }}
      >
        {ripples.map((ripple) => (
          <div
            key={ripple.id}
            className="absolute touch-ripple-cursor"
            style={{
              left: ripple.x,
              top: ripple.y,
              transform: 'translate(-50%, -50%)',
            }}
          >
            {/* Elegant cursor-style indicator */}
            <div className="relative">
              {/* Outer ring */}
              <div 
                className="absolute rounded-full border-2 border-purple-400/60"
                style={{
                  width: '24px',
                  height: '24px',
                  top: '-12px',
                  left: '-12px',
                }}
              />
              {/* Inner dot */}
              <div 
                className="absolute rounded-full bg-gradient-to-br from-purple-400 to-pink-400"
                style={{
                  width: '8px',
                  height: '8px',
                  top: '-4px',
                  left: '-4px',
                  boxShadow: '0 0 10px rgba(168, 85, 247, 0.6)',
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </>
  );
};
