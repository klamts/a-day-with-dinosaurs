import React, { useState, useEffect } from 'react';
import { GameMode, MapType, Player, PowerUpType } from '../types/game';
import { AVATAR_OPTIONS, PLAYER_SLOT_COLORS } from '../data/avatars';
import { GEM_CATALOG } from '../data/gems';
import { GemSelectionPanel } from './GemSelectionPanel';
import { audioEngine } from '../audio/audioEngine';
import { speechEngine } from '../audio/speechEngine';
import { RenderDeployModal } from './RenderDeployModal';
import {
  Users,
  Trophy,
  HeartHandshake,
  Flame,
  Globe,
  Monitor,
  Copy,
  Check,
  Play,
  RotateCcw,
  Sparkles,
  Bot,
  Swords,
  Layers,
  ArrowRight,
  Shield,
  Cloud,
  Radio,
  ExternalLink,
  Plus,
  BookOpen,
  Volume2,
  GraduationCap
} from 'lucide-react';

import { AvatarOption } from '../types/game';

interface LobbyRoomProps {
  roomId: string;
  isOnlineMode: boolean;
  isHost: boolean;
  gameMode: GameMode;
  selectedMap: MapType;
  players: Record<string, Player>;
  localPlayerCount: number;
  currentPlayerName?: string;
  currentAvatar?: AvatarOption;
  currentColor?: string;
  equippedGems?: [PowerUpType, PowerUpType];
  onSelectGems?: (slot1: PowerUpType, slot2: PowerUpType) => void;
  onUpdateProfile?: (avatar: AvatarOption, name: string, color: string) => void;
  onSetGameMode: (mode: GameMode) => void;
  onSetMap: (map: MapType) => void;
  onSetLocalPlayerCount: (count: number) => void;
  onAddBot: () => void;
  onRemoveBot: (playerId: string) => void;
  onToggleReady: () => void;
  onStartGame: () => void;
  onSwitchToAvatarSelect: (slot: 1 | 2 | 3 | 4) => void;
  onSwitchModeOnlineLocal: (isOnline: boolean) => void;
  onJoinRoomByCode: (code: string) => void;
  isReady: boolean;
}

export const LobbyRoom: React.FC<LobbyRoomProps> = ({
  roomId,
  isOnlineMode,
  isHost,
  gameMode,
  selectedMap,
  players,
  localPlayerCount,
  currentPlayerName = 'Leo',
  currentAvatar = AVATAR_OPTIONS[0],
  currentColor = '#f97316',
  equippedGems = ['tidal_wave', 'net_trap'],
  onSelectGems,
  onUpdateProfile,
  onSetGameMode,
  onSetMap,
  onSetLocalPlayerCount,
  onAddBot,
  onRemoveBot,
  onToggleReady,
  onStartGame,
  onSwitchToAvatarSelect,
  onSwitchModeOnlineLocal,
  onJoinRoomByCode,
  isReady
}) => {
  const [copied, setCopied] = useState(false);
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [isRenderModalOpen, setIsRenderModalOpen] = useState(false);
  const [publicRooms, setPublicRooms] = useState<any[]>([]);
  const [tempName, setTempName] = useState(currentPlayerName);

  useEffect(() => {
    setTempName(currentPlayerName);
  }, [currentPlayerName]);

  const playerList = Object.values(players) as Player[];

  // Fetch active rooms on Render / Server
  useEffect(() => {
    if (isOnlineMode) {
      fetch('/api/rooms')
        .then(res => res.json())
        .then(data => {
          if (data.rooms) setPublicRooms(data.rooms);
        })
        .catch(() => {});
    }
  }, [isOnlineMode]);

  const handleCopyRoomLink = () => {
    const url = `${window.location.origin}?room=${roomId}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    audioEngine.playCaptureSuccess(false, 2);
    speechEngine.speak('Room link copied!');
  };

  const handleJoinByCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCodeInput.trim()) return;
    onJoinRoomByCode(joinCodeInput.trim().toUpperCase());
    setJoinCodeInput('');
  };

  const handleStart = () => {
    audioEngine.playCaptureSuccess(true, 25);
    speechEngine.speak('Game Start! Catch the dinosaurs!');
    onStartGame();
  };

  return (
    <div id="lobby-view" className="flex min-h-screen w-full flex-col bg-green-600 font-sans text-white overflow-x-hidden select-none">
      {/* Top Header */}
      <header className="p-4 md:p-6 bg-green-700 border-b-8 border-green-800 flex flex-wrap justify-between items-center shadow-xl gap-4">
        <div className="flex items-center gap-4">
          <div className="bg-yellow-400 p-3 rounded-2xl rotate-3 shadow-lg border-4 border-yellow-300 flex items-center justify-center">
            <span className="text-4xl">🦖</span>
          </div>
          <div>
            <h1 className="text-3xl md:text-5xl font-black tracking-tighter uppercase italic drop-shadow">
              A Day with Dinosaurs
            </h1>
            <p className="text-xs md:text-sm font-bold text-yellow-300 uppercase tracking-wider flex items-center gap-2">
              <span>English Learning & Prehistoric Expedition</span>
              {isOnlineMode ? (
                <span className="inline-flex items-center gap-1 bg-blue-500 text-white px-2.5 py-0.5 rounded-full text-[10px] font-black animate-pulse">
                  <Radio className="h-3 w-3" /> ONLINE SERVER
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 bg-orange-500 text-white px-2.5 py-0.5 rounded-full text-[10px] font-black">
                  🎮 LOCAL SCREEN (1-4 PLAYERS)
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Action Buttons & Local/Online Switcher */}
        <div className="flex flex-wrap items-center gap-2 md:gap-3">
          {/* Direct Start Button right in the header for instant access */}
          <button
            id="quick-start-lobby-header-btn"
            onClick={handleStart}
            className="flex items-center gap-2 bg-yellow-400 hover:bg-yellow-300 text-green-950 font-black text-sm md:text-base px-6 py-2.5 rounded-full border-4 border-white shadow-2xl transition-all hover:scale-105 active:scale-95 animate-pulse uppercase italic"
          >
            <Play className="h-5 w-5 fill-current" />
            <span>START HUNT NOW!</span>
          </button>

          {/* Render Deploy Guide Modal Trigger */}
          <button
            id="open-render-deploy-btn"
            onClick={() => setIsRenderModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-full border-4 border-yellow-400 bg-yellow-400 hover:bg-yellow-300 text-green-950 font-black text-xs md:text-sm uppercase transition-all shadow-lg hover:scale-105 active:scale-95"
            title="Deploy to Render.com for Online Multiplayer"
          >
            <Cloud className="h-4 w-4 stroke-[2.5]" />
            <span>DEPLOY TO RENDER</span>
          </button>

          {/* Mode Switchers */}
          <button
            onClick={() => onSwitchModeOnlineLocal(false)}
            className={`px-4 py-2.5 rounded-full border-4 font-black text-xs md:text-sm uppercase transition-all shadow-md ${
              !isOnlineMode
                ? 'bg-orange-500 border-orange-600 text-white scale-105 shadow-orange-950/40'
                : 'bg-green-800 border-green-900 text-green-200 hover:text-white'
            }`}
          >
            LOCAL (1-4P)
          </button>

          <button
            id="tab-lan-network-btn"
            onClick={() => onSwitchModeOnlineLocal(true)}
            className={`px-4 py-2.5 rounded-full border-4 font-black text-xs md:text-sm uppercase transition-all shadow-md ${
              isOnlineMode
                ? 'bg-blue-500 border-blue-600 text-white scale-105 shadow-blue-950/40'
                : 'bg-green-800 border-green-900 text-green-200 hover:text-white'
            }`}
          >
            ONLINE / LAN
          </button>
        </div>
      </header>

      {/* Main Grid: 3-column responsive layout */}
      <main className="flex-1 p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-5 max-w-7xl mx-auto w-full">
        {/* Left Section (Col 1-4): Mode & Map Selection & Player Count */}
        <section className="lg:col-span-4 flex flex-col gap-4 bg-green-700 p-5 rounded-3xl border-4 border-green-800 shadow-xl">
          {/* Game Mode Selector */}
          <div>
            <label className="text-xs font-black uppercase tracking-wider text-yellow-300 mb-1.5 block">
              Game Mode
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                id="mode-competitive-btn"
                onClick={() => onSetGameMode('competitive')}
                className={`flex flex-col items-center justify-center p-3 rounded-2xl border-4 font-black text-xs uppercase transition-all ${
                  gameMode === 'competitive'
                    ? 'bg-yellow-400 border-yellow-300 text-green-950 shadow-lg scale-102'
                    : 'bg-green-800 border-green-900 text-green-200 hover:bg-green-750'
                }`}
              >
                <Trophy className="h-5 w-5 mb-1 text-orange-600" />
                <span>Competitive</span>
                <span className="text-[10px] font-bold opacity-80 mt-0.5">Free-For-All</span>
              </button>

              <button
                id="mode-cooperative-btn"
                onClick={() => onSetGameMode('cooperative')}
                className={`flex flex-col items-center justify-center p-3 rounded-2xl border-4 font-black text-xs uppercase transition-all ${
                  gameMode === 'cooperative'
                    ? 'bg-yellow-400 border-yellow-300 text-green-950 shadow-lg scale-102'
                    : 'bg-green-800 border-green-900 text-green-200 hover:bg-green-750'
                }`}
              >
                <HeartHandshake className="h-5 w-5 mb-1 text-emerald-700" />
                <span>Co-op Squad</span>
                <span className="text-[10px] font-bold opacity-80 mt-0.5">Team Target</span>
              </button>
            </div>
          </div>

          {/* Map Selection */}
          <div>
            <label className="text-xs font-black uppercase tracking-wider text-yellow-300 mb-1.5 block">
              Expedition Map
            </label>
            <div className="space-y-2">
              {[
                { id: 'jurassic_jungle', name: 'Jurassic Jungle', desc: 'Lush ferns & hidden raptors', icon: '🌿' },
                { id: 'volcanic_valley', name: 'Volcanic Valley', desc: 'Basalt plains & T-Rex territory', icon: '🌋' },
                { id: 'crystal_river', name: 'Crystal River', desc: 'Prehistoric rivers & pterosaurs', icon: '💎' }
              ].map((map) => (
                <button
                  key={map.id}
                  id={`map-select-${map.id}`}
                  onClick={() => onSetMap(map.id as MapType)}
                  className={`w-full flex items-center justify-between p-2.5 rounded-2xl border-4 transition-all text-left ${
                    selectedMap === map.id
                      ? 'bg-yellow-400 border-white text-green-950 shadow-md scale-102 font-black'
                      : 'bg-green-800 border-green-900 text-white hover:bg-green-750'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{map.icon}</span>
                    <div>
                      <div className="text-sm font-black uppercase">{map.name}</div>
                      <div className={`text-[11px] ${selectedMap === map.id ? 'text-green-900 font-bold' : 'text-green-200'}`}>
                        {map.desc}
                      </div>
                    </div>
                  </div>
                  {selectedMap === map.id && (
                    <span className="bg-green-900 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                      ACTIVE
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Local Player Count Selector */}
          {!isOnlineMode && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-black uppercase tracking-wider text-yellow-300">
                  Player Count (1 to 4 Players)
                </label>
                <span className="text-[11px] font-bold text-green-200">
                  {localPlayerCount === 1 ? '1P Solo Mode' : `${localPlayerCount} Players`}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { num: 1, label: '1P Solo' },
                  { num: 2, label: '2P Duo' },
                  { num: 3, label: '3P Trio' },
                  { num: 4, label: '4P Squad' }
                ].map(({ num, label }) => (
                  <button
                    key={num}
                    id={`player-count-${num}-btn`}
                    onClick={() => onSetLocalPlayerCount(num)}
                    className={`py-2.5 rounded-xl border-4 font-black text-xs uppercase transition-all flex flex-col items-center justify-center ${
                      localPlayerCount === num
                        ? 'bg-yellow-400 border-white text-green-950 shadow-lg scale-105'
                        : 'bg-green-800 border-green-900 text-green-200 hover:bg-green-700'
                    }`}
                  >
                    <span className="text-sm font-black">{num}P</span>
                    <span className="text-[9px] font-bold opacity-90">{num === 1 ? 'Solo' : `${num} Players`}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Online Room Code Form */}
          {isOnlineMode && (
            <div className="bg-green-800/80 p-3.5 rounded-2xl border-2 border-white/30 space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black uppercase tracking-wider text-yellow-300 block">
                  Online Room (1 to 4 Players)
                </label>
                <span className="text-[10px] bg-yellow-400 text-green-950 font-black px-2 py-0.5 rounded-full">
                  {playerList.length} / 4 Rangers
                </span>
              </div>
              <p className="text-[11px] text-green-100 leading-snug font-bold">
                Click <span className="text-yellow-300">Start</span> to play Solo, or share the Room Code for friends on other devices to join!
              </p>
              <form onSubmit={handleJoinByCodeSubmit} className="flex gap-2">
                <input
                  type="text"
                  value={joinCodeInput}
                  onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                  placeholder="e.g. DINO-LAN"
                  maxLength={12}
                  className="flex-1 bg-green-950 border-2 border-yellow-400 rounded-xl px-3 py-2 text-xs font-mono font-bold text-yellow-300 uppercase placeholder:text-green-600 focus:outline-none"
                />
                <button
                  type="submit"
                  className="bg-yellow-400 hover:bg-yellow-300 text-green-950 font-black text-xs uppercase px-4 py-2 rounded-xl shadow active:scale-95"
                >
                  Join
                </button>
              </form>
            </div>
          )}

          {/* Educational English Learning Tip */}
          <div className="mt-auto bg-white/10 p-3.5 rounded-2xl border-2 border-white/20">
            <div className="flex items-center gap-1.5 text-yellow-300 font-black text-xs uppercase mb-1">
              <GraduationCap className="h-4 w-4 text-yellow-300" />
              <span>English Learning Pro Tip:</span>
            </div>
            <p className="text-xs font-bold leading-relaxed text-yellow-100">
              Listen to dinosaur names & English vocabulary words in the <strong>Field Guide</strong> to practice pronunciation!
            </p>
          </div>
        </section>

        {/* Center Section (Col 5-8): Prehistoric Stage & Squad Avatar Roster */}
        <section className="lg:col-span-5 flex flex-col gap-4 bg-sky-300 rounded-3xl border-8 border-white relative overflow-hidden shadow-inner p-5 md:p-6 text-green-950">
          <div className="absolute inset-0 bg-gradient-to-b from-sky-400 via-sky-300 to-green-300 pointer-events-none" />

          {/* Floating Prehistoric Badges */}
          <div className="relative z-10 flex justify-between items-center">
            <div className="bg-green-800 text-white px-4 py-1.5 rounded-full flex items-center gap-2 border-4 border-white shadow-xl rotate-2">
              <span className="text-xl">💨 🦖</span>
              <span className="font-black text-xs uppercase">Raptor Rush</span>
            </div>
            <div className="bg-orange-600 text-white px-4 py-1.5 rounded-full flex items-center gap-2 border-4 border-white shadow-xl -rotate-2">
              <span className="text-xl">🐢 🦕</span>
              <span className="font-black text-xs uppercase">Stego Graze</span>
            </div>
          </div>

          {/* Center Stage Banner */}
          <div className="relative z-10 text-center my-1">
            <div className="text-3xl mb-0.5">☄️ 🌋</div>
            <h3 className="text-xl md:text-2xl font-black text-green-950 uppercase italic tracking-tight drop-shadow">
              Dinosaurs Everywhere!
            </h3>
            <p className="text-xs text-green-900 font-bold">
              Throw your lasso to catch fast dinosaurs before time runs out!
            </p>
          </div>

          {/* Quick Ranger Profile & Avatar Customizer Box */}
          <div className="relative z-10 bg-white/95 rounded-2xl p-3 border-4 border-yellow-400 shadow-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase text-green-950 flex items-center gap-1.5">
                <span>👤 Nhân Vật & Tên Của Bạn (Your Hero):</span>
              </span>
              <button
                type="button"
                onClick={() => onSwitchToAvatarSelect(1)}
                className="text-[10px] font-black text-orange-600 hover:text-orange-700 bg-orange-100 hover:bg-orange-200 px-2 py-0.5 rounded-lg transition-all"
              >
                Chi Tiết Nhân Vật ✏️
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  maxLength={14}
                  value={tempName}
                  onChange={(e) => {
                    setTempName(e.target.value);
                    if (onUpdateProfile) {
                      onUpdateProfile(currentAvatar, e.target.value, currentColor);
                    }
                  }}
                  placeholder="Tên thợ săn..."
                  className="w-36 bg-green-50 border-2 border-green-700 rounded-xl px-2.5 py-1 text-xs font-black text-green-950 focus:outline-none focus:border-yellow-500 shadow-inner"
                />
              </div>

              {/* 6 One-Click Avatar Selectors */}
              <div className="flex items-center gap-1.5 bg-green-100/80 p-1 rounded-xl border border-green-300">
                {AVATAR_OPTIONS.map((av) => {
                  const isSelected = av.id === currentAvatar.id;
                  return (
                    <button
                      key={av.id}
                      type="button"
                      title={`${av.name} (${av.specialty})`}
                      onClick={() => {
                        audioEngine.playCaptureSuccess(false, 3);
                        if (onUpdateProfile) {
                          onUpdateProfile(av, tempName || av.name.split(' ')[0], av.primaryColor);
                        }
                      }}
                      className={`h-8 w-8 rounded-full flex items-center justify-center text-base transition-all border-2 ${
                        isSelected
                          ? 'scale-115 border-yellow-500 shadow-lg ring-2 ring-yellow-400 rotate-6'
                          : 'border-transparent opacity-75 hover:opacity-100 hover:scale-105'
                      }`}
                      style={{ backgroundColor: av.primaryColor }}
                    >
                      {av.id === 'leo' && '🦁'}
                      {av.id === 'maya' && '🦅'}
                      {av.id === 'jax' && '🌋'}
                      {av.id === 'zara' && '🌿'}
                      {av.id === 'kai' && '⚡'}
                      {av.id === 'nyx' && '🌙'}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 💎 KỸ NĂNG GEM TRƯỚC TRẬN ĐẤU (Gem Skills Selector) */}
          <div className="relative z-10">
            <GemSelectionPanel
              equippedGems={equippedGems}
              onSelectGems={onSelectGems}
            />
          </div>

          {/* Active Player Slots List */}
          <div className="relative z-10 flex-1 grid grid-cols-2 gap-3">
            {playerList.map((player) => {
              const avatar = AVATAR_OPTIONS.find(a => a.id === player.avatarId) || AVATAR_OPTIONS[0];
              const slotColor = PLAYER_SLOT_COLORS[player.slotNumber];
              const pGems = player.equippedGems || equippedGems;
              const g1Def = GEM_CATALOG.find(g => g.id === pGems[0]);
              const g2Def = GEM_CATALOG.find(g => g.id === pGems[1]);

              return (
                <div
                  key={player.id}
                  id={`lobby-player-card-${player.id}`}
                  onClick={() => onSwitchToAvatarSelect(player.slotNumber)}
                  className="group relative flex flex-col justify-between bg-white/95 hover:bg-white rounded-2xl p-3 border-4 border-green-800/30 shadow-lg cursor-pointer transition-transform hover:scale-102"
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-12 h-12 rounded-full border-4 border-white flex items-center justify-center text-2xl shadow-md shrink-0"
                      style={{ backgroundColor: player.color || slotColor?.primary || '#f97316' }}
                    >
                      {avatar.id === 'leo' && '🦁'}
                      {avatar.id === 'maya' && '🦅'}
                      {avatar.id === 'jax' && '🌋'}
                      {avatar.id === 'zara' && '🌿'}
                      {avatar.id === 'kai' && '⚡'}
                      {avatar.id === 'nyx' && '🌙'}
                    </div>
                    <div className="overflow-hidden flex-1">
                      <div className="flex items-center gap-1">
                        <span className="font-black text-xs uppercase text-green-950 truncate">
                          {player.name}
                        </span>
                        {player.isHost && (
                          <span className="text-[9px] bg-yellow-400 px-1 rounded font-black text-slate-900">
                            HOST
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] font-bold text-green-800 truncate">
                        P{player.slotNumber} • {avatar.callsign}
                      </div>
                      {/* Equipped Gem preview */}
                      <div className="flex items-center gap-1 mt-1">
                        <span className="text-[9px] bg-amber-100 text-amber-900 border border-amber-300 px-1.5 py-0.5 rounded font-black flex items-center gap-0.5">
                          {g1Def?.emoji} {g1Def?.nameVi}
                        </span>
                        <span className="text-[9px] bg-amber-100 text-amber-900 border border-amber-300 px-1.5 py-0.5 rounded font-black flex items-center gap-0.5">
                          {g2Def?.emoji} {g2Def?.nameVi}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-2 pt-1.5 border-t border-green-800/20 flex items-center justify-between text-[10px]">
                    <span className="font-black text-green-900">
                      {player.inputSource === 'bot' ? '🤖 AI Bot' : '🎮 Ranger'}
                    </span>
                    <span className="font-bold text-orange-600 group-hover:underline">
                      Change Avatar ✏️
                    </span>
                  </div>
                </div>
              );
            })}

            {/* Add Bot button if slot available */}
            {playerList.length < 4 && (
              <button
                id="lobby-add-bot-btn"
                onClick={onAddBot}
                className="flex flex-col items-center justify-center bg-white/50 hover:bg-white/80 border-4 border-dashed border-green-800/40 rounded-2xl p-3 text-green-950 transition-all font-black text-xs uppercase"
              >
                <Bot className="h-6 w-6 mb-1 text-green-900" />
                + Add AI Bot Ranger
              </button>
            )}
          </div>
        </section>

        {/* Right Section (Col 9-12): Speed & Points Value Guide */}
        <section className="lg:col-span-3 flex flex-col gap-4">
          {/* Point Guide Card */}
          <div className="bg-yellow-400 rounded-3xl p-5 border-4 border-yellow-500 text-yellow-950 shadow-xl">
            <h2 className="text-xl font-black mb-3 uppercase italic tracking-tight flex items-center justify-between">
              <span>Speed & Points Value</span>
              <span className="text-xs bg-yellow-950 text-yellow-400 px-2 py-0.5 rounded-full font-bold">
                DINOSAURS
              </span>
            </h2>
            <div className="space-y-2">
              <div className="flex items-center justify-between bg-white/70 p-2.5 rounded-xl border border-yellow-600/30">
                <span className="flex items-center gap-1.5 font-black text-xs uppercase italic text-yellow-950">
                  ⚡ RAPTOR (Fast)
                </span>
                <span className="bg-orange-600 text-white px-2.5 py-0.5 rounded-lg font-black text-xs shadow">
                  10 PTS
                </span>
              </div>
              <div className="flex items-center justify-between bg-white/70 p-2.5 rounded-xl border border-yellow-600/30">
                <span className="flex items-center gap-1.5 font-black text-xs uppercase italic text-yellow-950">
                  🏃 TRICERA (Medium)
                </span>
                <span className="bg-orange-500 text-white px-2.5 py-0.5 rounded-lg font-black text-xs shadow">
                  5 PTS
                </span>
              </div>
              <div className="flex items-center justify-between bg-white/70 p-2.5 rounded-xl border border-yellow-600/30">
                <span className="flex items-center gap-1.5 font-black text-xs uppercase italic text-yellow-950">
                  🐢 STEGO (Slow)
                </span>
                <span className="bg-orange-400 text-white px-2.5 py-0.5 rounded-lg font-black text-xs shadow">
                  2 PTS
                </span>
              </div>
              <div className="flex items-center justify-between bg-white/70 p-2.5 rounded-xl border border-yellow-600/30">
                <span className="flex items-center gap-1.5 font-black text-xs uppercase italic text-yellow-950">
                  👑 T-REX (Apex Boss)
                </span>
                <span className="bg-rose-600 text-white px-2.5 py-0.5 rounded-lg font-black text-xs shadow">
                  25 PTS
                </span>
              </div>
            </div>
          </div>

          {/* Top Scores & Squad Status */}
          <div className="bg-blue-600 rounded-3xl p-5 border-4 border-blue-700 flex-1 shadow-xl text-white flex flex-col justify-between">
            <div>
              <h2 className="text-xl font-black mb-3 uppercase italic tracking-tight flex items-center justify-between">
                <span>Rangers in Squad</span>
                <span className="text-xs bg-blue-900 text-blue-200 px-2 py-0.5 rounded-full font-bold">
                  {playerList.length}/4
                </span>
              </h2>
              <div className="space-y-2 text-xs font-black uppercase">
                {playerList.map((p, i) => (
                  <div key={p.id} className="flex justify-between items-center border-b border-blue-400/40 py-1.5">
                    <span className="flex items-center gap-1.5">
                      <span className="text-yellow-300">#{i + 1}</span> {p.name}
                    </span>
                    <span className="text-yellow-300 font-extrabold">READY</span>
                  </div>
                ))}
              </div>
            </div>

            {isOnlineMode && (
              <div className="mt-4 bg-blue-950/50 p-3 rounded-2xl border border-blue-400/30">
                <div className="text-[10px] font-bold text-blue-200 uppercase">Current Room Code:</div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-lg font-black tracking-widest text-yellow-300">{roomId}</span>
                  <button
                    onClick={handleCopyRoomLink}
                    className="bg-blue-500 hover:bg-blue-400 px-2.5 py-1.5 rounded-lg text-white text-xs font-bold flex items-center gap-1"
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    <span className="text-[10px]">Copy Link</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Footer Start Bar */}
      <footer className="h-24 bg-green-800 border-t-8 border-green-900 flex flex-wrap items-center justify-between px-6 md:px-12 gap-4 shadow-2xl">
        <div className="flex items-center gap-6 overflow-x-auto py-1">
          {playerList.slice(0, 2).map((player) => (
            <div key={player.id} className="flex gap-2.5 items-center">
              <div
                className="w-11 h-11 bg-white rounded-2xl flex items-center justify-center text-slate-950 font-black text-lg border-2 border-green-900 shadow-md"
                style={{ backgroundColor: player.color }}
              >
                P{player.slotNumber}
              </div>
              <div>
                <div className="h-3 w-28 bg-green-950 rounded-full overflow-hidden border border-green-700">
                  <div className="h-full bg-green-400 w-full animate-pulse"></div>
                </div>
                <span className="text-[11px] font-black uppercase text-yellow-300">
                  {player.name} Ready
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="ml-auto">
          <button
            id="start-game-btn"
            onClick={handleStart}
            className="bg-white hover:bg-yellow-300 text-green-950 font-black text-2xl md:text-3xl px-10 md:px-14 py-3 rounded-2xl hover:scale-105 active:scale-95 shadow-2xl uppercase italic border-4 border-white transition-all flex items-center gap-3"
          >
            <Play className="h-7 w-7 fill-current" />
            START HUNT!
          </button>
        </div>
      </footer>

      {/* Render Deploy Guide Modal */}
      <RenderDeployModal
        isOpen={isRenderModalOpen}
        onClose={() => setIsRenderModalOpen(false)}
        currentRoomId={roomId}
      />
    </div>
  );
};
