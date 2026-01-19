import React, { useState, useEffect, ReactElement } from 'react';
import './Resizer.css';

type ResizerDirection = 'vertical' | 'horizontal';

interface ResizerProps {
  direction?: ResizerDirection;
  onResize: (position: number) => void;
}

const Resizer = ({ direction = 'vertical', onResize }: ResizerProps): ReactElement => {
  const [isDragging, setIsDragging] = useState<boolean>(false);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent): void => {
      if (!isDragging) return;

      if (direction === 'vertical') {
        onResize(e.clientX);
      } else {
        onResize(e.clientY);
      }
    };

    const handleMouseUp = (): void => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, direction, onResize]);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>): void => {
    e.preventDefault();
    setIsDragging(true);
  };

  return (
    <div
      className={`resizer ${direction} ${isDragging ? 'dragging' : ''}`}
      onMouseDown={handleMouseDown}
    />
  );
};

export default Resizer;