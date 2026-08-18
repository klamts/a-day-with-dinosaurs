export type GameMode = 'competitive' | 'cooperative' | 'time_attack' | 'boss_hunt';

export type GameStatus = 'menu' | 'avatar_select' | 'lobby' | 'countdown' | 'playing' | 'gameover';

export type MapType = 'jurassic_jungle' | 'volcanic_valley' | 'crystal_river';

export interface DinosaurDefinition {
  id: string;
  name: string;
  scientificName: string;
  phonetic?: string; // e.g. "ty-RAN-oh-SAWR-us REKS"
  nameMeaning?: string; // e.g. "King of the Tyrant Lizards"
  points: number; // 2 for slow, up to 25 for apex/boss
  baseSpeed: number; // 1.0 (slow) to 5.5 (ultra fast)
  speedCategory: 'slow' | 'medium' | 'fast' | 'apex';
  diet: 'Herbivore' | 'Carnivore' | 'Omnivore' | 'Piscivore';
  dietEmoji?: string; // "🌿", "🥩", "🍓", "🐟"
  period: string;
  sizeMeters: number;
  lengthMeters?: number;
  weightTons: number;
  fact: string;
  funFact?: string;
  kidFact?: string;
  vocabTags?: string[];
  roarType: 'deep_bellow' | 'spiked_rumble' | 'heavy_plod' | 'horn_trumpet' | 'acoustic_crest' | 'rapid_chirp' | 'sharp_screech' | 'horned_snarl' | 'sky_pierce' | 'river_growl' | 'apex_roar';
  roarDescription?: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  scale: number;
  behavior: 'wander' | 'graze' | 'evade' | 'dash' | 'swoop' | 'pack_hunt' | 'boss_patrol';
}

export interface ActiveDinosaur {
  instanceId: string;
  defId: string;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  vx: number;
  vy: number;
  speed: number;
  points: number;
  angle: number;
  size: number;
  state: 'wandering' | 'fleeing' | 'charging' | 'stunned' | 'being_captured';
  fleeTargetPlayerId?: string;
  isRareGolden?: boolean;
  captureProgress: number; // 0 to 100
  capturingPlayerIds: string[];
  health?: number; // for boss dinos (e.g. 3 lasso hits needed)
  maxHealth?: number;
  animationTick: number;
  spawnTime: number;
}

export interface AvatarOption {
  id: string;
  name: string;
  callsign: string;
  quote: string;
  age: number;
  specialty: string;
  primaryColor: string;
  secondaryColor: string;
  gear: string;
  badge: string;
  hairStyle: 'messy' | 'spiky' | 'braids' | 'cap' | 'ponytail' | 'visor';
  skinTone: string;
}

export interface Player {
  id: string;
  name: string;
  avatarId: string;
  color: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  score: number;
  capturedDinosCount: number;
  fastDinosCount: number;
  slowDinosCount: number;
  isThrowingLasso: boolean;
  lassoX: number;
  lassoY: number;
  lassoLength: number;
  lassoMaxLength: number;
  lassoAngle: number;
  lassoState: 'ready' | 'extending' | 'returning' | 'hooked';
  lassoTargetDinoId: string | null;
  speedMultiplier: number;
  boostCooldown: number;
  lureCount: number;
  isStunned: boolean;
  stunTimer: number;
  isReady: boolean;
  isHost: boolean;
  isBot?: boolean;
  slotNumber: 1 | 2 | 3 | 4;
  inputSource: 'local_p1' | 'local_p2' | 'local_p3' | 'local_p4' | 'remote_ws' | 'bot';
  lastPing?: number;
}

export interface DinoLure {
  id: string;
  x: number;
  y: number;
  ownerId: string;
  duration: number; // ticks
  radius: number;
}

export interface CaptureParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  alpha: number;
  life: number;
  text?: string;
}

export interface GameRoomState {
  roomId: string;
  mode: GameMode;
  status: GameStatus;
  map: MapType;
  timeRemaining: number; // in seconds
  totalTime: number;
  coopTeamScore: number;
  coopTargetScore: number;
  coopComboMultiplier: number;
  comboTimer: number;
  dinos: ActiveDinosaur[];
  players: Record<string, Player>;
  lures: DinoLure[];
  activeEvents: string[];
  recentCaptures: {
    playerName: string;
    dinoName: string;
    points: number;
    timestamp: number;
    isFast: boolean;
  }[];
  winnerId?: string;
  gameSummary?: {
    mvpPlayerId: string;
    totalCaught: number;
    highestSpeedCaught: string;
    coopRank: 'Dino Novice' | 'Ranger Specialist' | 'Jurassic Legend' | 'Apex Master';
  };
}

export type WSClientMessage =
  | { type: 'JOIN_ROOM'; roomId: string; player: Partial<Player> }
  | { type: 'LEAVE_ROOM' }
  | { type: 'SET_READY'; isReady: boolean }
  | { type: 'START_GAME'; mode: GameMode; map: MapType; duration: number }
  | { type: 'PLAYER_INPUT'; vx: number; vy: number; angle: number; isBoosting: boolean }
  | { type: 'THROW_LASSO'; angle: number }
  | { type: 'DROP_LURE' }
  | { type: 'ROAR_EMOTE'; emoteId: string }
  | { type: 'RESTART_GAME' };

export type WSServerMessage =
  | { type: 'ROOM_STATE'; state: GameRoomState }
  | { type: 'CAPTURE_SUCCESS'; playerId: string; dinoName: string; points: number; x: number; y: number; isFast: boolean }
  | { type: 'COOP_COMBO'; multiplier: number; message: string }
  | { type: 'STAMPEDE_ALERT'; dinoCount: number; message: string }
  | { type: 'ROAR_EVENT'; roarType: string; x: number; y: number; dinoName: string }
  | { type: 'ERROR'; message: string };
