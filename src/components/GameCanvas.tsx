import React, { useRef, useEffect, useState, useCallback } from 'react';
import { GameRoomState, Player, ActiveDinosaur, CaptureParticle } from '../types/game';
import { drawPrehistoricMap, drawDinosaur, drawPlayer } from '../utils/dinoRenderer';
import { DINOSAUR_CATALOG } from '../data/dinosaurs';
import { audioEngine } from '../audio/audioEngine';

interface GameCanvasProps {
  roomState: GameRoomState;
  localPlayerId: string;
  isOnlineMode: boolean;
  onSendPlayerInput: (vx: number, vy: number, angle: number, isBoosting: boolean) => void;
  onThrowLasso: (angle?: number) => void;
  onDropLure: () => void;
  onLocalP2Input?: (vx: number, vy: number, angle: number, isBoosting: boolean) => void;
  onLocalP2Lasso?: () => void;
  onLocalP2Lure?: () => void;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({
  roomState,
  localPlayerId,
  isOnlineMode,
  onSendPlayerInput,
  onThrowLasso,
  onDropLure,
  onLocalP2Input,
  onLocalP2Lasso,
  onLocalP2Lure
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameId = useRef<number | null>(null);
  const timeTickRef = useRef<number>(0);
  const particlesRef = useRef<CaptureParticle[]>([]);

  // Key tracking
  const keysPressed = useRef<{ [key: string]: boolean }>({});

  // Input broadcast loop
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysPressed.current[e.code] = true;

      // P1 Actions
      if (e.code === 'Space') {
        e.preventDefault();
        onThrowLasso();
        audioEngine.playLassoThrow();
      } else if (e.code === 'KeyE') {
        e.preventDefault();
        onDropLure();
        audioEngine.playLureDrop();
      }

      // P2 Actions (if local multiplayer)
      if (onLocalP2Lasso && (e.code === 'Enter' || e.code === 'NumpadEnter')) {
        e.preventDefault();
        onLocalP2Lasso();
        audioEngine.playLassoThrow();
      } else if (onLocalP2Lure && e.code === 'ShiftRight') {
        e.preventDefault();
        onLocalP2Lure();
        audioEngine.playLureDrop();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current[e.code] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [onThrowLasso, onDropLure, onLocalP2Lasso, onLocalP2Lure]);

  // Main input calculation loop (60 Hz)
  useEffect(() => {
    const interval = setInterval(() => {
      const keys = keysPressed.current;

      // --- PLAYER 1 (WASD) ---
      let p1vx = 0;
      let p1vy = 0;
      if (keys['KeyW'] || keys['ArrowUp']) p1vy -= 1;
      if (keys['KeyS'] || keys['ArrowDown']) p1vy += 1;
      if (keys['KeyA'] || keys['ArrowLeft']) p1vx -= 1;
      if (keys['KeyD'] || keys['ArrowRight']) p1vx += 1;

      if (p1vx !== 0 || p1vy !== 0) {
        const len = Math.hypot(p1vx, p1vy);
        p1vx /= len;
        p1vy /= len;
        const angle = Math.atan2(p1vy, p1vx);
        onSendPlayerInput(p1vx, p1vy, angle, !!keys['ShiftLeft']);
      } else {
        onSendPlayerInput(0, 0, 0, false);
      }

      // --- PLAYER 2 (Arrows if P1 is using WASD, or IJKL) ---
      if (onLocalP2Input) {
        let p2vx = 0;
        let p2vy = 0;
        if (keys['ArrowUp'] || keys['KeyI']) p2vy -= 1;
        if (keys['ArrowDown'] || keys['KeyK']) p2vy += 1;
        if (keys['ArrowLeft'] || keys['KeyJ']) p2vx -= 1;
        if (keys['ArrowRight'] || keys['KeyL']) p2vx += 1;

        if (p2vx !== 0 || p2vy !== 0) {
          const len = Math.hypot(p2vx, p2vy);
          p2vx /= len;
          p2vy /= len;
          const angle = Math.atan2(p2vy, p2vx);
          onLocalP2Input(p2vx, p2vy, angle, !!keys['ControlRight']);
        } else {
          onLocalP2Input(0, 0, 0, false);
        }
      }
    }, 1000 / 60);

    return () => clearInterval(interval);
  }, [onSendPlayerInput, onLocalP2Input]);

  // Main Canvas Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      timeTickRef.current += 1;
      const timeTick = timeTickRef.current;

      const width = canvas.width;
      const height = canvas.height;

      // 1. Draw Map & Terrain
      drawPrehistoricMap(ctx, width, height, roomState.map, timeTick);

      // 2. Draw Active Lures
      roomState.lures?.forEach(lure => {
        ctx.save();
        ctx.fillStyle = 'rgba(234, 179, 8, 0.2)';
        ctx.strokeStyle = '#eab308';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 6]);
        ctx.beginPath();
        ctx.arc(lure.x, lure.y, lure.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Lure Berry icon
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(lure.x, lure.y, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#22c55e';
        ctx.beginPath();
        ctx.arc(lure.x, lure.y - 8, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // 3. Draw Dinosaurs
      roomState.dinos?.forEach(dino => {
        drawDinosaur(ctx, dino, timeTick);
      });

      // 4. Draw Players & Lassos
      (Object.values(roomState.players) as Player[]).forEach(player => {
        const isLocal = player.id === localPlayerId;
        drawPlayer(ctx, player, timeTick, isLocal);
      });

      // 5. Draw Particle Effects (+Points, Sparks)
      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const p = particlesRef.current[i];
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= 0.02;
        p.life -= 1;

        if (p.life <= 0 || p.alpha <= 0) {
          particlesRef.current.splice(i, 1);
        } else {
          ctx.save();
          ctx.globalAlpha = Math.max(0, p.alpha);
          if (p.text) {
            ctx.fillStyle = p.color;
            ctx.font = 'bold 16px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(p.text, p.x, p.y);
          } else {
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
        }
      }

      animationFrameId.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [roomState, localPlayerId]);

  // Handle capture particle spawn on recent capture event
  useEffect(() => {
    if (roomState.recentCaptures && roomState.recentCaptures.length > 0) {
      const latest = roomState.recentCaptures[0];
      if (Date.now() - latest.timestamp < 100) {
        // Spawn floating text particle
        particlesRef.current.push({
          x: 700 + (Math.random() * 200 - 100),
          y: 450 + (Math.random() * 200 - 100),
          vx: (Math.random() - 0.5) * 2,
          vy: -2.5,
          color: latest.isFast ? '#f43f5e' : '#10b981',
          size: 4,
          alpha: 1.0,
          life: 50,
          text: `+${latest.points} PTS! ${latest.dinoName}`
        });

        // Sparks
        for (let s = 0; s < 12; s++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = Math.random() * 4 + 2;
          particlesRef.current.push({
            x: 700,
            y: 450,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            color: '#fbbf24',
            size: Math.random() * 3 + 2,
            alpha: 1.0,
            life: 30
          });
        }
      }
    }
  }, [roomState.recentCaptures]);

  // Handle pointer / mouse click on canvas to throw lasso towards target
  const handleCanvasPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;

    const localPlayer = roomState.players[localPlayerId];
    if (localPlayer) {
      const angle = Math.atan2(clickY - localPlayer.y, clickX - localPlayer.x);
      onThrowLasso(angle);
      audioEngine.playLassoThrow();
    } else {
      onThrowLasso();
      audioEngine.playLassoThrow();
    }
  };

  const [showTutorialHint, setShowTutorialHint] = useState<boolean>(true);
  useEffect(() => {
    const timer = setTimeout(() => setShowTutorialHint(false), 7000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div id="game-canvas-wrapper" className="relative flex h-full w-full items-center justify-center overflow-hidden bg-slate-950">
      <canvas
        id="dino-game-canvas"
        ref={canvasRef}
        width={1400}
        height={900}
        onPointerDown={handleCanvasPointerDown}
        className="h-full w-full max-h-screen object-contain shadow-2xl cursor-crosshair"
      />

      {/* Floating Tutorial Banner on Match Start */}
      {showTutorialHint && (
        <div className="pointer-events-none absolute top-20 z-20 flex flex-col items-center animate-bounce">
          <div className="rounded-2xl border-4 border-yellow-400 bg-green-900/95 px-6 py-3 text-center shadow-2xl backdrop-blur-md">
            <p className="text-base font-black text-yellow-300 uppercase tracking-wide">
              🎯 HƯỚNG DẪN BẮT KHỦNG LONG:
            </p>
            <p className="text-xs font-bold text-white mt-1">
              Phím <span className="bg-yellow-400 text-green-950 px-1.5 py-0.5 rounded font-black">W A S D</span> hoặc Mũi tên: Di chuyển • 
              Phím <span className="bg-yellow-400 text-green-950 px-1.5 py-0.5 rounded font-black">SPACE</span> hoặc <span className="text-yellow-300 underline">CLICK CHUỘT</span> vào khủng long để Quăng Thòng Lọng (Lasso)!
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
