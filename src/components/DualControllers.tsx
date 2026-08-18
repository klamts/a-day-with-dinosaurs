import React, { useRef, useState, useEffect } from 'react';
import { Sparkles, Zap, Radio, Target } from 'lucide-react';

interface ControllerProps {
  onP1Move: (vx: number, vy: number, angle: number) => void;
  onP1Lasso: () => void;
  onP1Boost: () => void;
  onP1Lure: () => void;
  onP2Move?: (vx: number, vy: number, angle: number) => void;
  onP2Lasso?: () => void;
  onP2Boost?: () => void;
  onP2Lure?: () => void;
  isDualMode?: boolean;
}

export const DualControllers: React.FC<ControllerProps> = ({
  onP1Move,
  onP1Lasso,
  onP1Boost,
  onP1Lure,
  onP2Move,
  onP2Lasso,
  onP2Boost,
  onP2Lure,
  isDualMode = false
}) => {
  const [p1StickPos, setP1StickPos] = useState({ x: 0, y: 0 });
  const [p2StickPos, setP2StickPos] = useState({ x: 0, y: 0 });
  const p1TouchId = useRef<number | null>(null);
  const p2TouchId = useRef<number | null>(null);
  const p1BaseRef = useRef<HTMLDivElement>(null);
  const p2BaseRef = useRef<HTMLDivElement>(null);

  const triggerHaptic = () => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(25);
    }
  };

  // Touch handlers for Player 1 Stick
  const handleP1TouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    const touch = e.changedTouches[0];
    p1TouchId.current = touch.identifier;
    updateP1Stick(touch.clientX, touch.clientY);
  };

  const handleP1TouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === p1TouchId.current) {
        updateP1Stick(touch.clientX, touch.clientY);
      }
    }
  };

  const handleP1TouchEnd = (e: React.TouchEvent) => {
    e.preventDefault();
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === p1TouchId.current) {
        p1TouchId.current = null;
        setP1StickPos({ x: 0, y: 0 });
        onP1Move(0, 0, 0);
      }
    }
  };

  const updateP1Stick = (clientX: number, clientY: number) => {
    if (!p1BaseRef.current) return;
    const rect = p1BaseRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    let dx = clientX - centerX;
    let dy = clientY - centerY;
    const dist = Math.hypot(dx, dy);
    const maxRadius = 38;

    if (dist > maxRadius) {
      dx = (dx / dist) * maxRadius;
      dy = (dy / dist) * maxRadius;
    }

    setP1StickPos({ x: dx, y: dy });
    const normX = dx / maxRadius;
    const normY = dy / maxRadius;
    const angle = Math.atan2(dy, dx);
    onP1Move(normX, normY, angle);
  };

  // Touch handlers for Player 2 Stick
  const handleP2TouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    const touch = e.changedTouches[0];
    p2TouchId.current = touch.identifier;
    updateP2Stick(touch.clientX, touch.clientY);
  };

  const handleP2TouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === p2TouchId.current) {
        updateP2Stick(touch.clientX, touch.clientY);
      }
    }
  };

  const handleP2TouchEnd = (e: React.TouchEvent) => {
    e.preventDefault();
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === p2TouchId.current) {
        p2TouchId.current = null;
        setP2StickPos({ x: 0, y: 0 });
        if (onP2Move) onP2Move(0, 0, 0);
      }
    }
  };

  const updateP2Stick = (clientX: number, clientY: number) => {
    if (!p2BaseRef.current || !onP2Move) return;
    const rect = p2BaseRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    let dx = clientX - centerX;
    let dy = clientY - centerY;
    const dist = Math.hypot(dx, dy);
    const maxRadius = 38;

    if (dist > maxRadius) {
      dx = (dx / dist) * maxRadius;
      dy = (dy / dist) * maxRadius;
    }

    setP2StickPos({ x: dx, y: dy });
    const normX = dx / maxRadius;
    const normY = dy / maxRadius;
    const angle = Math.atan2(dy, dx);
    onP2Move(normX, normY, angle);
  };

  return (
    <div id="dual-on-screen-controllers" className="pointer-events-none absolute inset-x-0 bottom-3 z-30 flex items-end justify-between px-6 select-none">
      {/* PLAYER 1 CONTROLLER (ORANGE / YELLOW VIBRANT SUIT) */}
      <div className="pointer-events-auto flex items-end gap-5">
        {/* P1 Virtual Joystick */}
        <div
          id="p1-joystick-base"
          ref={p1BaseRef}
          onTouchStart={handleP1TouchStart}
          onTouchMove={handleP1TouchMove}
          onTouchEnd={handleP1TouchEnd}
          className="relative flex h-28 w-28 items-center justify-center rounded-full border-4 border-yellow-400 bg-orange-600/80 shadow-2xl backdrop-blur-md"
        >
          <div className="absolute text-[10px] font-black uppercase text-yellow-200 top-2">
            P1 STICK
          </div>
          {/* Thumb stick */}
          <div
            id="p1-joystick-thumb"
            style={{ transform: `translate(${p1StickPos.x}px, ${p1StickPos.y}px)` }}
            className="flex h-14 w-14 items-center justify-center rounded-full border-4 border-white bg-yellow-400 font-black text-xs text-green-950 shadow-2xl transition-transform duration-75"
          >
            P1
          </div>
        </div>

        {/* P1 Action Buttons */}
        <div className="flex flex-col gap-2">
          {/* Lasso Catch Button */}
          <button
            id="p1-lasso-btn"
            onTouchStart={(e) => { e.preventDefault(); triggerHaptic(); onP1Lasso(); }}
            onClick={() => { triggerHaptic(); onP1Lasso(); }}
            className="flex h-16 w-16 items-center justify-center rounded-2xl border-4 border-yellow-300 bg-yellow-400 font-black text-green-950 shadow-2xl active:scale-90 transition-transform"
          >
            <div className="flex flex-col items-center">
              <span className="text-xl">🪢</span>
              <span className="text-[10px] font-black uppercase">LASSO</span>
            </div>
          </button>

          <div className="flex gap-2">
            {/* Boost */}
            <button
              id="p1-boost-btn"
              onTouchStart={(e) => { e.preventDefault(); triggerHaptic(); onP1Boost(); }}
              onClick={() => { triggerHaptic(); onP1Boost(); }}
              className="flex h-12 w-12 items-center justify-center rounded-xl border-4 border-orange-600 bg-orange-500 font-black text-white shadow-xl active:scale-90"
              title="Speed Boost"
            >
              <Zap className="h-5 w-5 stroke-[2.5]" />
            </button>

            {/* Berry Lure */}
            <button
              id="p1-lure-btn"
              onTouchStart={(e) => { e.preventDefault(); triggerHaptic(); onP1Lure(); }}
              onClick={() => { triggerHaptic(); onP1Lure(); }}
              className="flex h-12 w-12 items-center justify-center rounded-xl border-4 border-white bg-green-600 font-black text-white shadow-xl active:scale-90 text-lg"
              title="Drop Berry Lure"
            >
              🍓
            </button>
          </div>
        </div>
      </div>

      {/* PLAYER 2 CONTROLLER (BLUE / SKY VIBRANT SUIT - if dual mode) */}
      {isDualMode && onP2Move && onP2Lasso && onP2Boost && onP2Lure && (
        <div className="pointer-events-auto flex items-end gap-5">
          {/* P2 Action Buttons */}
          <div className="flex flex-col gap-2">
            {/* Lasso Catch Button */}
            <button
              id="p2-lasso-btn"
              onTouchStart={(e) => { e.preventDefault(); triggerHaptic(); onP2Lasso(); }}
              onClick={() => { triggerHaptic(); onP2Lasso(); }}
              className="flex h-16 w-16 items-center justify-center rounded-2xl border-4 border-white bg-blue-500 font-black text-white shadow-2xl active:scale-90 transition-transform"
            >
              <div className="flex flex-col items-center">
                <span className="text-xl">🪢</span>
                <span className="text-[10px] font-black uppercase">LASSO</span>
              </div>
            </button>

            <div className="flex gap-2">
              {/* Boost */}
              <button
                id="p2-boost-btn"
                onTouchStart={(e) => { e.preventDefault(); triggerHaptic(); onP2Boost(); }}
                onClick={() => { triggerHaptic(); onP2Boost(); }}
                className="flex h-12 w-12 items-center justify-center rounded-xl border-4 border-sky-400 bg-sky-500 font-black text-white shadow-xl active:scale-90"
                title="Speed Boost"
              >
                <Zap className="h-5 w-5 stroke-[2.5]" />
              </button>

              {/* Berry Lure */}
              <button
                id="p2-lure-btn"
                onTouchStart={(e) => { e.preventDefault(); triggerHaptic(); onP2Lure(); }}
                onClick={() => { triggerHaptic(); onP2Lure(); }}
                className="flex h-12 w-12 items-center justify-center rounded-xl border-4 border-white bg-purple-600 font-black text-white shadow-xl active:scale-90 text-lg"
                title="Drop Berry Lure"
              >
                🍓
              </button>
            </div>
          </div>

          {/* P2 Virtual Joystick */}
          <div
            id="p2-joystick-base"
            ref={p2BaseRef}
            onTouchStart={handleP2TouchStart}
            onTouchMove={handleP2TouchMove}
            onTouchEnd={handleP2TouchEnd}
            className="relative flex h-28 w-28 items-center justify-center rounded-full border-4 border-sky-300 bg-blue-700/80 shadow-2xl backdrop-blur-md"
          >
            <div className="absolute text-[10px] font-black uppercase text-sky-200 top-2">
              P2 STICK
            </div>
            {/* Thumb stick */}
            <div
              id="p2-joystick-thumb"
              style={{ transform: `translate(${p2StickPos.x}px, ${p2StickPos.y}px)` }}
              className="flex h-14 w-14 items-center justify-center rounded-full border-4 border-white bg-sky-400 font-black text-xs text-white shadow-2xl transition-transform duration-75"
            >
              P2
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
