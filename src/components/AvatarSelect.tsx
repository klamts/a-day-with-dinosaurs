import React, { useState } from 'react';
import { AVATAR_OPTIONS, PLAYER_SLOT_COLORS } from '../data/avatars';
import { AvatarOption } from '../types/game';
import { audioEngine } from '../audio/audioEngine';
import { Shield, Sparkles, Zap, Volume2, UserCheck, ArrowRight, Play } from 'lucide-react';

interface AvatarSelectProps {
  playerSlot?: 1 | 2 | 3 | 4;
  initialAvatarId?: string;
  initialPlayerName?: string;
  onSelectComplete: (avatar: AvatarOption, playerName: string, color: string, autoStart?: boolean) => void;
  onBack?: () => void;
  title?: string;
}

export const AvatarSelect: React.FC<AvatarSelectProps> = ({
  playerSlot = 1,
  initialAvatarId = 'leo',
  initialPlayerName = '',
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
    onSelectComplete(avatar, playerName.trim() || avatar.name.split(' ')[0], avatar.primaryColor, true);
  };

  const handleTestRoar = () => {
    audioEngine.playRoar('sharp_screech');
  };

  const handleQuickPlay = () => {
    audioEngine.playCaptureSuccess(true, 15);
    onSelectComplete(currentAvatar, playerName.trim() || currentAvatar.name.split(' ')[0], selectedColor, true);
  };

  const handleEnterLobby = () => {
    audioEngine.playCaptureSuccess(true, 10);
    onSelectComplete(currentAvatar, playerName.trim() || currentAvatar.name.split(' ')[0], selectedColor, false);
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
                {title || 'CHỌN NHÂN VẬT & BẮT ĐẦU SĂN KHỦNG LONG'}
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
              CHƠI NGAY (QUICK PLAY)
            </button>
          </div>
        </header>

        {/* Clear Instructions Banner */}
        <div className="rounded-2xl border-4 border-yellow-400/90 bg-green-800/90 p-4 shadow-xl text-yellow-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 font-black text-yellow-300 uppercase text-sm">
              <Sparkles className="h-4 w-4 text-yellow-400" />
              <span>CÁCH CHƠI RẤT ĐƠN GIẢN (2 BƯỚC):</span>
            </div>
            <p className="text-xs font-bold leading-relaxed text-green-100">
              <strong>Bước 1:</strong> Bấm chọn 1 trong 6 nhân vật bên dưới (hoặc nhấp đúp để vào game ngay). <br/>
              <strong>Bước 2:</strong> Nhấn nút vàng <span className="bg-yellow-400 text-green-950 px-2 py-0.5 rounded font-black text-[11px]">BẮT ĐẦU SĂN KHỦNG LONG NGAY</span> để quăng dây thu thập khủng long!
            </p>
          </div>
          <div className="flex items-center gap-2 bg-green-950/60 px-3.5 py-2 rounded-xl border border-white/20 text-xs font-bold text-yellow-300 whitespace-nowrap">
            🎮 <span>WASD / Mũi tên: Di chuyển</span> • <span>SPACE: Quăng Lasso</span>
          </div>
        </div>

        {/* Ranger Nickname & Suit Color Customizer Card */}
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border-4 border-white/30 bg-green-800/80 p-4 md:p-5 shadow-xl backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-2xl font-black text-xl text-slate-950 shadow-lg border-4 border-white"
              style={{ backgroundColor: selectedColor }}
            >
              P{playerSlot}
            </div>
            <div>
              <label className="text-xs font-black uppercase tracking-wider text-yellow-300">
                Tên Thợ Săn (Ranger Nickname)
              </label>
              <input
                id="player-nickname-input"
                type="text"
                maxLength={14}
                value={playerName}
                onChange={e => setPlayerName(e.target.value)}
                placeholder="Nhập tên của bạn..."
                className="mt-0.5 block w-52 rounded-xl border-4 border-white/60 bg-white px-3 py-1.5 text-base font-black text-green-950 focus:border-yellow-400 focus:outline-none shadow-inner"
              />
            </div>
          </div>

          {/* Quick Color Swatches */}
          <div className="flex items-center gap-2 bg-green-900/60 px-4 py-2 rounded-2xl border-2 border-white/20">
            <span className="text-xs text-yellow-200 font-black uppercase mr-1">Màu Trang Phục:</span>
            {['#f97316', '#06b6d4', '#10b981', '#ec4899', '#8b5cf6', '#eab308'].map(color => (
              <button
                key={color}
                onClick={() => setSelectedColor(color)}
                style={{ backgroundColor: color }}
                className={`h-8 w-8 rounded-full border-4 transition-all ${
                  selectedColor === color ? 'scale-125 border-white shadow-xl rotate-6' : 'border-transparent opacity-80 hover:opacity-100'
                }`}
              />
            ))}
          </div>
        </div>

        {/* 6 Avatar Cards Grid */}
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
                    {isSelected ? '★ Nhấn để chọn' : 'Bấm để chọn'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom Deploy & Action Buttons */}
        <div className="pt-2 pb-6 flex flex-wrap items-center justify-between gap-4">
          {onBack ? (
            <button
              id="back-to-menu-btn"
              onClick={onBack}
              className="rounded-2xl border-4 border-white/40 bg-green-800 px-6 py-3.5 text-sm font-black uppercase text-white hover:bg-green-700 shadow-lg"
            >
              Quay lại
            </button>
          ) : (
            <button
              id="test-roar-audio-btn"
              onClick={handleTestRoar}
              className="flex items-center gap-2 rounded-2xl border-4 border-yellow-500 bg-yellow-400 px-5 py-3.5 text-xs font-black uppercase text-yellow-950 hover:bg-yellow-300 shadow-xl"
            >
              <Volume2 className="h-4 w-4" />
              Thử Tiếng Gầm Khủng Long
            </button>
          )}

          <div className="flex flex-wrap items-center gap-3">
            {/* Enter Lobby Option */}
            <button
              id="enter-lobby-btn"
              onClick={handleEnterLobby}
              className="flex items-center gap-2 rounded-2xl border-4 border-white/60 bg-green-800 hover:bg-green-700 px-6 py-3.5 text-sm font-black text-white uppercase shadow-xl"
            >
              Sảnh Chờ (Lobby)
            </button>

            {/* Direct Play Action */}
            <button
              id="confirm-avatar-deploy-btn"
              onClick={handleQuickPlay}
              className="flex items-center gap-3 rounded-2xl border-4 border-white bg-yellow-400 hover:bg-yellow-300 px-8 md:px-10 py-3.5 text-lg md:text-xl font-black text-green-950 uppercase italic shadow-2xl transition-all hover:scale-105 active:scale-95"
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
