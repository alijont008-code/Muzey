import React, { useRef, useState, useEffect, useCallback } from 'react';

interface JoystickProps {
  onMove: (vector: { x: number; y: number }) => void;
  disabled?: boolean;
}

export const Joystick: React.FC<JoystickProps> = ({ onMove, disabled = false }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [knobPos, setKnobPos] = useState({ x: 0, y: 0 });
  const [active, setActive] = useState(false);
  const activeTouchId = useRef<number | null>(null);

  const maxRadius = 45; // Max distance knob can travel from center

  const handlePointerStart = (clientX: number, clientY: number, identifier: number | null) => {
    if (disabled) return;
    if (!containerRef.current) return;
    activeTouchId.current = identifier;
    setActive(true);
    handlePointerMove(clientX, clientY);
  };

  const handlePointerMove = useCallback((clientX: number, clientY: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const deltaX = clientX - centerX;
    const deltaY = clientY - centerY;
    const distance = Math.hypot(deltaX, deltaY);

    if (distance === 0) {
      setKnobPos({ x: 0, y: 0 });
      onMove({ x: 0, y: 0 });
      return;
    }

    const clampedDist = Math.min(distance, maxRadius);
    const angle = Math.atan2(deltaY, deltaX);

    const nx = Math.cos(angle) * clampedDist;
    const ny = Math.sin(angle) * clampedDist;

    setKnobPos({ x: nx, y: ny });

    // Output normalized vector: x = strafe (-1 to 1), y = forward/back (-1 to 1, where -1 is forward)
    onMove({
      x: nx / maxRadius,
      y: -(ny / maxRadius), // invert so pushing up is positive forward
    });
  }, [maxRadius, onMove]);

  const handlePointerEnd = useCallback(() => {
    activeTouchId.current = null;
    setActive(false);
    setKnobPos({ x: 0, y: 0 });
    onMove({ x: 0, y: 0 });
  }, [onMove]);

  // Touch event handlers
  const onTouchStart = (e: React.TouchEvent) => {
    if (disabled || activeTouchId.current !== null) return;
    const touch = e.changedTouches[0];
    handlePointerStart(touch.clientX, touch.clientY, touch.identifier);
  };

  const onTouchMove = useCallback((e: TouchEvent) => {
    if (activeTouchId.current === null) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === activeTouchId.current) {
        handlePointerMove(touch.clientX, touch.clientY);
        break;
      }
    }
  }, [handlePointerMove]);

  const onTouchEnd = useCallback((e: TouchEvent) => {
    if (activeTouchId.current === null) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === activeTouchId.current) {
        handlePointerEnd();
        break;
      }
    }
  }, [handlePointerEnd]);

  // Mouse event handlers for desktop testing
  const onMouseDown = (e: React.MouseEvent) => {
    if (disabled) return;
    handlePointerStart(e.clientX, e.clientY, -1);
  };

  useEffect(() => {
    const handleWindowMouseMove = (e: MouseEvent) => {
      if (activeTouchId.current === -1) {
        handlePointerMove(e.clientX, e.clientY);
      }
    };
    const handleWindowMouseUp = () => {
      if (activeTouchId.current === -1) {
        handlePointerEnd();
      }
    };

    window.addEventListener('mousemove', handleWindowMouseMove);
    window.addEventListener('mouseup', handleWindowMouseUp);
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd);
    window.addEventListener('touchcancel', onTouchEnd);

    return () => {
      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('mouseup', handleWindowMouseUp);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [handlePointerMove, handlePointerEnd, onTouchMove, onTouchEnd]);

  if (disabled) return null;

  return (
    <div
      ref={containerRef}
      onTouchStart={onTouchStart}
      onMouseDown={onMouseDown}
      className="relative w-28 h-28 rounded-full bg-white/70 backdrop-blur-md border border-rose-200/80 shadow-lg flex items-center justify-center select-none cursor-pointer touch-none z-30"
      style={{
        boxShadow: active
          ? '0 0 20px rgba(244, 63, 94, 0.25), 0 8px 24px rgba(0, 0, 0, 0.08)'
          : '0 8px 24px rgba(0, 0, 0, 0.08)',
      }}
    >
      {/* Outer subtle guide markers */}
      <div className="absolute inset-2 rounded-full border border-rose-100 pointer-events-none" />
      <div className="absolute w-1 h-1 rounded-full bg-rose-300 top-2 pointer-events-none" />
      <div className="absolute w-1 h-1 rounded-full bg-rose-300 bottom-2 pointer-events-none" />
      <div className="absolute w-1 h-1 rounded-full bg-rose-300 left-2 pointer-events-none" />
      <div className="absolute w-1 h-1 rounded-full bg-rose-300 right-2 pointer-events-none" />

      {/* Center knob */}
      <div
        className="w-14 h-14 rounded-full bg-gradient-to-tr from-rose-500 to-rose-400 shadow-md flex items-center justify-center transition-transform duration-75 will-change-transform"
        style={{
          transform: `translate3d(${knobPos.x}px, ${knobPos.y}px, 0)`,
        }}
      >
        <div className="w-5 h-5 rounded-full bg-white/40 border border-white/60" />
      </div>
    </div>
  );
};
