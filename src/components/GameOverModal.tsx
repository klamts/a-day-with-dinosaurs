import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { GameMode, Player } from '../types/game';
import { AVATAR_OPTIONS } from '../data/avatars';
import { audioEngine } from '../audio/audioEngine';
import { Trophy, Award, HeartHandshake, RotateCcw, Home, Sparkles, Zap, Shield } from 'lucide-react';

interface GameOverModalProps {
  mode: GameMode;
  players: Record<string, Player>;
  coopTeamScore: number;
  coopTargetScore: number;
  onRematch: () => void;
  onReturnToLobby: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  mode,
  players,
  coopTeamScore,
  coopTargetScore,
  onRematch,
  onReturnToLobby
}) => {
  const playerList = (Object.values(players) as Player[]).sort((a, b) => b.score - a.score);
  const winner = playerList[0];
  const isCoopSuccess = coopTeamScore >= coopTargetScore;

  useEffect(() => {
    // Fire celebratory confetti!
    audioEngine.playVictory();
    confetti({
      particleCount: 100,
      spread: 80,
      origin: { y: 0.5 }
    });
  }, []);

  return (
    <div id="game-over-modal" className="fixed inset-0 z-50 flex items-center justify-center bg-green-950/80 p-4 backdrop-blur-md select-none">
      <div className="relative flex w-full max-w-2xl flex-col items-center rounded-3xl border-8 border-white bg-green-700 p-6 md:p-8 text-center text-white shadow-2xl">
        {/* Glow & Trophy Header Badge */}
        <div className="absolute -top-12 flex h-24 w-24 items-center justify-center rounded-3xl border-4 border-yellow-300 bg-yellow-400 text-green-950 shadow-2xl rotate-3">
          {mode === 'cooperative' ? (
            <HeartHandshake className="h-12 w-12 stroke-[2.5]" />
          ) : (
            <Trophy className="h-12 w-12 stroke-[2.5]" />
          )}
        </div>

        {/* Title */}
        <div className="mt-10">
          <div className="text-xs font-black uppercase tracking-wider text-yellow-300 bg-green-800/80 px-4 py-1 rounded-full inline-block border-2 border-white/20">
            {mode === 'cooperative' ? 'JURASSIC RANGER SQUAD MISSION REPORT' : 'PREHISTORIC EXPEDITION CONCLUDED'}
          </div>
          <h2 className="mt-2 text-3xl md:text-4xl font-black uppercase italic tracking-tight text-white drop-shadow">
            {mode === 'cooperative'
              ? isCoopSuccess
                ? '🎉 Mission Accomplished: Legends!'
                : '🦕 Prehistoric Sanctuary Explored!'
              : `🏆 ${winner?.name || 'Ranger 1'} Takes 1st Place!`}
          </h2>
          <p className="mt-1 text-sm font-bold text-green-100">
            {mode === 'cooperative'
              ? `Team Score: ${coopTeamScore} / ${coopTargetScore} Points Collected Together!`
              : `Fast dinosaurs gave the ultimate winning edge!`}
          </p>
        </div>

        {/* Player Standings Grid */}
        <div className="mt-6 w-full space-y-3">
          {playerList.map((player, idx) => {
            const avatar = AVATAR_OPTIONS.find(a => a.id === player.avatarId);
            return (
              <div
                key={player.id}
                id={`gameover-rank-${idx + 1}`}
                className={`flex items-center justify-between rounded-2xl border-4 p-4 transition-all ${
                  idx === 0
                    ? 'border-yellow-400 bg-yellow-400 text-green-950 shadow-xl'
                    : 'border-white/30 bg-green-800/70 text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-11 w-11 items-center justify-center rounded-xl font-black text-xl text-white shadow border-2 border-white"
                    style={{ backgroundColor: player.color }}
                  >
                    #{idx + 1}
                  </div>
                  <div className="text-left">
                    <div className="flex items-center gap-2 font-black text-lg uppercase italic">
                      {player.name}
                      {idx === 0 && <span className="text-xs bg-green-950 text-yellow-400 px-2 py-0.5 rounded-full font-black">👑 CHAMPION</span>}
                    </div>
                    <div className={`text-xs font-bold ${idx === 0 ? 'text-green-900' : 'text-green-200'}`}>
                      {avatar?.callsign || 'Apex Ranger'}
                    </div>
                  </div>
                </div>

                {/* Score & Dino stats */}
                <div className="flex items-center gap-4 text-right">
                  <div className="text-xs font-black">
                    <div className={idx === 0 ? 'text-rose-700' : 'text-rose-300'}>⚡ {player.fastDinosCount} Fast Dinos</div>
                    <div className={idx === 0 ? 'text-green-900' : 'text-green-200'}>🐢 {player.slowDinosCount} Slow Dinos</div>
                  </div>
                  <div className={`text-3xl font-black ${idx === 0 ? 'text-green-950' : 'text-yellow-300'}`}>
                    {player.score} <span className="text-xs font-bold opacity-80">PTS</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex w-full flex-wrap items-center justify-center gap-4">
          <button
            id="rematch-btn"
            onClick={onRematch}
            className="flex items-center gap-2 rounded-2xl border-4 border-yellow-500 bg-yellow-400 px-8 py-3.5 text-lg font-black text-green-950 shadow-2xl hover:bg-yellow-300 active:scale-95 uppercase italic"
          >
            <RotateCcw className="h-6 w-6 stroke-[3]" />
            PLAY AGAIN / REMATCH
          </button>
          <button
            id="back-to-lobby-btn"
            onClick={onReturnToLobby}
            className="flex items-center gap-2 rounded-2xl border-4 border-orange-600 bg-orange-500 px-8 py-3.5 text-lg font-black text-white hover:bg-orange-400 active:scale-95 uppercase italic shadow-2xl"
          >
            <Home className="h-6 w-6 stroke-[2.5]" />
            LOBBY & AVATAR HUB
          </button>
        </div>
      </div>
    </div>
  );
};
