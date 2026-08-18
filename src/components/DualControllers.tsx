import React, { useRef, useState } from 'react';
import { Zap } from 'lucide-react';
import { GEM_CATALOG } from '../data/gems';
import { PowerUpType } from '../types/game';

interface ControllerProps {
  onP1Move: (vx: number, vy: number, angle: number) => void;
  onP1Lasso: () => void;
  onP1Boost: () => void;
  onP1Lure: () => void;
  onP1UseGem1?: () => void;
  onP1UseGem2?: () => void;
  onP1UsePowerUp?: () => void;
  p1EquippedGems?: [PowerUpType, PowerUpType];
  p1GemCooldowns?: { gem1: number; gem2: number; sprint: number };
  p1Score?: number;
  p1HeldPowerUp?: string | null;
  p1AimingSlot?: 1 | 2 | null;
  onP2Move?: (vx: number, vy: number, angle: number) => void;
  onP2Lasso?: () => void;
  onP2Boost?: () => void;
  onP2Lure?: () => void;
  onP2UseGem1?: () => void;
  onP2UseGem2?: () => void;
  onP2UsePowerUp?: () => void;
  p2EquippedGems?: [PowerUpType, PowerUpType];
  p2GemCooldowns?: { gem1: number; gem2: number; sprint: number };
  p2Score?: number;
  p2HeldPowerUp?: string | null;
  p2AimingSlot?: 1 | 2 | null;
  isDualMode?: boolean;
}

export const DualControllers: React.FC<ControllerProps> = ({
  onP1Move,
  onP1Lasso,
  onP1Boost,
  onP1Lure,
  onP1UseGem1,
  onP1UseGem2,
  onP1UsePowerUp,
  p1EquippedGems = ['tidal_wave', 'net_trap'],
  p1GemCooldowns = { gem1: 0, gem2: 0, sprint: 0 },
  p1Score = 0,
  p1HeldPowerUp,
  p1AimingSlot = null,
  onP2Move,
  onP2Lasso,
  onP2Boost,
  onP2Lure,
  onP2UseGem1,
  onP2UseGem2,
  onP2UsePowerUp,
  p2EquippedGems = ['earth_fissure', 'stun_shockwave'],
  p2GemCooldowns = { gem1: 0, gem2: 0, sprint: 0 },
  p2Score = 0,
  p2HeldPowerUp,
  p2AimingSlot = null,
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

  const p1Gem1 = GEM_CATALOG.find((g) => g.id === p1EquippedGems[0]) || GEM_CATALOG[0];
  const p1Gem2 = GEM_CATALOG.find((g) => g.id === p1EquippedGems[1]) || GEM_CATALOG[1];
  const p2Gem1 = GEM_CATALOG.find((g) => g.id === p2EquippedGems[0]) || GEM_CATALOG[0];
  const p2Gem2 = GEM_CATALOG.find((g) => g.id === p2EquippedGems[1]) || GEM_CATALOG[1];

  const p1G1Unlocked = p1Score >= p1Gem1.unlockScore;
  const p1G2Unlocked = p1Score >= p1Gem2.unlockScore;
  const p2G1Unlocked = p2Score >= p2Gem1.unlockScore;
  const p2G2Unlocked = p2Score >= p2Gem2.unlockScore;

  const p1G1CdSec = Math.ceil(p1GemCooldowns.gem1 / 30);
  const p1G2CdSec = Math.ceil(p1GemCooldowns.gem2 / 30);
  const p1SprintCdSec = Math.ceil(p1GemCooldowns.sprint / 30);

  const p2G1CdSec = Math.ceil(p2GemCooldowns.gem1 / 30);
  const p2G2CdSec = Math.ceil(p2GemCooldowns.gem2 / 30);
  const p2SprintCdSec = Math.ceil(p2GemCooldowns.sprint / 30);

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
    <div id="dual-on-screen-controllers" className="pointer-events-none absolute inset-x-0 bottom-3 z-30 flex items-end justify-between px-4 sm:px-8 select-none">
      {/* PLAYER 1 CONTROLLER */}
      <div className="pointer-events-auto flex items-end gap-3 sm:gap-4">
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
          {/* Top Row: Lasso & Sprint */}
          <div className="flex items-center gap-2">
            <button
              id="p1-lasso-btn"
              onTouchStart={(e) => { e.preventDefault(); triggerHaptic(); onP1Lasso(); }}
              onClick={() => { triggerHaptic(); onP1Lasso(); }}
              className="flex h-14 w-16 items-center justify-center rounded-2xl border-4 border-yellow-300 bg-yellow-400 font-black text-green-950 shadow-2xl active:scale-90 transition-transform"
            >
              <div className="flex flex-col items-center">
                <span className="text-lg">🪢</span>
                <span className="text-[9px] font-black uppercase">LASSO</span>
              </div>
            </button>

            {/* Universal Sprint Gem */}
            <button
              id="p1-boost-btn"
              onTouchStart={(e) => { e.preventDefault(); triggerHaptic(); onP1Boost(); }}
              onClick={() => { triggerHaptic(); onP1Boost(); }}
              disabled={p1SprintCdSec > 0}
              className={`relative flex h-14 w-14 items-center justify-center rounded-2xl border-4 ${
                p1SprintCdSec > 0
                  ? 'border-slate-600 bg-slate-800 text-slate-400 opacity-80'
                  : 'border-sky-300 bg-sky-500 text-white shadow-xl active:scale-90'
              } font-black`}
              title="Universal Sprint (Shift)"
            >
              <div className="flex flex-col items-center">
                <Zap className="h-4 w-4 stroke-[2.5]" />
                <span className="text-[8px] font-black uppercase">SPRINT</span>
              </div>
              {p1SprintCdSec > 0 && (
                <span className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/60 text-xs font-black text-amber-300">
                  {p1SprintCdSec}s
                </span>
              )}
            </button>
          </div>

          {/* Bottom Row: Gem 1, Gem 2, Lure */}
          <div className="flex gap-2">
            {/* Gem 1 Button */}
            <button
              id="p1-gem1-btn"
              onTouchStart={(e) => { e.preventDefault(); triggerHaptic(); onP1UseGem1?.(); }}
              onClick={() => { triggerHaptic(); onP1UseGem1?.(); }}
              disabled={!p1G1Unlocked || p1G1CdSec > 0}
              className={`relative flex h-12 w-12 items-center justify-center rounded-xl border-2 transition-all ${
                !p1G1Unlocked
                  ? 'border-slate-700 bg-slate-900/90 text-slate-500'
                  : p1G1CdSec > 0
                  ? 'border-slate-600 bg-slate-800 text-slate-400'
                  : p1AimingSlot === 1
                  ? `border-amber-300 ring-4 ring-amber-400 ring-offset-2 ring-offset-slate-950 bg-gradient-to-br ${p1Gem1.badgeBg} text-white shadow-[0_0_20px_rgba(251,191,36,0.8)] scale-110 animate-pulse`
                  : `border-amber-400 bg-gradient-to-br ${p1Gem1.badgeBg} text-white shadow-lg active:scale-90`
              }`}
              title={`Gem 1: ${p1Gem1.nameVi} (Phím Q) ${p1AimingSlot === 1 ? '- Nhấn lần nữa để kích hoạt!' : ''}`}
            >
              <span className="text-xl">{p1Gem1.emoji}</span>
              <span className="absolute -top-1.5 -left-1.5 rounded bg-amber-400 px-1 text-[8px] font-black text-slate-950">Q</span>
              {p1AimingSlot === 1 && (
                <span className="absolute -bottom-2 inset-x-0 mx-auto w-max rounded bg-amber-300 px-1 text-[7px] font-black uppercase text-slate-950 shadow">
                  BẮN!
                </span>
              )}
              {!p1G1Unlocked && (
                <span className="absolute inset-0 flex flex-col items-center justify-center rounded-lg bg-black/75 text-[8px] font-black text-amber-400">
                  🔒 {p1Gem1.unlockScore}đ
                </span>
              )}
              {p1G1Unlocked && p1G1CdSec > 0 && (
                <span className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/70 text-[10px] font-black text-white">
                  {p1G1CdSec}s
                </span>
              )}
            </button>

            {/* Gem 2 Button */}
            <button
              id="p1-gem2-btn"
              onTouchStart={(e) => { e.preventDefault(); triggerHaptic(); onP1UseGem2?.(); }}
              onClick={() => { triggerHaptic(); onP1UseGem2?.(); }}
              disabled={!p1G2Unlocked || p1G2CdSec > 0}
              className={`relative flex h-12 w-12 items-center justify-center rounded-xl border-2 transition-all ${
                !p1G2Unlocked
                  ? 'border-slate-700 bg-slate-900/90 text-slate-500'
                  : p1G2CdSec > 0
                  ? 'border-slate-600 bg-slate-800 text-slate-400'
                  : p1AimingSlot === 2
                  ? `border-amber-300 ring-4 ring-amber-400 ring-offset-2 ring-offset-slate-950 bg-gradient-to-br ${p1Gem2.badgeBg} text-white shadow-[0_0_20px_rgba(251,191,36,0.8)] scale-110 animate-pulse`
                  : `border-amber-400 bg-gradient-to-br ${p1Gem2.badgeBg} text-white shadow-lg active:scale-90`
              }`}
              title={`Gem 2: ${p1Gem2.nameVi} (Phím E) ${p1AimingSlot === 2 ? '- Nhấn lần nữa để kích hoạt!' : ''}`}
            >
              <span className="text-xl">{p1Gem2.emoji}</span>
              <span className="absolute -top-1.5 -left-1.5 rounded bg-amber-400 px-1 text-[8px] font-black text-slate-950">E</span>
              {p1AimingSlot === 2 && (
                <span className="absolute -bottom-2 inset-x-0 mx-auto w-max rounded bg-amber-300 px-1 text-[7px] font-black uppercase text-slate-950 shadow">
                  BẮN!
                </span>
              )}
              {!p1G2Unlocked && (
                <span className="absolute inset-0 flex flex-col items-center justify-center rounded-lg bg-black/75 text-[8px] font-black text-amber-400">
                  🔒 {p1Gem2.unlockScore}đ
                </span>
              )}
              {p1G2Unlocked && p1G2CdSec > 0 && (
                <span className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/70 text-[10px] font-black text-white">
                  {p1G2CdSec}s
                </span>
              )}
            </button>

            {/* Berry Lure */}
            <button
              id="p1-lure-btn"
              onTouchStart={(e) => { e.preventDefault(); triggerHaptic(); onP1Lure(); }}
              onClick={() => { triggerHaptic(); onP1Lure(); }}
              className="flex h-12 w-12 items-center justify-center rounded-xl border-2 border-green-400 bg-green-700 font-black text-white shadow-lg active:scale-90 text-lg"
              title="Drop Berry Lure (F)"
            >
              🍓
            </button>
          </div>
        </div>
      </div>

      {/* PLAYER 2 CONTROLLER (if dual mode) */}
      {isDualMode && onP2Move && onP2Lasso && onP2Boost && onP2Lure && (
        <div className="pointer-events-auto flex items-end gap-3 sm:gap-4">
          {/* P2 Action Buttons */}
          <div className="flex flex-col gap-2">
            {/* Top Row: Lasso & Sprint */}
            <div className="flex items-center gap-2">
              <button
                id="p2-lasso-btn"
                onTouchStart={(e) => { e.preventDefault(); triggerHaptic(); onP2Lasso(); }}
                onClick={() => { triggerHaptic(); onP2Lasso(); }}
                className="flex h-14 w-16 items-center justify-center rounded-2xl border-4 border-cyan-300 bg-cyan-500 font-black text-white shadow-2xl active:scale-90 transition-transform"
              >
                <div className="flex flex-col items-center">
                  <span className="text-lg">🪢</span>
                  <span className="text-[9px] font-black uppercase">LASSO</span>
                </div>
              </button>

              {/* Universal Sprint Gem */}
              <button
                id="p2-boost-btn"
                onTouchStart={(e) => { e.preventDefault(); triggerHaptic(); onP2Boost(); }}
                onClick={() => { triggerHaptic(); onP2Boost(); }}
                disabled={p2SprintCdSec > 0}
                className={`relative flex h-14 w-14 items-center justify-center rounded-2xl border-4 ${
                  p2SprintCdSec > 0
                    ? 'border-slate-600 bg-slate-800 text-slate-400 opacity-80'
                    : 'border-sky-300 bg-sky-500 text-white shadow-xl active:scale-90'
                } font-black`}
                title="P2 Universal Sprint (Numpad 0)"
              >
                <div className="flex flex-col items-center">
                  <Zap className="h-4 w-4 stroke-[2.5]" />
                  <span className="text-[8px] font-black uppercase">SPRINT</span>
                </div>
                {p2SprintCdSec > 0 && (
                  <span className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/60 text-xs font-black text-sky-300">
                    {p2SprintCdSec}s
                  </span>
                )}
              </button>
            </div>

            {/* Bottom Row: Gem 1, Gem 2, Lure */}
            <div className="flex gap-2">
              {/* P2 Gem 1 */}
              <button
                id="p2-gem1-btn"
                onTouchStart={(e) => { e.preventDefault(); triggerHaptic(); onP2UseGem1?.(); }}
                onClick={() => { triggerHaptic(); onP2UseGem1?.(); }}
                disabled={!p2G1Unlocked || p2G1CdSec > 0}
                className={`relative flex h-12 w-12 items-center justify-center rounded-xl border-2 transition-all ${
                  !p2G1Unlocked
                    ? 'border-slate-700 bg-slate-900/90 text-slate-500'
                    : p2G1CdSec > 0
                    ? 'border-slate-600 bg-slate-800 text-slate-400'
                    : p2AimingSlot === 1
                    ? `border-cyan-300 ring-4 ring-cyan-400 ring-offset-2 ring-offset-slate-950 bg-gradient-to-br ${p2Gem1.badgeBg} text-white shadow-[0_0_20px_rgba(34,211,238,0.8)] scale-110 animate-pulse`
                    : `border-cyan-400 bg-gradient-to-br ${p2Gem1.badgeBg} text-white shadow-lg active:scale-90`
                }`}
                title={`P2 Gem 1: ${p2Gem1.nameVi} (Numpad 1) ${p2AimingSlot === 1 ? '- Nhấn lần nữa để kích hoạt!' : ''}`}
              >
                <span className="text-xl">{p2Gem1.emoji}</span>
                <span className="absolute -top-1.5 -left-1.5 rounded bg-cyan-400 px-1 text-[8px] font-black text-slate-950">1</span>
                {p2AimingSlot === 1 && (
                  <span className="absolute -bottom-2 inset-x-0 mx-auto w-max rounded bg-cyan-300 px-1 text-[7px] font-black uppercase text-slate-950 shadow">
                    BẮN!
                  </span>
                )}
                {!p2G1Unlocked && (
                  <span className="absolute inset-0 flex flex-col items-center justify-center rounded-lg bg-black/75 text-[8px] font-black text-cyan-400">
                    🔒 {p2Gem1.unlockScore}đ
                  </span>
                )}
                {p2G1Unlocked && p2G1CdSec > 0 && (
                  <span className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/70 text-[10px] font-black text-white">
                    {p2G1CdSec}s
                  </span>
                )}
              </button>

              {/* P2 Gem 2 */}
              <button
                id="p2-gem2-btn"
                onTouchStart={(e) => { e.preventDefault(); triggerHaptic(); onP2UseGem2?.(); }}
                onClick={() => { triggerHaptic(); onP2UseGem2?.(); }}
                disabled={!p2G2Unlocked || p2G2CdSec > 0}
                className={`relative flex h-12 w-12 items-center justify-center rounded-xl border-2 transition-all ${
                  !p2G2Unlocked
                    ? 'border-slate-700 bg-slate-900/90 text-slate-500'
                    : p2G2CdSec > 0
                    ? 'border-slate-600 bg-slate-800 text-slate-400'
                    : p2AimingSlot === 2
                    ? `border-cyan-300 ring-4 ring-cyan-400 ring-offset-2 ring-offset-slate-950 bg-gradient-to-br ${p2Gem2.badgeBg} text-white shadow-[0_0_20px_rgba(34,211,238,0.8)] scale-110 animate-pulse`
                    : `border-cyan-400 bg-gradient-to-br ${p2Gem2.badgeBg} text-white shadow-lg active:scale-90`
                }`}
                title={`P2 Gem 2: ${p2Gem2.nameVi} (Numpad 2) ${p2AimingSlot === 2 ? '- Nhấn lần nữa để kích hoạt!' : ''}`}
              >
                <span className="text-xl">{p2Gem2.emoji}</span>
                <span className="absolute -top-1.5 -left-1.5 rounded bg-cyan-400 px-1 text-[8px] font-black text-slate-950">2</span>
                {p2AimingSlot === 2 && (
                  <span className="absolute -bottom-2 inset-x-0 mx-auto w-max rounded bg-cyan-300 px-1 text-[7px] font-black uppercase text-slate-950 shadow">
                    BẮN!
                  </span>
                )}
                {!p2G2Unlocked && (
                  <span className="absolute inset-0 flex flex-col items-center justify-center rounded-lg bg-black/75 text-[8px] font-black text-cyan-400">
                    🔒 {p2Gem2.unlockScore}đ
                  </span>
                )}
                {p2G2Unlocked && p2G2CdSec > 0 && (
                  <span className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/70 text-[10px] font-black text-white">
                    {p2G2CdSec}s
                  </span>
                )}
              </button>

              {/* P2 Berry Lure */}
              <button
                id="p2-lure-btn"
                onTouchStart={(e) => { e.preventDefault(); triggerHaptic(); onP2Lure(); }}
                onClick={() => { triggerHaptic(); onP2Lure(); }}
                className="flex h-12 w-12 items-center justify-center rounded-xl border-2 border-purple-400 bg-purple-700 font-black text-white shadow-lg active:scale-90 text-lg"
                title="P2 Berry Lure (Numpad +)"
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
