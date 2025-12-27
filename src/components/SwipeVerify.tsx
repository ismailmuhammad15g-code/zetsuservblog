import { useState, useRef, useEffect } from "react";
import { Check, GripHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

interface SwipeVerifyProps {
  onVerified: () => void;
  verified: boolean;
}

export function SwipeVerify({ onVerified, verified }: SwipeVerifyProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef(0);

  const handleStart = (clientX: number) => {
    if (verified) return;
    setIsDragging(true);
    startXRef.current = clientX - position;
  };

  const handleMove = (clientX: number) => {
    if (!isDragging || verified || !containerRef.current) return;
    
    const containerWidth = containerRef.current.offsetWidth - 56;
    const newPosition = Math.max(0, Math.min(clientX - startXRef.current, containerWidth));
    setPosition(newPosition);

    // Check if reached the end
    if (newPosition >= containerWidth - 10) {
      setIsDragging(false);
      setPosition(containerWidth);
      onVerified();
    }
  };

  const handleEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);
    
    if (!verified) {
      setPosition(0);
    }
  };

  // Mouse events
  const onMouseDown = (e: React.MouseEvent) => handleStart(e.clientX);
  const onMouseMove = (e: MouseEvent) => handleMove(e.clientX);
  const onMouseUp = () => handleEnd();

  // Touch events
  const onTouchStart = (e: React.TouchEvent) => handleStart(e.touches[0].clientX);
  const onTouchMove = (e: TouchEvent) => handleMove(e.touches[0].clientX);
  const onTouchEnd = () => handleEnd();

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
      window.addEventListener("touchmove", onTouchMove);
      window.addEventListener("touchend", onTouchEnd);
    }
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [isDragging]);

  return (
    <div 
      ref={containerRef}
      className={cn(
        "relative h-14 rounded-lg border overflow-hidden select-none transition-colors",
        verified 
          ? "bg-primary/10 border-primary/30" 
          : "bg-muted border-border"
      )}
    >
      {/* Background text */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <span className={cn(
          "text-sm font-medium transition-opacity",
          verified ? "text-primary" : "text-muted-foreground"
        )}>
          {verified ? "Verified!" : "Swipe right to verify →"}
        </span>
      </div>

      {/* Slider */}
      <div
        className={cn(
          "absolute top-1 left-1 h-12 w-12 rounded-md flex items-center justify-center cursor-grab active:cursor-grabbing transition-colors",
          verified 
            ? "bg-primary text-primary-foreground" 
            : "bg-background border border-border shadow-sm"
        )}
        style={{ 
          transform: `translateX(${position}px)`,
          transition: isDragging ? "none" : "transform 0.3s ease-out"
        }}
        onMouseDown={onMouseDown}
        onTouchStart={onTouchStart}
      >
        {verified ? (
          <Check className="h-5 w-5" />
        ) : (
          <GripHorizontal className="h-5 w-5 text-muted-foreground" />
        )}
      </div>
    </div>
  );
}
