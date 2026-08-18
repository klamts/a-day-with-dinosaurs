import React, { useState } from 'react';
import { GEM_CATALOG, SPRINT_GEM } from '../data/gems';
import { GemDefinition, PowerUpType } from '../types/game';
import { Sparkles, Zap, Shield, Waves, Flame, Eye, Lock, CheckCircle2 } from 'lucide-react';

interface GemSelectionPanelProps {
  equippedGems: [PowerUpType, PowerUpType];
  onSelectGems: (slot1: PowerUpType, slot2: PowerUpType) => void;
  playerScore?: number;
  readOnly?: boolean;
}

export const GemSelectionPanel: React.FC<GemSelectionPanelProps> = ({
  equippedGems,
  onSelectGems,
  playerScore = 0,
  readOnly = false
}) => {
  const [activeSlot, setActiveSlot] = useState<1 | 2>(1);
  const [hoveredGem, setHoveredGem] = useState<GemDefinition | null>(null);

  const gem1Def = GEM_CATALOG.find((g) => g.id === equippedGems[0]) || GEM_CATALOG[0];
  const gem2Def = GEM_CATALOG.find((g) => g.id === equippedGems[1]) || GEM_CATALOG[1];

  const handlePickGem = (gemId: PowerUpType) => {
    if (readOnly) return;
    if (activeSlot === 1) {
      // If same gem already in slot 2, swap or replace
      if (equippedGems[1] === gemId) {
        onSelectGems(gemId, equippedGems[0]);
      } else {
        onSelectGems(gemId, equippedGems[1]);
      }
      setActiveSlot(2);
    } else {
      if (equippedGems[0] === gemId) {
        onSelectGems(equippedGems[1], gemId);
      } else {
        onSelectGems(equippedGems[0], gemId);
      }
      setActiveSlot(1);
    }
  };

  const previewGem = hoveredGem || (activeSlot === 1 ? gem1Def : gem2Def);

  return (
    <div id="gem-selection-panel" className="w-full rounded-2xl border-2 border-amber-400/40 bg-slate-900/90 p-4 text-white shadow-2xl backdrop-blur-md">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">💎</span>
          <div>
            <h3 className="text-sm font-black uppercase tracking-wider text-amber-300">
              Trang Bị Gem Kỹ Năng (2 Slot Tuỳ Chọn + 1 Gem Tốc Độ)
            </h3>
            <p className="text-xs text-slate-400">
              Chọn 2 Gem kỹ năng chiến đấu. Gem cần thu hoạch đủ điểm và có thời gian hồi phục (Cooldown).
            </p>
          </div>
        </div>
        <div className="rounded-lg bg-amber-500/20 px-2.5 py-1 text-xs font-black text-amber-300 border border-amber-400/40">
          🎮 Phím: Q (Slot 1) • E (Slot 2) • Shift (Tăng Tốc)
        </div>
      </div>

      {/* 3 Active Equipped Slots Display */}
      <div className="mb-4 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        {/* Slot 1 */}
        <button
          type="button"
          onClick={() => !readOnly && setActiveSlot(1)}
          className={`flex items-center gap-3 rounded-xl border-2 p-3 text-left transition-all ${
            activeSlot === 1 && !readOnly
              ? 'border-amber-400 bg-amber-950/40 ring-2 ring-amber-400/50 shadow-lg'
              : 'border-slate-700 bg-slate-800/80 hover:border-slate-500'
          }`}
        >
          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${gem1Def.badgeBg} text-2xl shadow-md`}>
            {gem1Def.emoji}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-400">SLOT 1 (Phím Q)</span>
              <span className="rounded bg-slate-700/80 px-1.5 py-0.5 text-[9px] font-bold text-slate-300">
                ⏳ {gem1Def.cooldownSeconds}s
              </span>
            </div>
            <div className="truncate text-xs font-bold text-white">{gem1Def.nameVi}</div>
            <div className="text-[10px] text-amber-200">
              {gem1Def.unlockScore === 0 ? '✨ Mở khóa ngay (0đ)' : `🎯 Cần ${gem1Def.unlockScore}đ để mở`}
            </div>
          </div>
        </button>

        {/* Slot 2 */}
        <button
          type="button"
          onClick={() => !readOnly && setActiveSlot(2)}
          className={`flex items-center gap-3 rounded-xl border-2 p-3 text-left transition-all ${
            activeSlot === 2 && !readOnly
              ? 'border-amber-400 bg-amber-950/40 ring-2 ring-amber-400/50 shadow-lg'
              : 'border-slate-700 bg-slate-800/80 hover:border-slate-500'
          }`}
        >
          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${gem2Def.badgeBg} text-2xl shadow-md`}>
            {gem2Def.emoji}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-400">SLOT 2 (Phím E)</span>
              <span className="rounded bg-slate-700/80 px-1.5 py-0.5 text-[9px] font-bold text-slate-300">
                ⏳ {gem2Def.cooldownSeconds}s
              </span>
            </div>
            <div className="truncate text-xs font-bold text-white">{gem2Def.nameVi}</div>
            <div className="text-[10px] text-amber-200">
              {gem2Def.unlockScore === 0 ? '✨ Mở khóa ngay (0đ)' : `🎯 Cần ${gem2Def.unlockScore}đ để mở`}
            </div>
          </div>
        </button>

        {/* Universal Speed Sprint Gem (Slot 3 - Shared) */}
        <div className="flex items-center gap-3 rounded-xl border-2 border-sky-500/40 bg-sky-950/30 p-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-sky-400 to-blue-600 text-2xl shadow-md">
            ⚡
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-sky-400">GEM TỐC ĐỘ CHUNG (Shift)</span>
              <span className="rounded bg-sky-900/60 px-1.5 py-0.5 text-[9px] font-bold text-sky-200">
                ⏳ 8s
              </span>
            </div>
            <div className="truncate text-xs font-bold text-white">Chạy Nhanh Toàn Năng</div>
            <div className="text-[10px] text-sky-300">Tất cả người chơi đều có</div>
          </div>
        </div>
      </div>

      {/* Gem Catalog Grid */}
      {!readOnly && (
        <>
          <div className="mb-2 text-xs font-bold text-slate-300">
            Chọn Gem để gán vào <span className="text-amber-400 font-black">Slot {activeSlot}</span>:
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {GEM_CATALOG.map((gem) => {
              const isSlot1 = equippedGems[0] === gem.id;
              const isSlot2 = equippedGems[1] === gem.id;
              const isEquipped = isSlot1 || isSlot2;

              return (
                <button
                  key={gem.id}
                  type="button"
                  onClick={() => handlePickGem(gem.id)}
                  onMouseEnter={() => setHoveredGem(gem)}
                  onMouseLeave={() => setHoveredGem(null)}
                  className={`relative flex flex-col rounded-xl border p-2.5 text-left transition-all ${
                    isEquipped
                      ? 'border-amber-400 bg-amber-950/30'
                      : 'border-slate-700 bg-slate-800/60 hover:border-slate-500 hover:bg-slate-800'
                  }`}
                >
                  {isEquipped && (
                    <span className="absolute top-1.5 right-1.5 rounded-full bg-amber-500 px-1.5 py-0.2 text-[9px] font-black text-slate-950">
                      {isSlot1 ? 'SLOT 1' : 'SLOT 2'}
                    </span>
                  )}
                  <div className="mb-1 flex items-center gap-2">
                    <span className="text-2xl">{gem.emoji}</span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-xs font-bold text-white">{gem.nameVi}</div>
                      <div className="text-[10px] text-slate-400">{gem.name}</div>
                    </div>
                  </div>

                  <div className="mt-1 flex items-center justify-between text-[10px] text-slate-300 border-t border-slate-700/60 pt-1">
                    <span className="font-semibold text-amber-300">
                      {gem.unlockScore === 0 ? 'Mở: 0đ' : `Mở: ${gem.unlockScore}đ`}
                    </span>
                    <span className="font-semibold text-sky-300">Hồi: {gem.cooldownSeconds}s</span>
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}

      {/* Selected Gem Details Preview Box */}
      {previewGem && (
        <div className="mt-3 rounded-xl border border-slate-700 bg-slate-950/70 p-3 text-xs">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">{previewGem.emoji}</span>
            <span className="font-black text-amber-300 text-sm">{previewGem.nameVi} ({previewGem.name})</span>
            <span className="ml-auto rounded bg-slate-800 px-2 py-0.5 font-bold text-[10px] text-slate-300">
              Thời gian hồi: {previewGem.cooldownSeconds} giây • Điểm mở khóa: {previewGem.unlockScore} điểm
            </span>
          </div>
          <p className="text-slate-300 leading-relaxed">{previewGem.descriptionVi}</p>
        </div>
      )}
    </div>
  );
};
