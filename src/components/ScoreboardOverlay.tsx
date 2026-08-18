import React from 'react';
import { GameMode, Player } from '../types/game';
import { AVATAR_OPTIONS, PLAYER_SLOT_COLORS } from '../data/avatars';
import { audioEngine } from '../audio/audioEngine';
import {
  Trophy,
  Clock,
  HeartHandshake,
  Volume2,
  VolumeX,
  BookOpen,
  Sparkles,
  Zap,
  Radio,
  Flame,
  Home
} from 'lucide-react';

interface ScoreboardProps {
  mode: GameMode;
  timeRemaining: number;
  players: Record<string, Player>;
  coopTeamScore: number;
  coopTargetScore: number;
  coopComboMultiplier: number;
  comboTimer: number;
  recentCaptures: Array<{
    playerName: string;
    dinoName: string;
    points: number;
    timestamp: number;
    isFast: boolean;
  }>;
  playerCount?: number;
  onSetPlayerCount?: (count: number) => void;
  onOpenFieldGuide: () => void;
  onOpenAvatarSelect?: () => void;
  onAddBot?: () => void;
  onRestartMatch?: () => void;
  onRoarEmote: (roarType: string) => void;
  onToggleMute: () => void;
  isMuted: boolean;
  onExitToLobby: () => void;
}

export const ScoreboardOverlay: React.FC<ScoreboardProps> = ({
  mode,
  timeRemaining,
  players,
  coopTeamScore,
  coopTargetScore,
  coopComboMultiplier,
  comboTimer,
  recentCaptures,
  playerCount,
  onSetPlayerCount,
  onOpenFieldGuide,
  onOpenAvatarSelect,
  onAddBot,
  onRestartMatch,
  onRoarEmote,
  onToggleMute,
  isMuted,
  onExitToLobby
}) => {
  const playerList = (Object.values(players) as Player[]).sort((a, b) => b.score - a.score);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div id="game-hud-overlay" className="pointer-events-none absolute inset-0 flex flex-col justify-between p-4 select-none">
      {/* Top Header Bar */}
      <div className="flex items-start justify-between gap-3">
        {/* Left: Player Leaderboard / Score Badges */}
        <div className="pointer-events-auto flex flex-col gap-2">
          {playerList.map((player, idx) => {
            const slotColor = PLAYER_SLOT_COLORS[player.slotNumber];

            return (
              <div
                key={player.id}
                id={`hud-player-${player.id}`}
                className="flex items-center gap-2.5 rounded-2xl border-4 border-white/80 bg-green-700/90 px-3.5 py-1.5 shadow-xl backdrop-blur-md"
              >
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-xl text-xs font-black text-slate-950 shadow-md border-2 border-white"
                  style={{ backgroundColor: player.color || slotColor?.primary || '#f97316' }}
                >
                  P{player.slotNumber}
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5 text-xs font-black uppercase text-white">
                    <span className="truncate max-w-[95px]">{player.name}</span>
                    {idx === 0 && mode === 'competitive' && (
                      <span className="text-yellow-300">👑</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-[11px] font-black">
                    <span className="bg-yellow-400 text-green-950 px-1.5 py-0.2 rounded font-black">
                      {player.score} PTS
                    </span>
                    <span className="text-yellow-200">⚡{player.fastDinosCount}</span>
                    <span className="text-green-200">🐢{player.slowDinosCount}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Center: Timer & Mode Header / Co-op Meter */}
        <div className="flex flex-col items-center">
          {/* Main Vibrant Timer Display */}
          <div
            id="hud-timer-display"
            className={`flex items-center gap-2 rounded-2xl border-4 px-6 py-2 shadow-2xl backdrop-blur-md transition-all ${
              timeRemaining <= 15
                ? 'border-white bg-rose-600 text-white animate-bounce'
                : 'border-yellow-500 bg-yellow-400 text-green-950 rotate-1'
            }`}
          >
            <Clock className="h-6 w-6 stroke-[3]" />
            <span className="text-2xl md:text-3xl font-black tracking-wider uppercase italic">
              {formatTime(timeRemaining)}
            </span>
          </div>

          {/* Cooperative Team Score & Combo Bar */}
          {mode === 'cooperative' && (
            <div className="mt-2 flex flex-col items-center rounded-2xl border-4 border-orange-600 bg-orange-500 px-5 py-1.5 shadow-xl text-white">
              <div className="flex items-center gap-2 text-xs md:text-sm font-black uppercase italic tracking-wide">
                <HeartHandshake className="h-4 w-4" />
                TEAM SCORE: {coopTeamScore} / {coopTargetScore} PTS
              </div>
              {coopComboMultiplier > 1 && (
                <div className="flex items-center gap-1 text-xs font-black text-yellow-200 animate-pulse uppercase">
                  <Sparkles className="h-3.5 w-3.5" />
                  CO-OP COMBO x{coopComboMultiplier}! (Dual Lasso Boost)
                </div>
              )}
            </div>
          )}

          {/* Recent Dinosaur Catch Feed Ticker */}
          {recentCaptures.length > 0 && (
            <div className="mt-2 hidden sm:flex items-center gap-2 rounded-full border-4 border-blue-700 bg-blue-600 px-4 py-1 text-xs text-white font-black shadow-lg">
              <span className="text-yellow-300">{recentCaptures[0].playerName}</span>
              <span>caught</span>
              <span className="text-white italic underline">{recentCaptures[0].dinoName}</span>
              <span className={`px-2 py-0.5 rounded-full ${recentCaptures[0].isFast ? 'bg-rose-500 text-white' : 'bg-yellow-400 text-green-950'}`}>
                +{recentCaptures[0].points} PTS
              </span>
            </div>
          )}
        </div>

        {/* Right: Soundboard Emotes & Quick Utility Buttons */}
        <div className="pointer-events-auto flex items-center gap-2">
          {/* Quick Dinosaur Roar Emotes */}
          <div className="flex gap-1.5 bg-green-800/90 p-1.5 rounded-2xl border-4 border-white/50 shadow-lg">
            <button
              id="roar-trex-btn"
              onClick={() => onRoarEmote('apex_roar')}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-yellow-400 text-xl hover:scale-110 active:scale-95 shadow border-2 border-yellow-500"
              title="Roar: T-Rex Apex Call"
            >
              🦖
            </button>
            <button
              id="roar-raptor-btn"
              onClick={() => onRoarEmote('sharp_screech')}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500 text-xl hover:scale-110 active:scale-95 shadow border-2 border-orange-600"
              title="Roar: Velociraptor Screech"
            >
              🦅
            </button>
            <button
              id="roar-brachio-btn"
              onClick={() => onRoarEmote('deep_bellow')}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500 text-xl hover:scale-110 active:scale-95 shadow border-2 border-blue-600"
              title="Roar: Brachiosaurus Bellow"
            >
              🦕
            </button>
          </div>

          {/* Quick Player Count Mode Switcher (1P Solo, 2P, 3P, 4P) */}
          {onSetPlayerCount && (
            <div className="flex items-center bg-green-900/90 p-1 rounded-2xl border-4 border-white/40 shadow-lg">
              {[1, 2, 3, 4].map(num => (
                <button
                  key={num}
                  id={`hud-set-players-${num}-btn`}
                  onClick={() => onSetPlayerCount(num)}
                  className={`px-2 py-1 rounded-xl text-xs font-black uppercase transition-all ${
                    (playerCount || Object.keys(players).length) === num
                      ? 'bg-yellow-400 text-green-950 shadow-md scale-105'
                      : 'text-white/80 hover:text-white hover:bg-green-700/50'
                  }`}
                  title={num === 1 ? 'Solo Player Mode (1P)' : `${num} Players Mode`}
                >
                  {num === 1 ? '1P Solo' : `${num}P`}
                </button>
              ))}
            </div>
          )}

          {/* Direct Avatar Change Button */}
          {onOpenAvatarSelect && (
            <button
              id="hud-change-avatar-btn"
              onClick={onOpenAvatarSelect}
              className="flex items-center gap-1.5 rounded-2xl border-4 border-yellow-400 bg-yellow-400 text-green-950 px-3 py-2 text-xs font-black uppercase italic hover:bg-yellow-300 active:scale-95 shadow-xl"
              title="Change Avatar"
            >
              <span className="text-base">🧑‍🚀</span>
              <span className="hidden sm:inline">Avatar</span>
            </button>
          )}

          {/* Direct Add Bot Button */}
          {onAddBot && (
            <button
              id="hud-add-bot-btn"
              onClick={onAddBot}
              className="flex items-center gap-1 rounded-2xl border-4 border-emerald-400 bg-emerald-500 text-white px-2.5 py-2 text-xs font-black uppercase italic hover:bg-emerald-400 active:scale-95 shadow-xl"
              title="Add AI Bot Player (Max 4)"
            >
              <span>+🤖</span>
              <span className="hidden md:inline">Bot</span>
            </button>
          )}

          {/* Field Guide Button */}
          <button
            id="hud-field-guide-btn"
            onClick={onOpenFieldGuide}
            className="flex h-11 w-11 items-center justify-center rounded-2xl border-4 border-yellow-400 bg-yellow-300 text-green-950 hover:bg-yellow-200 active:scale-95 shadow-xl"
            title="Dino Field Guide & Phonics"
          >
            <BookOpen className="h-5 w-5 stroke-[2.5]" />
          </button>

          {/* Mute Toggle */}
          <button
            id="hud-mute-toggle-btn"
            onClick={onToggleMute}
            className="flex h-11 w-11 items-center justify-center rounded-2xl border-4 border-white/60 bg-green-700 text-white hover:bg-green-600 active:scale-95 shadow-xl"
            title="Mute / Unmute Audio"
          >
            {isMuted ? <VolumeX className="h-5 w-5 text-rose-300 stroke-[2.5]" /> : <Volume2 className="h-5 w-5 text-yellow-300 stroke-[2.5]" />}
          </button>

          {/* Exit / Menu */}
          <button
            id="hud-exit-lobby-btn"
            onClick={onExitToLobby}
            className="flex items-center gap-1 rounded-2xl border-4 border-white bg-white text-green-950 px-3 py-2 text-xs font-black uppercase italic hover:bg-yellow-300 active:scale-95 shadow-xl"
          >
            <Home className="h-4 w-4" />
            <span className="hidden sm:inline">Lobby</span>
          </button>
        </div>
      </div>

      {/* Bottom Hint Strip */}
      <div className="pointer-events-none flex justify-center pb-1">
        <div className="rounded-full bg-green-900/90 px-5 py-1.5 text-xs font-black uppercase tracking-wide text-white shadow-xl border-4 border-white/40">
          💡 <span className="text-yellow-300 font-extrabold">HUNT TIP:</span> Fast Dinos (Velociraptor, Carnotaurus, T-Rex) = 10-25 PTS! Slow Dinos (Brachiosaurus) = 2 PTS!
        </div>
      </div>
    </div>
  );
};
