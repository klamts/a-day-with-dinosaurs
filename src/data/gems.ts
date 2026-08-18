import { GemDefinition, PowerUpType } from '../types/game';

export const GEM_CATALOG: GemDefinition[] = [
  {
    id: 'tidal_wave',
    name: 'Tidal Torrent',
    nameVi: 'Thủy Triều Cuộn Sóng',
    descriptionVi: 'Tạo luồng sóng nước rộng 3 ô, dài 10 ô quét từ sau ra trước nhân vật, cuốn phăng mọi đối thủ và khủng long theo dòng!',
    emoji: '🌊',
    color: '#0ea5e9',
    badgeBg: 'from-sky-500 to-blue-600',
    cooldownSeconds: 16,
    unlockScore: 20,
    tier: 2
  },
  {
    id: 'net_trap',
    name: 'Electro Net Trap',
    nameVi: 'Lưới Bẫy Điện',
    descriptionVi: 'Bắn lưới bẫy trói chặt đối thủ xung quanh trong 5s, đứt dây kéo và vô hiệu hóa họ!',
    emoji: '🕸️',
    color: '#8b5cf6',
    badgeBg: 'from-purple-500 to-indigo-600',
    cooldownSeconds: 14,
    unlockScore: 0,
    tier: 1
  },
  {
    id: 'titan_strength',
    name: 'Titan Might',
    nameVi: 'Sức Mạnh Titan',
    descriptionVi: 'Kích hoạt sức mạnh khổng lồ trong 5s: kéo khủng long siêu tốc, cướp giật dây đối thủ và kéo cả người chơi khác!',
    emoji: '💪',
    color: '#ef4444',
    badgeBg: 'from-rose-500 to-red-600',
    cooldownSeconds: 20,
    unlockScore: 30,
    tier: 3
  },
  {
    id: 'secret_tunnel',
    name: 'Secret Tunnel',
    nameVi: 'Đường Hầm Bí Mật',
    descriptionVi: 'Mở cổng xoáy bí mật tại chỗ về chuồng nhà trong 5s, kéo khủng long vào hầm để ghi điểm tức thì!',
    emoji: '🌀',
    color: '#a855f7',
    badgeBg: 'from-fuchsia-500 to-purple-600',
    cooldownSeconds: 22,
    unlockScore: 35,
    tier: 3
  },
  {
    id: 'dino_call',
    name: 'Dino Whisper',
    nameVi: 'Tiếng Gọi Khủng Long',
    descriptionVi: 'Phát sóng âm cổ đại trong 5s khiến tất cả khủng long hoang dã tự chạy về phía bạn!',
    emoji: '📢',
    color: '#10b981',
    badgeBg: 'from-emerald-500 to-teal-600',
    cooldownSeconds: 15,
    unlockScore: 10,
    tier: 1
  },
  {
    id: 'earth_fissure',
    name: 'Earth Fissure',
    nameVi: 'Rãnh Nứt Địa Tầng',
    descriptionVi: 'Tạo rãnh nứt nham thạch vách ngăn dài 14 ô trong 5s, chặn tuyệt đối mọi di chuyển và dây thòng lọng đi qua!',
    emoji: '🌋',
    color: '#f97316',
    badgeBg: 'from-amber-500 to-orange-600',
    cooldownSeconds: 15,
    unlockScore: 15,
    tier: 2
  },
  {
    id: 'stun_shockwave',
    name: 'Stun Shockwave',
    nameVi: 'Sóng Chấn Động',
    descriptionVi: 'Gầm vang sóng siêu thanh làm choáng váng tất cả đối thủ xung quanh trong 4s!',
    emoji: '💫',
    color: '#eab308',
    badgeBg: 'from-yellow-500 to-amber-600',
    cooldownSeconds: 16,
    unlockScore: 15,
    tier: 2
  },
  {
    id: 'tornado_gust',
    name: 'Tornado Gust',
    nameVi: 'Gió Lốc Cắt Dây',
    descriptionVi: 'Tạo bão lốc cắt đứt toàn bộ dây kéo của đối thủ và thổi bay họ ra xa!',
    emoji: '🌪️',
    color: '#06b6d4',
    badgeBg: 'from-cyan-500 to-teal-600',
    cooldownSeconds: 12,
    unlockScore: 0,
    tier: 1
  }
];

export const SPRINT_GEM: GemDefinition = {
  id: 'speed_boost',
  name: 'Universal Sprint',
  nameVi: 'Tăng Tốc Toàn Năng',
  descriptionVi: 'Tăng 2.2x tốc độ di chuyển trong 4s (Kỹ năng bẩm sinh chung cho mọi người chơi)',
  emoji: '⚡',
  color: '#38bdf8',
  badgeBg: 'from-sky-400 to-blue-500',
  cooldownSeconds: 8,
  unlockScore: 0,
  tier: 1
};
