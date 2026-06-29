import { useRef, useState, useCallback, ReactNode } from 'react';
import { Trash2 } from 'lucide-react';

interface SwipeableRowProps {
  children: ReactNode;
  onDelete: () => void;
}

const DELETE_THRESHOLD = 80;
const SNAP_WIDTH = 80;

export default function SwipeableRow({ children, onDelete }: SwipeableRowProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef(0);
  const currentXRef = useRef(0);
  const [offset, setOffset] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [swiping, setSwiping] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    startXRef.current = e.touches[0].clientX;
    currentXRef.current = offset;
    setSwiping(true);
  }, [offset]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!swiping) return;
    const diff = startXRef.current - e.touches[0].clientX;
    let newOffset = currentXRef.current + diff;
    
    // Clamp: no swiping right past 0, and max left at SNAP_WIDTH + some rubber band
    if (newOffset < 0) newOffset = 0;
    if (newOffset > SNAP_WIDTH + 30) newOffset = SNAP_WIDTH + 30;
    
    setOffset(newOffset);
  }, [swiping]);

  const handleTouchEnd = useCallback(() => {
    setSwiping(false);
    if (offset >= DELETE_THRESHOLD) {
      setOffset(SNAP_WIDTH);
      setIsOpen(true);
    } else {
      setOffset(0);
      setIsOpen(false);
    }
  }, [offset]);

  // Mouse support for desktop
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    startXRef.current = e.clientX;
    currentXRef.current = offset;
    setSwiping(true);
    
    const handleMouseMove = (ev: MouseEvent) => {
      const diff = startXRef.current - ev.clientX;
      let newOffset = currentXRef.current + diff;
      if (newOffset < 0) newOffset = 0;
      if (newOffset > SNAP_WIDTH + 30) newOffset = SNAP_WIDTH + 30;
      setOffset(newOffset);
    };
    
    const handleMouseUp = () => {
      setSwiping(false);
      setOffset(prev => {
        if (prev >= DELETE_THRESHOLD) {
          setIsOpen(true);
          return SNAP_WIDTH;
        }
        setIsOpen(false);
        return 0;
      });
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }, [offset]);

  const close = useCallback(() => {
    setOffset(0);
    setIsOpen(false);
    setConfirming(false);
  }, []);

  const handleDeleteClick = () => {
    if (confirming) {
      onDelete();
      setConfirming(false);
    } else {
      setConfirming(true);
    }
  };

  // Close if user taps the content area while open
  const handleContentClick = () => {
    if (isOpen) {
      close();
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative overflow-hidden rounded-xl"
    >
      {/* Delete button behind */}
      <div className="absolute right-0 top-0 bottom-0 flex items-center z-0">
        <button
          onClick={handleDeleteClick}
          className={`h-full flex flex-col items-center justify-center gap-1 px-5 transition-all ${
            confirming
              ? 'bg-red-600 hover:bg-red-700'
              : 'bg-orange-600 hover:bg-orange-700'
          }`}
          style={{ width: `${SNAP_WIDTH}px`, minWidth: `${SNAP_WIDTH}px` }}
        >
          <Trash2 size={18} className="text-white" />
          <span className="text-white text-[10px] font-medium">
            {confirming ? 'Sure?' : 'Delete'}
          </span>
        </button>
      </div>

      {/* Swipeable content */}
      <div
        className={`relative z-10 ${swiping ? '' : 'transition-transform duration-200 ease-out'}`}
        style={{ transform: `translateX(-${offset}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onClick={handleContentClick}
      >
        {children}
      </div>
    </div>
  );
}
