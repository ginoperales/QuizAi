import React, { useEffect, useState } from 'react';

interface ConfettiProps {
  duration?: number; // Celebration duration in milliseconds
}

interface ConfettiPiece {
  id: number;
  left: string;
  color: string;
  delay: string;
  duration: string;
  size: string;
  shape: 'circle' | 'square' | 'triangle';
}

const Confetti: React.FC<ConfettiProps> = ({ duration = 5000 }) => {
  const [pieces, setPieces] = useState<ConfettiPiece[]>([]);

  useEffect(() => {
    // Elegant, harmonious palette (teal, indigo, rose, violet, sky, amber, emerald)
    const colors = [
      '#6366F1', // Indigo
      '#06B6D4', // Cyan
      '#10B981', // Emerald
      '#F59E0B', // Amber
      '#EC4899', // Pink
      '#8B5CF6', // Violet
      '#EF4444', // Red
      '#14B8A6'  // Teal
    ];
    
    const shapes: Array<'circle' | 'square' | 'triangle'> = ['circle', 'square', 'triangle'];
    
    // Generate 100 colorful pieces of different sizes, speeds, and shapes
    const generatedPieces = Array.from({ length: 100 }).map((_, idx) => {
      const size = 6 + Math.random() * 12; // 6px to 18px
      return {
        id: idx,
        left: `${Math.random() * 100}%`,
        color: colors[Math.floor(Math.random() * colors.length)],
        delay: `${Math.random() * 2.5}s`, // spread starting times
        duration: `${2.5 + Math.random() * 2}s`, // 2.5s to 4.5s fall times
        size: `${size}px`,
        shape: shapes[Math.floor(Math.random() * shapes.length)]
      };
    });

    setPieces(generatedPieces);

    const timer = setTimeout(() => {
      setPieces([]);
    }, duration);

    return () => clearTimeout(timer);
  }, [duration]);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-[150]">
      {pieces.map((p) => {
        let clipPath = undefined;
        let borderRadius = undefined;

        if (p.shape === 'circle') {
          borderRadius = '50%';
        } else if (p.shape === 'triangle') {
          clipPath = 'polygon(50% 0%, 0% 100%, 100% 100%)';
        } else {
          borderRadius = '3px'; // square with rounded corners
        }

        return (
          <div
            key={p.id}
            className="confetti-piece"
            style={{
              left: p.left,
              backgroundColor: p.color,
              animationDelay: p.delay,
              animationDuration: p.duration,
              width: p.size,
              height: p.size,
              borderRadius,
              clipPath,
            }}
          />
        );
      })}
    </div>
  );
};

export default Confetti;
