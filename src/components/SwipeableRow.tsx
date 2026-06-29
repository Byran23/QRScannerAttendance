import { useRef, useState, useCallback, ReactNode } from 'react';
import { Trash2 } from 'lucide-react';

interface SwipeableRowProps {
  children: ReactNode;
  onDelete: () => void;
}

const DELETE_THRESHOLD = 80;
const SNAP_WIDTH = 80;

export default function SwipeableRow({ children, onDelete }: SwipeableRowProps) {
  const startXRef = useRef(0);
  const currentXRef = useRef(0);
  const pointerIdRef = useRef<number | null>(null);
  const [offset, setOffset] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [swiping, setSwiping] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const clampOffset = (value: number) => {
    if (value < 0) return 0;
    if (value > SNAP_WIDTH + 30) return SNAP_WIDTH + 30;
    return value;
  };

  const finishSwipe = useCallback((finalOffset: number) => {
    setSwiping(false);
    if (finalOffset >= DELETE_THRESHOLD) {
      setOffset(SNAP_WIDTH);
      setIsOpen(true);
    } else {
      setOffset(0);
      setIsOpen(false);
    }
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    pointerIdRef.current = e.pointerId;
    startXRef.current = e.clientX;
    currentXRef.current = offset;
    setSwiping(true);
    e.currentTarget.setPointerCapture?.(e.pointerId);
  }, [offset]);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!swiping || pointerIdRef.current !== e.pointerId) return;
    const diff = startXRef.current - e.clientX;
    setOffset(clampOffset(currentXRef.current + diff));
  }, [swiping]);

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (pointerIdRef.current !== e.pointerId) return;
    pointerIdRef.current = null;
    finishSwipe(offset);
    e.currentTarget.releasePointerCapture?.(e.pointerId);
  }, [finishSwipe, offset]);

  const handlePointerCancel = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (pointerIdRef.current !== e.pointerId) return;
    pointerIdRef.current = null;
    finishSwipe(offset);
    e.currentTarget.releasePointerCapture?.(e.pointerId);
  }, [finishSwipe, offset]);

  const close = useCallback(() => {
    setOffset(0);
    setIsOpen(false);
    setConfirming(false);
  }, []);

  const handleDeleteClick = () => {
    if (confirming) {
      onDelete();
      setConfirming(false);
      setOffset(0);
      setIsOpen(false);
    } else {
      setConfirming(true);
    }
  };

  const handleContentClick = () => {
    if (isOpen) close();
  };

  return (
    <div className="relative overflow-hidden rounded-xl">
      <div className="absolute right-0 top-0 bottom-0 flex items-center z-0">
        <button
          onClick={handleDeleteClick}
          className={`h-full flex flex-col items-center justify-center gap-1 px-5 transition-all ${
            confirming ? 'bg-red-600 hover:bg-red-700' : 'bg-orange-600 hover:bg-orange-700'
          }`}
          style={{ width: `${SNAP_WIDTH}px`, minWidth: `${SNAP_WIDTH}px` }}
        >
          <Trash2 size={18} className="text-white" />
          <span className="text-white text-[10px] font-medium">{confirming ? 'Sure?' : 'Delete'}</span>
        </button>
      </div>

      <div
        className={`relative z-10 touch-pan-y ${swiping ? '' : 'transition-transform duration-200 ease-out'} ${isOpen ? 'cursor-pointer' : 'cursor-grab active:cursor-grabbing'}`}
        style={{ transform: `translateX(-${offset}px)` }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onClick={handleContentClick}
      >
        {children}
      </div>
    </div>
  );
}
