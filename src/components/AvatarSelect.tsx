import React, { useState } from 'react';
import { AVATAR_OPTIONS, PLAYER_SLOT_COLORS } from '../data/avatars';
import { AvatarOption } from '../types/game';
import { audioEngine } from '../audio/audioEngine';
import { Shield, Sparkles, Zap, Volume2, UserCheck, ArrowRight, Play, Users, Wifi, User, CheckCircle2 } from 'lucide-react';

interface AvatarSelectProps {
  playerSlot?: 1 | 2 | 3 | 4;
  initialAvatarId?: string;
  initialPlayerName?: string;
  initialOnlineMode?: boolean;
  onSelectComplete: (
    avatar: AvatarOption,
    playerName: string,
    color: string,
    autoStart?: boolean,
    isOnline?: boolean
  ) => void;
  onBack?: () => void;
  title?: string;
}

export const AvatarSelect: React.FC<AvatarSelectProps> = ({
  playerSlot = 1,
  initialAvatarId = 'leo',
  initialPlayerName = '',
  initialOnlineMode = false,
  onSelectComplete,
  onBack,
  title
}) => {
  const [selectedAvatarId, setSelectedAvatarId] = useState<string>(initialAvatarId);
  const [playerName, setPlayerName] = useState<string>(
    initialPlayerName || `Ranger ${playerSlot}`
  );
  const [selectedColor, setSelectedColor] = useState<string>(
    PLAYER_SLOT_COLORS[playerSlot]?.primary || '#f97316'
  );
  const [selectedModeType, setSelectedModeType] = useState<'solo' | 'local_multi' | 'online'>(
    initialOnlineMode ? 'online' : 'solo'
  );

  const currentAvatar = AVATAR_OPTIONS.find(a => a.id === selectedAvatarId) || AVATAR_OPTIONS[0];

  const handleAvatarClick = (avatar: AvatarOption) => {
    setSelectedAvatarId(avatar.id);
    setSelectedColor(avatar.primaryColor);
    audioEngine.playCaptureSuccess(false, 3);
  };

  const handleAvatarDoubleClick = (avatar: AvatarOption) => {
    setSelectedAvatarId(avatar.id);
    setSelectedColor(avatar.primaryColor);
    audioEngine.playCaptureSuccess(true, 15);
    onSelectComplete(
      avatar,
      playerName.trim() || avatar.name.split(' ')[0],
      avatar.primaryColor,
      true,
      selectedModeType === 'online'
    );
  };

  const handleTestRoar = () => {
    audioEngine.playRoar('sharp_screech');
  };

  const handleQuickPlay = () => {
    audioEngine.playCaptureSuccess(true, 15);
    onSelectComplete(
      currentAvatar,
      playerName.trim() || currentAvatar.name.split(' ')[0],
      selectedColor,
      true,
      selectedModeType === 'online'
    );
  };

  const handleEnterLobby = () => {
    audioEngine.playCaptureSuccess(true, 10);
    onSelectComplete(
      currentAvatar,
      playerName.trim() || currentAvatar.name.split(' ')[0],
      selectedColor,
      false,
      selectedModeType === 'online'
    );
  };

  return (
    <div id="avatar-select-view" className="relative flex min-h-screen w-full flex-col items-center justify-start overflow-y-auto bg-green-600 px-4 py-6 text-white select-none">
      {/* Background Vibrant Texture */}
      <div className="absolute inset-0 bg-gradient-to-b from-green-600 via-emerald-600 to-green-700 pointer-events-none opacity-95" />

      <div className="relative z-10 w-full max-w-5xl space-y-5">
        {/* Vibrant Header Banner */}
        <header className="flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-green-700 p-5 md:p-6 border-b-8 border-green-800 shadow-2xl">
          <div className="flex items-center gap-4">
            <div className="bg-yellow-400 p-3 rounded-2xl rotate-3 shadow-lg border-4 border-yellow-300">
              <span className="text-4xl">🦖</span>
            </div>
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-0.5 text-xs font-black uppercase tracking-wider text-yellow-300">
                <Shield className="h-3.5 w-3.5" />
                Jurassic Ranger Academy • Thám Hiểm Tiền Sử
              </div>
              <h1 className="text-2xl md:text-4xl font-black uppercase italic tracking-tight text-white drop-shadow">
                {title || 'CHỌN NHÂN VẬT & ĐẶT TÊN CỦA BẠN'}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="quick-start-top-btn"
              onClick={handleQuickPlay}
              className="flex items-center gap-2 bg-yellow-400 hover:bg-yellow-300 text-green-950 px-5 py-2.5 rounded-2xl font-black text-sm uppercase italic shadow-xl border-2 border-white transition-all hover:scale-105 active:scale-95 animate-pulse"
            >
              <Play className="h-5 w-5 fill-current" />
              BẮT ĐẦU SĂN NGAY (START HUNT)
            </button>
          </div>
        </header>

        {/* Ranger Customizer: Name, Mode & Suit Color */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          {/* Nickname & Color Box */}
          <div className="md:col-span-7 flex flex-wrap items-center justify-between gap-4 rounded-3xl border-4 border-white/30 bg-green-800/90 p-4 md:p-5 shadow-xl backdrop-blur-md">
            <div className="flex items-center gap-3">
              <div
                className="flex h-14 w-14 items-center justify-center rounded-2xl font-black text-2xl text-slate-950 shadow-lg border-4 border-white shrink-0"
                style={{ backgroundColor: selectedColor }}
              >
                {currentAvatar.id === 'leo' && '🦁'}
                {currentAvatar.id === 'maya' && '🦅'}
                {currentAvatar.id === 'jax' && '🌋'}
                {currentAvatar.id === 'zara' && '🌿'}
                {currentAvatar.id === 'kai' && '⚡'}
                {currentAvatar.id === 'nyx' && '🌙'}
              </div>
              <div>
                <label className="text-xs font-black uppercase tracking-wider text-yellow-300 block mb-1">
                  1. Đặt Tên Thợ Săn Của Bạn (Your Ranger Name)
                </label>
                <input
                  id="player-nickname-input"
                  type="text"
                  maxLength={16}
                  value={playerName}
                  onChange={e => setPlayerName(e.target.value)}
                  placeholder="Nhập tên thợ săn..."
                  className="block w-56 rounded-xl border-4 border-white/60 bg-white px-3 py-1.5 text-base font-black text-green-950 focus:border-yellow-400 focus:outline-none shadow-inner"
                />
              </div>
            </div>

            {/* Quick Color Swatches */}
            <div className="flex items-center gap-1.5 bg-green-900/60 px-3 py-2 rounded-2xl border-2 border-white/20">
              <span className="text-[11px] text-yellow-200 font-black uppercase mr-1">Màu:</span>
              {['#f97316', '#06b6d4', '#10b981', '#ec4899', '#8b5cf6', '#eab308'].map(color => (
                <button
                  key={color}
                  onClick={() => setSelectedColor(color)}
                  style={{ backgroundColor: color }}
                  className={`h-7 w-7 rounded-full border-2 transition-all ${
                    selectedColor === color ? 'scale-125 border-white shadow-xl rotate-6 ring-2 ring-yellow-300' : 'border-transparent opacity-80 hover:opacity-100'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Mode Selector Box */}
          <div className="md:col-span-5 rounded-3xl border-4 border-white/30 bg-green-800/90 p-4 shadow-xl flex flex-col justify-between">
            <label className="text-xs font-black uppercase tracking-wider text-yellow-300 mb-2 block">
              2. Chế Độ Chơi (Play Mode)
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setSelectedModeType('solo')}
                className={`py-2 px-2 rounded-xl font-black text-xs uppercase flex flex-col items-center justify-center gap-1 border-2 transition-all ${
                  selectedModeType === 'solo'
                    ? 'bg-yellow-400 border-white text-green-950 shadow-md scale-105'
                    : 'bg-green-900/80 border-white/20 text-green-200 hover:bg-green-700'
                }`}
              >
                <User className="h-4 w-4" />
                <span>1P Solo</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedModeType('local_multi')}
                className={`py-2 px-2 rounded-xl font-black text-xs uppercase flex flex-col items-center justify-center gap-1 border-2 transition-all ${
                  selectedModeType === 'local_multi'
                    ? 'bg-yellow-400 border-white text-green-950 shadow-md scale-105'
                    : 'bg-green-900/80 border-white/20 text-green-200 hover:bg-green-700'
                }`}
              >
                <Users className="h-4 w-4" />
                <span>1-4P Local</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedModeType('online')}
                className={`py-2 px-2 rounded-xl font-black text-xs uppercase flex flex-col items-center justify-center gap-1 border-2 transition-all ${
                  selectedModeType === 'online'
                    ? 'bg-yellow-400 border-white text-green-950 shadow-md scale-105'
                    : 'bg-green-900/80 border-white/20 text-green-200 hover:bg-green-700'
                }`}
              >
                <Wifi className="h-4 w-4" />
                <span>Online/LAN</span>
              </button>
            </div>
            <p className="text-[11px] text-green-100 font-bold mt-2 truncate">
              {selectedModeType === 'solo' && '🎯 Chơi 1 mình săn khủng long tính điểm'}
              {selectedModeType === 'local_multi' && '🎮 2-4 người cùng chơi trên 1 màn hình/bàn phím'}
              {selectedModeType === 'online' && '🌐 Chơi online rủ bạn bè qua link phòng'}
            </p>
          </div>
        </div>

        {/* 6 Avatar Cards Grid */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-black uppercase tracking-wider text-yellow-300">
              3. Chọn 1 trong 6 Nhân Vật Thợ Săn Dưới Đây (Nhấp Đúp để vào chơi ngay):
            </span>
            <span className="text-xs text-green-200 font-bold">
              Đang chọn: <strong className="text-yellow-300">{currentAvatar.name}</strong>
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {AVATAR_OPTIONS.map(avatar => {
              const isSelected = avatar.id === selectedAvatarId;
              return (
                <div
                  key={avatar.id}
                  id={`avatar-card-${avatar.id}`}
                  onClick={() => handleAvatarClick(avatar)}
                  onDoubleClick={() => handleAvatarDoubleClick(avatar)}
                  className={`group relative flex flex-col justify-between cursor-pointer rounded-3xl border-4 p-5 transition-all duration-200 shadow-xl ${
                    isSelected
                      ? 'border-yellow-400 bg-green-500/90 shadow-2xl scale-[1.03] ring-4 ring-yellow-400/40'
                      : 'border-white/20 bg-green-700/60 hover:border-white/50 hover:bg-green-700/90'
                  }`}
                >
                  {/* Active Selection Badge */}
                  {isSelected && (
                    <div className="absolute -top-3.5 -right-2 flex items-center gap-1.5 rounded-full bg-yellow-400 px-3.5 py-1 text-xs font-black text-green-950 shadow-xl border-2 border-yellow-200 rotate-3">
                      <UserCheck className="h-3.5 w-3.5" />
                      ĐÃ CHỌN!
                    </div>
                  )}

                  <div>
                    {/* Avatar Header & Avatar Icon Circle */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className="flex h-16 w-16 items-center justify-center rounded-full text-3xl shadow-xl border-4 border-white"
                          style={{
                            background: `linear-gradient(135deg, ${avatar.primaryColor}, ${avatar.secondaryColor})`
                          }}
                        >
                          {avatar.id === 'leo' && '🦁'}
                          {avatar.id === 'maya' && '🦅'}
                          {avatar.id === 'jax' && '🌋'}
                          {avatar.id === 'zara' && '🌿'}
                          {avatar.id === 'kai' && '⚡'}
                          {avatar.id === 'nyx' && '🌙'}
                        </div>
                        <div>
                          <h3 className="text-lg font-black uppercase text-white group-hover:text-yellow-200">
                            {avatar.name}
                          </h3>
                          <p className="text-xs font-black text-yellow-300 uppercase">
                            Tuổi {avatar.age} • {avatar.callsign}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Character Quote */}
                    <p className="mt-3 text-xs italic font-semibold text-green-100 border-l-4 border-yellow-400 pl-2.5">
                      "{avatar.quote}"
                    </p>

                    {/* Gear & Specialty */}
                    <div className="mt-3 space-y-1.5 rounded-2xl bg-green-900/50 p-3 text-xs border border-white/10">
                      <div className="flex items-center gap-1.5 text-yellow-200 font-bold">
                        <Zap className="h-3.5 w-3.5 text-yellow-400 shrink-0" />
                        <span className="truncate">{avatar.specialty}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-sky-200 font-medium">
                        <Shield className="h-3.5 w-3.5 text-sky-300 shrink-0" />
                        <span className="truncate">{avatar.gear}</span>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Action */}
                  <div className="mt-4 pt-3 border-t border-white/20 flex items-center justify-between text-xs">
                    <span className="font-bold text-green-200">{avatar.badge}</span>
                    <span className={`font-black uppercase ${isSelected ? 'text-yellow-300' : 'text-white/70'}`}>
                      {isSelected ? '★ Đang Chọn' : 'Bấm để chọn'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom Deploy & Action Buttons */}
        <div className="pt-2 pb-6 flex flex-wrap items-center justify-between gap-4">
          {onBack ? (
            <button
              id="back-to-menu-btn"
              onClick={onBack}
              className="rounded-2xl border-4 border-white/40 bg-green-800 px-6 py-3.5 text-sm font-black uppercase text-white hover:bg-green-700 shadow-lg"
            >
              Quay lại (Back)
            </button>
          ) : (
            <button
              id="test-roar-audio-btn"
              onClick={handleTestRoar}
              className="flex items-center gap-2 rounded-2xl border-4 border-yellow-500 bg-yellow-400 px-5 py-3.5 text-xs font-black uppercase text-yellow-950 hover:bg-yellow-300 shadow-xl"
            >
              <Volume2 className="h-4 w-4" />
              Thử Tiếng Gầm Khủng Long 🔊
            </button>
          )}

          <div className="flex flex-wrap items-center gap-3">
            {/* Enter Lobby Option */}
            <button
              id="enter-lobby-btn"
              onClick={handleEnterLobby}
              className="flex items-center gap-2 rounded-2xl border-4 border-white/60 bg-green-800 hover:bg-green-700 px-6 py-3.5 text-sm font-black text-white uppercase shadow-xl hover:scale-105 active:scale-95"
            >
              Vào Sảnh Chờ (Expedition Lobby) 🚀
            </button>

            {/* Direct Play Action */}
            <button
              id="confirm-avatar-deploy-btn"
              onClick={handleQuickPlay}
              className="flex items-center gap-3 rounded-2xl border-4 border-white bg-yellow-400 hover:bg-yellow-300 px-8 md:px-10 py-3.5 text-lg md:text-xl font-black text-green-950 uppercase italic shadow-2xl transition-all hover:scale-105 active:scale-95 animate-pulse"
            >
              <Play className="h-6 w-6 fill-current" />
              BẮT ĐẦU SĂN KHỦNG LONG NGAY!
              <ArrowRight className="h-6 w-6" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

