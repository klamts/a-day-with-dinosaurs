import express from 'express';
import http from 'http';
import path from 'path';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';

interface DinosaurDef {
  id: string;
  name: string;
  points: number;
  baseSpeed: number;
  speedCategory: 'slow' | 'medium' | 'fast' | 'apex';
  roarType: string;
  scale: number;
  behavior: string;
}

const DINOSAURS_SERVER: DinosaurDef[] = [
  { id: 'brachiosaurus', name: 'Brachiosaurus', points: 2, baseSpeed: 1.0, speedCategory: 'slow', roarType: 'deep_bellow', scale: 1.4, behavior: 'graze' },
  { id: 'stegosaurus', name: 'Stegosaurus', points: 3, baseSpeed: 1.2, speedCategory: 'slow', roarType: 'spiked_rumble', scale: 1.1, behavior: 'wander' },
  { id: 'ankylosaurus', name: 'Ankylosaurus', points: 4, baseSpeed: 1.35, speedCategory: 'slow', roarType: 'heavy_plod', scale: 1.05, behavior: 'wander' },
  { id: 'triceratops', name: 'Triceratops', points: 5, baseSpeed: 1.8, speedCategory: 'medium', roarType: 'horn_trumpet', scale: 1.15, behavior: 'wander' },
  { id: 'parasaurolophus', name: 'Parasaurolophus', points: 6, baseSpeed: 2.2, speedCategory: 'medium', roarType: 'acoustic_crest', scale: 1.1, behavior: 'wander' },
  { id: 'gallimimus', name: 'Gallimimus', points: 8, baseSpeed: 2.9, speedCategory: 'medium', roarType: 'rapid_chirp', scale: 0.9, behavior: 'dash' },
  { id: 'velociraptor', name: 'Velociraptor', points: 10, baseSpeed: 3.6, speedCategory: 'fast', roarType: 'sharp_screech', scale: 0.85, behavior: 'evade' },
  { id: 'carnotaurus', name: 'Carnotaurus', points: 12, baseSpeed: 4.1, speedCategory: 'fast', roarType: 'horned_snarl', scale: 1.1, behavior: 'evade' },
  { id: 'pterodactyl', name: 'Pterodactyl / Quetzal', points: 15, baseSpeed: 4.6, speedCategory: 'fast', roarType: 'sky_pierce', scale: 0.95, behavior: 'swoop' },
  { id: 'spinosaurus', name: 'Spinosaurus', points: 18, baseSpeed: 4.8, speedCategory: 'apex', roarType: 'river_growl', scale: 1.3, behavior: 'pack_hunt' },
  { id: 'tyrannosaurus', name: 'Tyrannosaurus Rex (Boss)', points: 25, baseSpeed: 5.2, speedCategory: 'apex', roarType: 'apex_roar', scale: 1.45, behavior: 'boss_patrol' }
];

interface ServerDino {
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
  state: string;
  tetheredByPlayerId?: string | null;
  captureProgress: number;
  capturingPlayerIds: string[];
  health?: number;
  maxHealth?: number;
  animationTick: number;
  spawnTime: number;
}

type PowerUpType =
  | 'net_trap'
  | 'speed_boost'
  | 'titan_strength'
  | 'secret_tunnel'
  | 'dino_call'
  | 'earth_fissure'
  | 'stun_shockwave'
  | 'tornado_gust'
  | 'tidal_wave';

interface ServerTidalWave {
  id: string;
  ownerId: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  speed: number;
  width: number;
  length: number;
  life: number;
  maxLife: number;
}

/** Impassable Earth Fissure barrier collision resolver on server */
function resolveFissureBarrier(
  oldX: number,
  oldY: number,
  targetX: number,
  targetY: number,
  radius: number,
  fissures: ServerEarthFissure[]
): { x: number; y: number } {
  if (!fissures || fissures.length === 0) return { x: targetX, y: targetY };

  let currX = targetX;
  let currY = targetY;

  for (const fis of fissures) {
    const x1 = fis.x1;
    const y1 = fis.y1;
    const x2 = fis.x2;
    const y2 = fis.y2;
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lineLen2 = dx * dx + dy * dy;
    if (lineLen2 === 0) continue;

    // 1. Check if movement vector crosses the fissure line segment
    const ccw = (ax: number, ay: number, bx: number, by: number, cx: number, cy: number) => {
      return (cy - ay) * (bx - ax) > (by - ay) * (cx - ax);
    };
    const crosses = ccw(oldX, oldY, x1, y1, x2, y2) !== ccw(currX, currY, x1, y1, x2, y2) &&
                    ccw(oldX, oldY, currX, currY, x1, y1) !== ccw(oldX, oldY, currX, currY, x2, y2);
    if (crosses) {
      return { x: oldX, y: oldY };
    }

    // 2. Check distance from target position to the fissure segment
    let t = ((currX - x1) * dx + (currY - y1) * dy) / lineLen2;
    t = Math.max(0, Math.min(1, t));
    const projX = x1 + t * dx;
    const projY = y1 + t * dy;
    const dist = Math.hypot(currX - projX, currY - projY);
    const minRequiredDist = radius + 14; // Impassable barrier wall thickness

    if (dist < minRequiredDist) {
      if (dist < 0.001) {
        return { x: oldX, y: oldY };
      }
      const pushX = (currX - projX) / dist;
      const pushY = (currY - projY) / dist;
      currX = projX + pushX * minRequiredDist;
      currY = projY + pushY * minRequiredDist;
    }
  }

  return { x: currX, y: currY };
}

interface ServerPowerUp {
  id: string;
  type: PowerUpType;
  x: number;
  y: number;
  spawnTime: number;
  duration: number;
}

interface ServerEarthFissure {
  id: string;
  ownerId: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  duration: number;
}

interface ServerSecretTunnel {
  id: string;
  ownerId: string;
  x: number;
  y: number;
  homeX: number;
  homeY: number;
  duration: number;
}

interface ServerHomeBase {
  slotNumber: 1 | 2 | 3 | 4;
  x: number;
  y: number;
  radius: number;
  color: string;
  label: string;
}

interface ServerPlayer {
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
  lassoState: 'ready' | 'extending' | 'returning' | 'hooked' | 'tethering';
  lassoTargetDinoId: string | null;
  tetheredDinoId: string | null;
  tetheredPlayerId: string | null;
  speedMultiplier: number;
  boostCooldown: number;
  lureCount: number;
  isStunned: boolean;
  stunTimer: number;
  isNetTrapped: boolean;
  netTrapTimer: number;
  heldPowerUp: PowerUpType | null;
  equippedGems: [PowerUpType, PowerUpType];
  gemCooldowns: {
    gem1: number;
    gem2: number;
    sprint: number;
  };
  gemMaxCooldowns: {
    gem1: number;
    gem2: number;
    sprint: number;
  };
  activeBuffs: {
    speedTimer: number;
    titanStrengthTimer: number;
    dinoCallTimer: number;
  };
  isReady: boolean;
  isHost: boolean;
  slotNumber: 1 | 2 | 3 | 4;
  inputSource: string;
  ws?: WebSocket;
}

interface Room {
  roomId: string;
  mode: 'competitive' | 'cooperative' | 'time_attack' | 'boss_hunt';
  status: 'lobby' | 'countdown' | 'playing' | 'gameover';
  map: 'jurassic_jungle' | 'volcanic_valley' | 'crystal_river';
  timeRemaining: number;
  totalTime: number;
  coopTeamScore: number;
  coopTargetScore: number;
  coopComboMultiplier: number;
  comboTimer: number;
  dinos: ServerDino[];
  players: Record<string, ServerPlayer>;
  lures: Array<{ id: string; x: number; y: number; ownerId: string; duration: number; radius: number }>;
  activePowerUps: ServerPowerUp[];
  earthFissures: ServerEarthFissure[];
  secretTunnels: ServerSecretTunnel[];
  tidalWaves: ServerTidalWave[];
  homeBases: ServerHomeBase[];
  activeEvents: string[];
  recentCaptures: Array<{
    playerName: string;
    dinoName: string;
    points: number;
    timestamp: number;
    isFast: boolean;
  }>;
  countdownTimer?: number;
  tickInterval?: NodeJS.Timeout;
}

const rooms: Map<string, Room> = new Map();

const MAP_BOUNDS = { width: 1400, height: 900 };

function spawnDino(room: Room, specificDefId?: string, isRare: boolean = false): ServerDino {
  let def: DinosaurDef;
  if (specificDefId) {
    def = DINOSAURS_SERVER.find(d => d.id === specificDefId) || DINOSAURS_SERVER[0];
  } else {
    // Weighted random selection
    const rand = Math.random();
    if (rand < 0.38) {
      // Slow dinos (2-4 pts)
      const slow = DINOSAURS_SERVER.filter(d => d.speedCategory === 'slow');
      def = slow[Math.floor(Math.random() * slow.length)];
    } else if (rand < 0.72) {
      // Medium dinos (5-8 pts)
      const med = DINOSAURS_SERVER.filter(d => d.speedCategory === 'medium');
      def = med[Math.floor(Math.random() * med.length)];
    } else if (rand < 0.94) {
      // Fast dinos (10-15 pts)
      const fast = DINOSAURS_SERVER.filter(d => d.speedCategory === 'fast');
      def = fast[Math.floor(Math.random() * fast.length)];
    } else {
      // Apex/Boss dinos (18-25 pts)
      const apex = DINOSAURS_SERVER.filter(d => d.speedCategory === 'apex');
      def = apex[Math.floor(Math.random() * apex.length)];
    }
  }

  const edge = Math.floor(Math.random() * 4);
  let x = Math.random() * (MAP_BOUNDS.width - 200) + 100;
  let y = Math.random() * (MAP_BOUNDS.height - 200) + 100;

  if (edge === 0) x = 50;
  else if (edge === 1) x = MAP_BOUNDS.width - 50;
  else if (edge === 2) y = 50;
  else y = MAP_BOUNDS.height - 50;

  const targetX = Math.random() * (MAP_BOUNDS.width - 200) + 100;
  const targetY = Math.random() * (MAP_BOUNDS.height - 200) + 100;
  const angle = Math.atan2(targetY - y, targetX - x);

  const speed = def.baseSpeed * (isRare ? 1.25 : 1.0);
  const isBoss = def.speedCategory === 'apex';

  return {
    instanceId: `dino_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    defId: def.id,
    x,
    y,
    targetX,
    targetY,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    speed,
    points: def.points * (isRare ? 2 : 1),
    angle,
    size: 28 * def.scale,
    state: 'wandering',
    captureProgress: 0,
    capturingPlayerIds: [],
    health: isBoss ? 3 : 1,
    maxHealth: isBoss ? 3 : 1,
    animationTick: Math.random() * 100,
    spawnTime: Date.now()
  };
}

function broadcastRoom(room: Room, message: unknown) {
  const payload = JSON.stringify(message);
  Object.values(room.players).forEach(player => {
    if (player.ws && player.ws.readyState === WebSocket.OPEN) {
      player.ws.send(payload);
    }
  });
}

const GEM_INFO_SERVER: Record<PowerUpType, { cooldownTicks: number; unlockScore: number }> = {
  tidal_wave: { cooldownTicks: 16 * 30, unlockScore: 20 },
  net_trap: { cooldownTicks: 14 * 30, unlockScore: 0 },
  titan_strength: { cooldownTicks: 20 * 30, unlockScore: 30 },
  secret_tunnel: { cooldownTicks: 22 * 30, unlockScore: 35 },
  dino_call: { cooldownTicks: 15 * 30, unlockScore: 10 },
  earth_fissure: { cooldownTicks: 15 * 30, unlockScore: 15 },
  stun_shockwave: { cooldownTicks: 16 * 30, unlockScore: 15 },
  tornado_gust: { cooldownTicks: 12 * 30, unlockScore: 0 },
  speed_boost: { cooldownTicks: 8 * 30, unlockScore: 0 }
};

function getSanitizedRoomState(room: Room) {
  const sanitizedPlayers: Record<string, Omit<ServerPlayer, 'ws'>> = {};
  for (const [id, p] of Object.entries(room.players)) {
    const { ws, ...safePlayer } = p;
    sanitizedPlayers[id] = safePlayer;
  }
  return {
    roomId: room.roomId,
    mode: room.mode,
    status: room.status,
    map: room.map,
    timeRemaining: room.timeRemaining,
    totalTime: room.totalTime,
    coopTeamScore: room.coopTeamScore,
    coopTargetScore: room.coopTargetScore,
    coopComboMultiplier: room.coopComboMultiplier,
    comboTimer: room.comboTimer,
    dinos: room.dinos,
    players: sanitizedPlayers,
    lures: room.lures,
    activePowerUps: room.activePowerUps || [],
    earthFissures: room.earthFissures || [],
    secretTunnels: room.secretTunnels || [],
    tidalWaves: room.tidalWaves || [],
    homeBases: room.homeBases || [],
    activeEvents: room.activeEvents,
    recentCaptures: room.recentCaptures
  };
}

function spawnRandomPowerUp(room: Room) {
  const powerUpTypes: PowerUpType[] = [
    'net_trap',
    'speed_boost',
    'titan_strength',
    'secret_tunnel',
    'dino_call',
    'earth_fissure',
    'stun_shockwave',
    'tornado_gust'
  ];
  const type = powerUpTypes[Math.floor(Math.random() * powerUpTypes.length)];
  const x = Math.random() * (MAP_BOUNDS.width - 300) + 150;
  const y = Math.random() * (MAP_BOUNDS.height - 300) + 150;

  const powerUp: ServerPowerUp = {
    id: `pw_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    type,
    x,
    y,
    spawnTime: Date.now(),
    duration: 600 // 20 seconds on map if not collected
  };

  room.activePowerUps.push(powerUp);
  broadcastRoom(room, {
    type: 'POWERUP_SPAWNED',
    powerUp
  });
}

function startRoomGameLoop(room: Room) {
  if (room.tickInterval) clearInterval(room.tickInterval);

  // Initialize Home Bases at 4 corners for competitive matches
  room.homeBases = [
    { slotNumber: 1, x: 130, y: 130, radius: 95, color: '#f97316', label: 'P1 CORRAL' },
    { slotNumber: 2, x: 1270, y: 130, radius: 95, color: '#06b6d4', label: 'P2 CORRAL' },
    { slotNumber: 3, x: 130, y: 770, radius: 95, color: '#10b981', label: 'P3 CORRAL' },
    { slotNumber: 4, x: 1270, y: 770, radius: 95, color: '#ec4899', label: 'P4 CORRAL' }
  ];

  room.activePowerUps = [];
  room.earthFissures = [];
  room.secretTunnels = [];
  room.tidalWaves = [];

  // Spawn initial dinosaurs (10 to 14 dinosaurs across the map)
  room.dinos = [];
  for (let i = 0; i < 12; i++) {
    room.dinos.push(spawnDino(room));
  }

  // Reset player scores & positions
  const spawnPositions = [
    { x: 300, y: 300 },
    { x: 1100, y: 300 },
    { x: 300, y: 650 },
    { x: 1100, y: 650 }
  ];

  let slotIdx = 0;
  for (const p of Object.values(room.players)) {
    const pos = spawnPositions[slotIdx % spawnPositions.length];
    p.x = pos.x;
    p.y = pos.y;
    p.vx = 0;
    p.vy = 0;
    p.score = 0;
    p.capturedDinosCount = 0;
    p.fastDinosCount = 0;
    p.slowDinosCount = 0;
    p.isThrowingLasso = false;
    p.lassoState = 'ready';
    p.lassoLength = 0;
    p.lassoTargetDinoId = null;
    p.tetheredDinoId = null;
    p.tetheredPlayerId = null;
    p.speedMultiplier = 1.0;
    p.boostCooldown = 0;
    p.lureCount = 3;
    p.isStunned = false;
    p.stunTimer = 0;
    p.isNetTrapped = false;
    p.netTrapTimer = 0;
    p.heldPowerUp = null;
    p.equippedGems = p.equippedGems || (slotIdx === 0 ? ['tidal_wave', 'net_trap'] : ['earth_fissure', 'stun_shockwave']);
    p.gemCooldowns = { gem1: 0, gem2: 0, sprint: 0 };
    p.gemMaxCooldowns = {
      gem1: GEM_INFO_SERVER[p.equippedGems[0]]?.cooldownTicks || 450,
      gem2: GEM_INFO_SERVER[p.equippedGems[1]]?.cooldownTicks || 450,
      sprint: GEM_INFO_SERVER.speed_boost.cooldownTicks
    };
    p.activeBuffs = {
      speedTimer: 0,
      titanStrengthTimer: 0,
      dinoCallTimer: 0
    };
    slotIdx++;
  }

  room.status = 'playing';
  room.timeRemaining = room.totalTime;
  room.coopTeamScore = 0;
  room.coopComboMultiplier = 1;
  room.comboTimer = 0;
  room.recentCaptures = [];

  // Broadcast immediate status transition so all clients leave lobby immediately
  broadcastRoom(room, {
    type: 'ROOM_STATE',
    state: getSanitizedRoomState(room)
  });

  let tickCounter = 0;

  room.tickInterval = setInterval(() => {
    tickCounter++;

    // Timer countdown
    if (tickCounter % 30 === 0) {
      if (room.timeRemaining > 0) {
        room.timeRemaining--;
        if (room.timeRemaining === 0) {
          endRoomGame(room);
          return;
        }
      }
    }

    // Update Earth Fissures
    for (let i = room.earthFissures.length - 1; i >= 0; i--) {
      const ef = room.earthFissures[i];
      ef.duration--;
      if (ef.duration <= 0) {
        room.earthFissures.splice(i, 1);
      }
    }

    // Update Secret Tunnels
    for (let i = room.secretTunnels.length - 1; i >= 0; i--) {
      const st = room.secretTunnels[i];
      st.duration--;
      if (st.duration <= 0) {
        room.secretTunnels.splice(i, 1);
      }
    }

    // Update Tidal Waves (Single sweeping directional wave pushing all entities in path)
    for (let i = room.tidalWaves.length - 1; i >= 0; i--) {
      const w = room.tidalWaves[i];
      w.x += w.vx;
      w.y += w.vy;
      w.life--;

      const cosW = Math.cos(-w.angle);
      const sinW = Math.sin(-w.angle);
      const waveHalfLength = (w.length || 400) / 2; // 10 ô dài = 400px
      const waveHalfWidth = (w.width || 120) / 2; // 3 ô ngang = 120px

      // Push opponent players along wave flow
      for (const p of Object.values(room.players)) {
        if (p.id !== w.ownerId) {
          const dx = p.x - w.x;
          const dy = p.y - w.y;
          const localX = dx * cosW - dy * sinW;
          const localY = dx * sinW + dy * cosW;

          if (Math.abs(localX) <= (waveHalfLength + 25) && Math.abs(localY) <= (waveHalfWidth + 25)) {
            p.x += w.vx * 1.15;
            p.y += w.vy * 1.15;
            p.x = Math.max(40, Math.min(MAP_BOUNDS.width - 40, p.x));
            p.y = Math.max(40, Math.min(MAP_BOUNDS.height - 40, p.y));
            p.lassoState = 'ready';
            p.lassoLength = 0;
            p.isThrowingLasso = false;
            p.tetheredDinoId = null;
            p.tetheredPlayerId = null;
          }
        }
      }

      // Sweep all dinosaurs in tidal torrent path
      for (const dino of room.dinos) {
        const dx = dino.x - w.x;
        const dy = dino.y - w.y;
        const localX = dx * cosW - dy * sinW;
        const localY = dx * sinW + dy * cosW;

        if (Math.abs(localX) <= (waveHalfLength + dino.size) && Math.abs(localY) <= (waveHalfWidth + dino.size)) {
          dino.x += w.vx * 1.15;
          dino.y += w.vy * 1.15;
          dino.x = Math.max(40, Math.min(MAP_BOUNDS.width - 40, dino.x));
          dino.y = Math.max(40, Math.min(MAP_BOUNDS.height - 40, dino.y));
        }
      }

      if (w.life <= 0) {
        room.tidalWaves.splice(i, 1);
      }
    }

    // Update combo timer in Co-op
    if (room.comboTimer > 0) {
      room.comboTimer--;
      if (room.comboTimer === 0) {
        room.coopComboMultiplier = 1;
      }
    }

    // Maintain dinosaur count
    const targetDinoCount = room.mode === 'boss_hunt' ? 8 : 12;
    if (room.dinos.length < targetDinoCount && Math.random() < 0.05) {
      room.dinos.push(spawnDino(room));
    }

    // Update Lures
    for (let i = room.lures.length - 1; i >= 0; i--) {
      const lure = room.lures[i];
      lure.duration--;
      if (lure.duration <= 0) {
        room.lures.splice(i, 1);
      }
    }

    // Update Players
    for (const player of Object.values(room.players)) {
      // Stun handling
      if (player.isStunned) {
        player.stunTimer--;
        if (player.stunTimer <= 0) player.isStunned = false;
      }

      // Net trap handling
      if (player.isNetTrapped) {
        player.netTrapTimer--;
        if (player.netTrapTimer <= 0) player.isNetTrapped = false;
      }

      // Active Buffs Tick
      if (player.activeBuffs.speedTimer > 0) {
        player.activeBuffs.speedTimer--;
        player.speedMultiplier = 2.0;
        if (player.activeBuffs.speedTimer <= 0) player.speedMultiplier = 1.0;
      }

      if (player.activeBuffs.titanStrengthTimer > 0) {
        player.activeBuffs.titanStrengthTimer--;
      }

      if (player.activeBuffs.dinoCallTimer > 0) {
        player.activeBuffs.dinoCallTimer--;
      }

      // Movement with Impassable Fissure Barrier resolution
      if (!player.isStunned) {
        const baseSpeed = 4.8 * player.speedMultiplier;
        const targetX = Math.max(40, Math.min(MAP_BOUNDS.width - 40, player.x + player.vx * baseSpeed));
        const targetY = Math.max(40, Math.min(MAP_BOUNDS.height - 40, player.y + player.vy * baseSpeed));
        const pos = resolveFissureBarrier(player.x, player.y, targetX, targetY, 26, room.earthFissures);
        player.x = pos.x;
        player.y = pos.y;
      }

      // Cooldowns Tick for Player Gems
      if (player.gemCooldowns) {
        if (player.gemCooldowns.gem1 > 0) player.gemCooldowns.gem1--;
        if (player.gemCooldowns.gem2 > 0) player.gemCooldowns.gem2--;
        if (player.gemCooldowns.sprint > 0) player.gemCooldowns.sprint--;
      }

      if (player.boostCooldown > 0) player.boostCooldown--;

      // Power-up Item Pickup Collision
      if (!player.heldPowerUp) {
        for (let i = room.activePowerUps.length - 1; i >= 0; i--) {
          const pw = room.activePowerUps[i];
          const dist = Math.hypot(player.x - pw.x, player.y - pw.y);
          if (dist < 38) {
            player.heldPowerUp = pw.type;
            room.activePowerUps.splice(i, 1);
            broadcastRoom(room, {
              type: 'POWERUP_COLLECTED',
              playerId: player.id,
              powerUpType: pw.type
            });
            break;
          }
        }
      }

      // AI Bot skill usage & competitive dragging intelligence
      if (player.inputSource === 'bot' && !player.isStunned && !player.isNetTrapped) {
        if (player.heldPowerUp && Math.random() < 0.04) {
          usePlayerPowerUp(room, player);
        }

        // Bot uses equipped gems if ready
        if (player.gemCooldowns && Math.random() < 0.02) {
          if (player.gemCooldowns.sprint === 0 && Math.random() < 0.3) {
            usePlayerGemSlot(room, player, 'sprint');
          } else if (player.gemCooldowns.gem1 === 0 && Math.random() < 0.5) {
            usePlayerGemSlot(room, player, 1);
          } else if (player.gemCooldowns.gem2 === 0 && Math.random() < 0.5) {
            usePlayerGemSlot(room, player, 2);
          }
        }

        const myHome = room.homeBases.find(hb => hb.slotNumber === player.slotNumber);

        if (player.tetheredDinoId && myHome) {
          // AI Bot drags tethered dinosaur to its home corral!
          const angleToHome = Math.atan2(myHome.y - player.y, myHome.x - player.x);
          player.vx = Math.cos(angleToHome);
          player.vy = Math.sin(angleToHome);
          player.angle = angleToHome;
        } else if (room.dinos.length > 0 && player.lassoState === 'ready') {
          // Find nearest available dinosaur or power-up
          let nearestDino: ServerDino | null = null;
          let nearestDist = 9999;
          for (const d of room.dinos) {
            if (d.state !== 'tethered' || player.activeBuffs.titanStrengthTimer > 0) {
              const dist = Math.hypot(d.x - player.x, d.y - player.y);
              if (dist < nearestDist) {
                nearestDist = dist;
                nearestDino = d;
              }
            }
          }

          if (nearestDino) {
            const angle = Math.atan2(nearestDino.y - player.y, nearestDino.x - player.x);
            player.vx = Math.cos(angle);
            player.vy = Math.sin(angle);
            player.angle = angle;

            if (nearestDist < 150 && Math.random() < 0.1) {
              player.lassoState = 'extending';
              player.lassoAngle = angle;
              player.lassoLength = 0;
              player.isThrowingLasso = true;
            }
          }
        }
      }

      // Update Lasso Mechanics
      if (player.lassoState === 'extending') {
        player.lassoLength += 16;
        player.lassoX = player.x + Math.cos(player.lassoAngle) * player.lassoLength;
        player.lassoY = player.y + Math.sin(player.lassoAngle) * player.lassoLength;

        // Check if lasso path crosses any impassable Earth Fissure barrier
        let lassoBlocked = false;
        for (const fis of room.earthFissures) {
          const ccw = (ax: number, ay: number, bx: number, by: number, cx: number, cy: number) => {
            return (cy - ay) * (bx - ax) > (by - ay) * (cx - ax);
          };
          if (ccw(player.x, player.y, fis.x1, fis.y1, fis.x2, fis.y2) !== ccw(player.lassoX, player.lassoY, fis.x1, fis.y1, fis.x2, fis.y2) &&
              ccw(player.x, player.y, player.lassoX, player.lassoY, fis.x1, fis.y1) !== ccw(player.x, player.y, player.lassoX, player.lassoY, fis.x2, fis.y2)) {
            lassoBlocked = true;
            break;
          }
        }

        if (lassoBlocked) {
          player.lassoState = 'returning';
        } else {
          // Check collision with dinosaurs
          let hitDino: ServerDino | null = null;
          for (const dino of room.dinos) {
            const dx = dino.x - player.lassoX;
            const dy = dino.y - player.lassoY;
            const dist = Math.hypot(dx, dy);
            if (dist < dino.size + 16) {
              // If another player already tethered it, only Titan Strength can steal it
              if (dino.state === 'tethered' && dino.tetheredByPlayerId !== player.id) {
                if (player.activeBuffs.titanStrengthTimer > 0) {
                  // Break previous owner's tether
                  const prevOwner = room.players[dino.tetheredByPlayerId || ''];
                  if (prevOwner) {
                    prevOwner.tetheredDinoId = null;
                    prevOwner.lassoState = 'ready';
                  }
                  hitDino = dino;
                  break;
                }
              } else {
                hitDino = dino;
                break;
              }
            }
          }

          // Titan strength can also tether opponent players!
          let hitPlayer: ServerPlayer | null = null;
          if (player.activeBuffs.titanStrengthTimer > 0) {
            for (const opp of Object.values(room.players)) {
              if (opp.id !== player.id) {
                const dist = Math.hypot(opp.x - player.lassoX, opp.y - player.lassoY);
                if (dist < 32) {
                  hitPlayer = opp;
                  break;
                }
              }
            }
          }

          if (hitPlayer) {
            player.lassoState = 'tethering';
            player.tetheredPlayerId = hitPlayer.id;
            hitPlayer.isStunned = true;
            hitPlayer.stunTimer = 90;
          } else if (hitDino) {
            if (room.mode === 'competitive') {
              player.lassoState = 'tethering';
              player.tetheredDinoId = hitDino.instanceId;
              hitDino.state = 'tethered';
              hitDino.tetheredByPlayerId = player.id;
            } else {
              player.lassoState = 'hooked';
              player.lassoTargetDinoId = hitDino.instanceId;
              hitDino.state = 'being_captured';
              if (!hitDino.capturingPlayerIds.includes(player.id)) {
                hitDino.capturingPlayerIds.push(player.id);
              }
            }
          } else if (player.lassoLength >= player.lassoMaxLength) {
            player.lassoState = 'returning';
          }
        }
      } else if (player.lassoState === 'tethering') {
        // Dragging tethered dinosaur (or player)
        if (player.tetheredDinoId) {
          const targetDino = room.dinos.find(d => d.instanceId === player.tetheredDinoId);
          if (targetDino) {
            player.lassoX = targetDino.x;
            player.lassoY = targetDino.y;
            player.lassoLength = Math.hypot(targetDino.x - player.x, targetDino.y - player.y);

            // Drag physics: Dino follows player with tension
            const pullAngle = Math.atan2(player.y - targetDino.y, player.x - targetDino.x);
            const dist = Math.hypot(player.x - targetDino.x, player.y - targetDino.y);
            const pullSpeed = dist > 70 ? 5.5 : 2.0;
            const targetDinoX = targetDino.x + Math.cos(pullAngle) * pullSpeed;
            const targetDinoY = targetDino.y + Math.sin(pullAngle) * pullSpeed;
            const dinoPos = resolveFissureBarrier(targetDino.x, targetDino.y, targetDinoX, targetDinoY, targetDino.size, room.earthFissures);
            targetDino.x = Math.max(30, Math.min(MAP_BOUNDS.width - 30, dinoPos.x));
            targetDino.y = Math.max(30, Math.min(MAP_BOUNDS.height - 30, dinoPos.y));
            targetDino.angle = pullAngle;

            // Check if dinosaur reached player's Home Base Corral
            const myHome = room.homeBases.find(hb => hb.slotNumber === player.slotNumber);
            let capturedAtHome = false;

            if (myHome) {
              const distToHome = Math.hypot(targetDino.x - myHome.x, targetDino.y - myHome.y);
              if (distToHome < myHome.radius) {
                capturedAtHome = true;
              }
            }

            // Check if dinosaur entered player's Secret Tunnel
            const myTunnel = room.secretTunnels.find(st => st.ownerId === player.id);
            if (myTunnel) {
              const distToTunnel = Math.hypot(targetDino.x - myTunnel.x, targetDino.y - myTunnel.y);
              if (distToTunnel < 48) {
                capturedAtHome = true;
              }
            }

            if (capturedAtHome) {
              handleDinoCaptured(room, player, targetDino);
            }
          } else {
            player.lassoState = 'returning';
            player.tetheredDinoId = null;
          }
        } else if (player.tetheredPlayerId) {
          const opp = room.players[player.tetheredPlayerId];
          if (opp) {
            const pullAngle = Math.atan2(player.y - opp.y, player.x - opp.x);
            opp.x += Math.cos(pullAngle) * 5.0;
            opp.y += Math.sin(pullAngle) * 5.0;
            player.lassoX = opp.x;
            player.lassoY = opp.y;
            player.lassoLength = Math.hypot(opp.x - player.x, opp.y - player.y);
          } else {
            player.lassoState = 'returning';
            player.tetheredPlayerId = null;
          }
        }
      } else if (player.lassoState === 'hooked') {
        const targetDino = room.dinos.find(d => d.instanceId === player.lassoTargetDinoId);
        if (targetDino) {
          player.lassoX = targetDino.x;
          player.lassoY = targetDino.y;
          player.lassoLength = Math.hypot(targetDino.x - player.x, targetDino.y - player.y);

          // Reel in
          const pullSpeed = 7.0;
          const pullAngle = Math.atan2(player.y - targetDino.y, player.x - targetDino.x);
          const targetHookX = targetDino.x + Math.cos(pullAngle) * pullSpeed;
          const targetHookY = targetDino.y + Math.sin(pullAngle) * pullSpeed;
          const dinoPos = resolveFissureBarrier(targetDino.x, targetDino.y, targetHookX, targetHookY, targetDino.size, room.earthFissures);
          targetDino.x = Math.max(30, Math.min(MAP_BOUNDS.width - 30, dinoPos.x));
          targetDino.y = Math.max(30, Math.min(MAP_BOUNDS.height - 30, dinoPos.y));

          const distToPlayer = Math.hypot(player.x - targetDino.x, player.y - targetDino.y);
          if (distToPlayer < 45) {
            handleDinoCaptured(room, player, targetDino);
          }
        } else {
          player.lassoState = 'returning';
          player.lassoTargetDinoId = null;
        }
      } else if (player.lassoState === 'returning') {
        player.lassoLength -= 20;
        if (player.lassoLength <= 0) {
          player.lassoLength = 0;
          player.lassoState = 'ready';
          player.isThrowingLasso = false;
          player.lassoTargetDinoId = null;
          player.tetheredDinoId = null;
          player.tetheredPlayerId = null;
        } else {
          player.lassoX = player.x + Math.cos(player.lassoAngle) * player.lassoLength;
          player.lassoY = player.y + Math.sin(player.lassoAngle) * player.lassoLength;
        }
      }
    }

    // Update Dinosaurs AI
    for (let i = room.dinos.length - 1; i >= 0; i--) {
      const dino = room.dinos[i];
      dino.animationTick += 0.2;

      // If tethered, its movement is controlled by the player tether physics
      if (dino.state === 'tethered') {
        continue;
      }

      // Check Dino Call skill effect
      let callingPlayer: ServerPlayer | null = null;
      for (const p of Object.values(room.players)) {
        if (p.activeBuffs.dinoCallTimer > 0) {
          callingPlayer = p;
          break;
        }
      }

      // Check nearby lures
      let attractedLure = null;
      for (const lure of room.lures) {
        const dist = Math.hypot(lure.x - dino.x, lure.y - dino.y);
        if (dist < lure.radius) {
          attractedLure = lure;
          break;
        }
      }

      if (callingPlayer) {
        // Attracted by Dino Call skill
        const angle = Math.atan2(callingPlayer.y - dino.y, callingPlayer.x - dino.x);
        dino.vx = Math.cos(angle) * (dino.speed * 1.2);
        dino.vy = Math.sin(angle) * (dino.speed * 1.2);
        dino.angle = angle;
      } else if (attractedLure) {
        const angle = Math.atan2(attractedLure.y - dino.y, attractedLure.x - dino.x);
        dino.vx = Math.cos(angle) * (dino.speed * 0.8);
        dino.vy = Math.sin(angle) * (dino.speed * 0.8);
        dino.angle = angle;
      } else if (dino.state !== 'being_captured') {
        let nearestDist = 9999;
        let nearestPlayer: ServerPlayer | null = null;
        for (const p of Object.values(room.players)) {
          const dist = Math.hypot(p.x - dino.x, p.y - dino.y);
          if (dist < nearestDist) {
            nearestDist = dist;
            nearestPlayer = p;
          }
        }

        const def = DINOSAURS_SERVER.find(d => d.id === dino.defId);
        const isFast = def && (def.speedCategory === 'fast' || def.speedCategory === 'apex');

        if (isFast && nearestDist < 160 && nearestPlayer) {
          dino.state = 'fleeing';
          const evadeAngle = Math.atan2(dino.y - nearestPlayer.y, dino.x - nearestPlayer.x);
          dino.vx = Math.cos(evadeAngle) * (dino.speed * 1.3);
          dino.vy = Math.sin(evadeAngle) * (dino.speed * 1.3);
          dino.angle = evadeAngle;
        } else {
          dino.state = 'wandering';
          const distToTarget = Math.hypot(dino.targetX - dino.x, dino.targetY - dino.y);
          if (distToTarget < 30 || Math.random() < 0.015) {
            dino.targetX = Math.random() * (MAP_BOUNDS.width - 200) + 100;
            dino.targetY = Math.random() * (MAP_BOUNDS.height - 200) + 100;
          }
          const angle = Math.atan2(dino.targetY - dino.y, dino.targetX - dino.x);
          dino.vx = Math.cos(angle) * dino.speed;
          dino.vy = Math.sin(angle) * dino.speed;
          dino.angle = angle;
        }
      }

      const targetDinoX = dino.x + dino.vx;
      const targetDinoY = dino.y + dino.vy;
      const dinoPos = resolveFissureBarrier(dino.x, dino.y, targetDinoX, targetDinoY, dino.size, room.earthFissures);
      if (dinoPos.x === dino.x && dinoPos.y === dino.y) {
        dino.vx *= -1;
        dino.vy *= -1;
        dino.targetX = Math.random() * (MAP_BOUNDS.width - 200) + 100;
        dino.targetY = Math.random() * (MAP_BOUNDS.height - 200) + 100;
      } else {
        dino.x = dinoPos.x;
        dino.y = dinoPos.y;
      }

      if (dino.x < 30) { dino.x = 30; dino.vx *= -1; }
      if (dino.x > MAP_BOUNDS.width - 30) { dino.x = MAP_BOUNDS.width - 30; dino.vx *= -1; }
      if (dino.y < 30) { dino.y = 30; dino.vy *= -1; }
      if (dino.y > MAP_BOUNDS.height - 30) { dino.y = MAP_BOUNDS.height - 30; dino.vy *= -1; }
    }

    // Broadcast room state
    broadcastRoom(room, {
      type: 'ROOM_STATE',
      state: getSanitizedRoomState(room)
    });
  }, 1000 / 30);
}

function activateSkillEffect(room: Room, player: ServerPlayer, skillType: PowerUpType) {
  const myHome = room.homeBases.find(hb => hb.slotNumber === player.slotNumber);

  switch (skillType) {
    case 'tidal_wave': {
      const waveAngle = player.angle || 0;
      // Spawns from behind character (kéo từ sau ra trước nhân vật)
      const spawnBehindDist = 180;
      const waveX = player.x - Math.cos(waveAngle) * spawnBehindDist;
      const waveY = player.y - Math.sin(waveAngle) * spawnBehindDist;
      const speed = 12;
      const wave: ServerTidalWave = {
        id: `wave_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        ownerId: player.id,
        x: waveX,
        y: waveY,
        vx: Math.cos(waveAngle) * speed,
        vy: Math.sin(waveAngle) * speed,
        angle: waveAngle,
        speed,
        width: 120, // 3 ô ngang = 120px
        length: 400, // 10 ô dài = 400px
        life: 75,
        maxLife: 75
      };
      room.tidalWaves.push(wave);
      broadcastRoom(room, {
        type: 'TIDAL_WAVE_SPAWNED',
        wave
      });
      break;
    }
    case 'net_trap': {
      // Net trap closest opponent(s)
      Object.values(room.players).forEach(opp => {
        if (opp.id !== player.id) {
          const dist = Math.hypot(opp.x - player.x, opp.y - player.y);
          if (dist < 450) {
            opp.isNetTrapped = true;
            opp.netTrapTimer = 150; // 5 seconds
            opp.lassoState = 'ready';
            opp.lassoLength = 0;
            opp.isThrowingLasso = false;
            opp.tetheredDinoId = null;
          }
        }
      });
      break;
    }
    case 'speed_boost': {
      player.activeBuffs.speedTimer = 150; // 5s
      player.speedMultiplier = 2.2;
      break;
    }
    case 'titan_strength': {
      player.activeBuffs.titanStrengthTimer = 150; // 5s
      break;
    }
    case 'secret_tunnel': {
      room.secretTunnels.push({
        id: `tunnel_${Date.now()}`,
        ownerId: player.id,
        x: player.x,
        y: player.y,
        homeX: myHome ? myHome.x : 130,
        homeY: myHome ? myHome.y : 130,
        duration: 150 // 5s
      });
      break;
    }
    case 'dino_call': {
      player.activeBuffs.dinoCallTimer = 150; // 5s
      break;
    }
    case 'earth_fissure': {
      const angle = player.angle || 0;
      const perpAngle = angle + Math.PI / 2;
      const halfLength = 280; // 14 ô = 560px tổng chiều dài vách ngăn
      const cx = player.x + Math.cos(angle) * 45;
      const cy = player.y + Math.sin(angle) * 45;
      room.earthFissures.push({
        id: `fissure_${Date.now()}`,
        ownerId: player.id,
        x1: Math.max(30, Math.min(MAP_BOUNDS.width - 30, cx - Math.cos(perpAngle) * halfLength)),
        y1: Math.max(30, Math.min(MAP_BOUNDS.height - 30, cy - Math.sin(perpAngle) * halfLength)),
        x2: Math.max(30, Math.min(MAP_BOUNDS.width - 30, cx + Math.cos(perpAngle) * halfLength)),
        y2: Math.max(30, Math.min(MAP_BOUNDS.height - 30, cy + Math.sin(perpAngle) * halfLength)),
        duration: 150 // 5s
      });
      break;
    }
    case 'stun_shockwave': {
      Object.values(room.players).forEach(opp => {
        if (opp.id !== player.id) {
          const dist = Math.hypot(opp.x - player.x, opp.y - player.y);
          if (dist < 400) {
            opp.isStunned = true;
            opp.stunTimer = 150; // 5s
          }
        }
      });
      break;
    }
    case 'tornado_gust': {
      // Snaps all opponent ropes and pushes them back
      Object.values(room.players).forEach(opp => {
        if (opp.id !== player.id) {
          opp.lassoState = 'ready';
          opp.lassoLength = 0;
          opp.isThrowingLasso = false;
          opp.tetheredDinoId = null;
        }
      });
      break;
    }
  }

  broadcastRoom(room, {
    type: 'SKILL_ACTIVATED',
    playerId: player.id,
    skillType,
    x: player.x,
    y: player.y
  });
}

function usePlayerGemSlot(room: Room, player: ServerPlayer, gemSlot: 1 | 2 | 'sprint') {
  if (player.isStunned || player.isNetTrapped) return;

  if (gemSlot === 'sprint') {
    if (player.gemCooldowns.sprint > 0) return;
    activateSkillEffect(room, player, 'speed_boost');
    player.gemCooldowns.sprint = GEM_INFO_SERVER.speed_boost.cooldownTicks;
    player.gemMaxCooldowns.sprint = GEM_INFO_SERVER.speed_boost.cooldownTicks;
    return;
  }

  const slotIdx = gemSlot === 1 ? 0 : 1;
  const skillType = player.equippedGems?.[slotIdx] || (gemSlot === 1 ? 'net_trap' : 'tornado_gust');
  const gemInfo = GEM_INFO_SERVER[skillType] || { cooldownTicks: 450, unlockScore: 0 };

  const currentCd = gemSlot === 1 ? player.gemCooldowns.gem1 : player.gemCooldowns.gem2;
  if (currentCd > 0) return;

  if (player.score < gemInfo.unlockScore) return;

  activateSkillEffect(room, player, skillType);

  if (gemSlot === 1) {
    player.gemCooldowns.gem1 = gemInfo.cooldownTicks;
    player.gemMaxCooldowns.gem1 = gemInfo.cooldownTicks;
  } else {
    player.gemCooldowns.gem2 = gemInfo.cooldownTicks;
    player.gemMaxCooldowns.gem2 = gemInfo.cooldownTicks;
  }
}

function usePlayerPowerUp(room: Room, player: ServerPlayer) {
  if (!player.heldPowerUp) return;
  const powerUpType = player.heldPowerUp;
  player.heldPowerUp = null;
  activateSkillEffect(room, player, powerUpType);
}

function handleDinoCaptured(room: Room, player: ServerPlayer, dino: ServerDino) {
  const def = DINOSAURS_SERVER.find(d => d.id === dino.defId);
  const isFast = def && (def.speedCategory === 'fast' || def.speedCategory === 'apex');

  // If Boss dino, check multi-hit / health
  if (dino.health && dino.health > 1) {
    dino.health--;
    player.lassoState = 'returning';
    player.lassoTargetDinoId = null;
    broadcastRoom(room, {
      type: 'ROAR_EVENT',
      roarType: def?.roarType || 'apex_roar',
      x: dino.x,
      y: dino.y,
      dinoName: def?.name || 'Dinosaur'
    });
    return;
  }

  // Points calculation
  let pointsAwarded = dino.points;

  if (room.mode === 'cooperative') {
    // Multi-player co-op combo bonus!
    if (dino.capturingPlayerIds.length > 1) {
      room.coopComboMultiplier = Math.min(4, room.coopComboMultiplier + 1);
      pointsAwarded *= room.coopComboMultiplier;
      broadcastRoom(room, {
        type: 'COOP_COMBO',
        multiplier: room.coopComboMultiplier,
        message: `🤝 TEAM COMBO x${room.coopComboMultiplier}! Dual Lasso Capture!`
      });
    }
    room.coopTeamScore += pointsAwarded;
    room.comboTimer = 150; // 5 seconds
  }

  player.score += pointsAwarded;
  player.capturedDinosCount++;
  if (isFast) player.fastDinosCount++;
  else player.slowDinosCount++;

  // Reset player's lasso
  player.lassoState = 'ready';
  player.lassoLength = 0;
  player.isThrowingLasso = false;
  player.lassoTargetDinoId = null;

  // Remove dinosaur from field
  const dinoIndex = room.dinos.findIndex(d => d.instanceId === dino.instanceId);
  if (dinoIndex !== -1) {
    room.dinos.splice(dinoIndex, 1);
  }

  // Release other players who hooked the same dino
  Object.values(room.players).forEach(p => {
    if (p.lassoTargetDinoId === dino.instanceId) {
      p.lassoState = 'ready';
      p.lassoLength = 0;
      p.lassoTargetDinoId = null;
      p.isThrowingLasso = false;
    }
  });

  const captureRecord = {
    playerName: player.name,
    dinoName: def?.name || 'Dinosaur',
    points: pointsAwarded,
    timestamp: Date.now(),
    isFast: !!isFast
  };

  room.recentCaptures.unshift(captureRecord);
  if (room.recentCaptures.length > 10) room.recentCaptures.pop();

  broadcastRoom(room, {
    type: 'CAPTURE_SUCCESS',
    playerId: player.id,
    dinoName: def?.name || 'Dinosaur',
    points: pointsAwarded,
    x: dino.x,
    y: dino.y,
    isFast: !!isFast
  });

  broadcastRoom(room, {
    type: 'ROAR_EVENT',
    roarType: def?.roarType || 'default',
    x: dino.x,
    y: dino.y,
    dinoName: def?.name || 'Dinosaur'
  });
}

function endRoomGame(room: Room) {
  if (room.tickInterval) {
    clearInterval(room.tickInterval);
    room.tickInterval = undefined;
  }
  room.status = 'gameover';

  // Calculate MVP
  let highestScore = -1;
  let mvpId = '';
  Object.values(room.players).forEach(p => {
    if (p.score > highestScore) {
      highestScore = p.score;
      mvpId = p.id;
    }
  });

  broadcastRoom(room, {
    type: 'ROOM_STATE',
    state: getSanitizedRoomState(room)
  });
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;
  const server = http.createServer(app);

  app.use(express.json());

  // CORS support for API calls
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
      return;
    }
    next();
  });

  // API endpoints
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'A Day with Dinosaurs Multiplayer Server',
      activeRooms: rooms.size,
      uptime: process.uptime(),
      timestamp: Date.now()
    });
  });

  app.get('/api/dinosaurs', (req, res) => {
    res.json({ dinosaurs: DINOSAURS_SERVER });
  });

  app.get('/api/rooms', (req, res) => {
    const list = Array.from(rooms.values()).map(r => ({
      roomId: r.roomId,
      mode: r.mode,
      map: r.map,
      playerCount: Object.keys(r.players).length,
      maxPlayers: 4,
      status: r.status,
      hostName: Object.values(r.players).find(p => p.isHost)?.name || 'Ranger'
    }));
    res.json({ rooms: list });
  });

  // WebSocket Server with keep-alive ping/pong for Render proxy stability
  const wss = new WebSocketServer({ server });

  // 25-second keep-alive heartbeat to prevent Render / reverse-proxy idle drops
  const pingInterval = setInterval(() => {
    wss.clients.forEach((ws: any) => {
      if (ws.isAlive === false) {
        return ws.terminate();
      }
      ws.isAlive = false;
      ws.ping();
    });
  }, 25000);

  wss.on('close', () => {
    clearInterval(pingInterval);
  });

  wss.on('connection', (ws: any) => {
    ws.isAlive = true;
    ws.on('pong', () => {
      ws.isAlive = true;
    });

    let currentRoomId: string | null = null;
    let currentPlayerId: string | null = null;

    ws.on('message', (data: string) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'PING') {
          ws.send(JSON.stringify({ type: 'PONG', timestamp: Date.now() }));
          return;
        }

        if (msg.type === 'JOIN_ROOM') {
          const roomId = (msg.roomId || 'DINO-LAN').toUpperCase().trim();
          let room = rooms.get(roomId);
          if (!room) {
            room = {
              roomId,
              mode: 'competitive',
              status: 'lobby',
              map: 'jurassic_jungle',
              timeRemaining: 90,
              totalTime: 90,
              coopTeamScore: 0,
              coopTargetScore: 100,
              coopComboMultiplier: 1,
              comboTimer: 0,
              dinos: [],
              players: {},
              lures: [],
              activePowerUps: [],
              earthFissures: [],
              secretTunnels: [],
              tidalWaves: [],
              homeBases: [],
              activeEvents: [],
              recentCaptures: []
            };
            rooms.set(roomId, room);
          }

          const existingPlayers = Object.values(room.players);
          if (existingPlayers.length >= 4 && !room.players[msg.player?.id]) {
            ws.send(JSON.stringify({ type: 'ERROR', message: 'Room is full (max 4 players)!' }));
            return;
          }

          const slotNumber = ((existingPlayers.length % 4) + 1) as 1 | 2 | 3 | 4;
          const playerId = msg.player?.id || `p_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`;
          currentRoomId = roomId;
          currentPlayerId = playerId;

          const isHost = existingPlayers.length === 0;

          room.players[playerId] = {
            id: playerId,
            name: msg.player?.name || `Ranger ${slotNumber}`,
            avatarId: msg.player?.avatarId || 'leo',
            color: msg.player?.color || (slotNumber === 1 ? '#f97316' : slotNumber === 2 ? '#06b6d4' : slotNumber === 3 ? '#10b981' : '#ec4899'),
            x: 200 + slotNumber * 180,
            y: 350,
            vx: 0,
            vy: 0,
            angle: 0,
            score: 0,
            capturedDinosCount: 0,
            fastDinosCount: 0,
            slowDinosCount: 0,
            isThrowingLasso: false,
            lassoX: 200 + slotNumber * 180,
            lassoY: 350,
            lassoLength: 0,
            lassoMaxLength: 170,
            lassoAngle: 0,
            lassoState: 'ready',
            lassoTargetDinoId: null,
            tetheredDinoId: null,
            tetheredPlayerId: null,
            speedMultiplier: 1.0,
            boostCooldown: 0,
            lureCount: 3,
            isStunned: false,
            stunTimer: 0,
            isNetTrapped: false,
            netTrapTimer: 0,
            heldPowerUp: null,
            equippedGems: ['tidal_wave', 'net_trap'],
            gemCooldowns: { gem1: 0, gem2: 0, sprint: 0 },
            gemMaxCooldowns: {
              gem1: GEM_INFO_SERVER.tidal_wave.cooldownTicks,
              gem2: GEM_INFO_SERVER.net_trap.cooldownTicks,
              sprint: GEM_INFO_SERVER.speed_boost.cooldownTicks
            },
            activeBuffs: {
              speedTimer: 0,
              titanStrengthTimer: 0,
              dinoCallTimer: 0
            },
            isReady: isHost,
            isHost,
            slotNumber,
            inputSource: 'remote_ws',
            ws
          };

          broadcastRoom(room, {
            type: 'ROOM_STATE',
            state: getSanitizedRoomState(room)
          });
        }

        if (!currentRoomId || !currentPlayerId) return;
        const room = rooms.get(currentRoomId);
        if (!room) return;
        const player = room.players[currentPlayerId];
        if (!player) return;

        if (msg.type === 'SELECT_GEMS') {
          if (msg.slot1 && msg.slot2) {
            player.equippedGems = [msg.slot1, msg.slot2];
            player.gemMaxCooldowns.gem1 = GEM_INFO_SERVER[msg.slot1]?.cooldownTicks || 450;
            player.gemMaxCooldowns.gem2 = GEM_INFO_SERVER[msg.slot2]?.cooldownTicks || 450;
            broadcastRoom(room, { type: 'ROOM_STATE', state: getSanitizedRoomState(room) });
          }
        } else if (msg.type === 'USE_GEM' && room.status === 'playing') {
          usePlayerGemSlot(room, player, msg.gemSlot);
        } else if (msg.type === 'SET_READY') {
          player.isReady = !!msg.isReady;
          broadcastRoom(room, { type: 'ROOM_STATE', state: getSanitizedRoomState(room) });
        } else if (msg.type === 'UPDATE_ROOM_CONFIG' && player.isHost) {
          if (msg.mode) room.mode = msg.mode;
          if (msg.map) room.map = msg.map;
          broadcastRoom(room, { type: 'ROOM_STATE', state: getSanitizedRoomState(room) });
        } else if (msg.type === 'ADD_BOT' && player.isHost) {
          const currentCount = Object.keys(room.players).length;
          if (currentCount < 4) {
            const botSlot = (currentCount + 1) as 1 | 2 | 3 | 4;
            const botId = `bot_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`;
            const botAvatars = ['leo', 'maya', 'jax', 'zara', 'kai', 'nyx'];
            const botColors = ['#f97316', '#06b6d4', '#10b981', '#ec4899'];
            room.players[botId] = {
              id: botId,
              name: `AI Ranger ${botSlot}`,
              avatarId: botAvatars[botSlot % botAvatars.length],
              color: botColors[(botSlot - 1) % botColors.length],
              x: 200 + botSlot * 180,
              y: 350,
              vx: 0,
              vy: 0,
              angle: 0,
              score: 0,
              capturedDinosCount: 0,
              fastDinosCount: 0,
              slowDinosCount: 0,
              isThrowingLasso: false,
              lassoX: 200 + botSlot * 180,
              lassoY: 350,
              lassoLength: 0,
              lassoMaxLength: 170,
              lassoAngle: 0,
              lassoState: 'ready',
              lassoTargetDinoId: null,
              tetheredDinoId: null,
              tetheredPlayerId: null,
              speedMultiplier: 1.0,
              boostCooldown: 0,
              lureCount: 3,
              isStunned: false,
              stunTimer: 0,
              isNetTrapped: false,
              netTrapTimer: 0,
              heldPowerUp: null,
              equippedGems: botSlot === 2 ? ['earth_fissure', 'stun_shockwave'] : botSlot === 3 ? ['tornado_gust', 'dino_call'] : ['tidal_wave', 'net_trap'],
              gemCooldowns: { gem1: 0, gem2: 0, sprint: 0 },
              gemMaxCooldowns: {
                gem1: 450,
                gem2: 450,
                sprint: 240
              },
              activeBuffs: {
                speedTimer: 0,
                titanStrengthTimer: 0,
                dinoCallTimer: 0
              },
              isReady: true,
              isHost: false,
              slotNumber: botSlot,
              inputSource: 'bot'
            };
            broadcastRoom(room, { type: 'ROOM_STATE', state: getSanitizedRoomState(room) });
          }
        } else if (msg.type === 'REMOVE_BOT' && player.isHost) {
          if (msg.botId && room.players[msg.botId]) {
            delete room.players[msg.botId];
            broadcastRoom(room, { type: 'ROOM_STATE', state: getSanitizedRoomState(room) });
          }
        } else if (msg.type === 'START_GAME') {
          // In online room, start game smoothly
          if (msg.mode) room.mode = msg.mode;
          if (msg.map) room.map = msg.map;
          if (msg.duration) {
            room.totalTime = msg.duration;
            room.timeRemaining = msg.duration;
          }
          startRoomGameLoop(room);
        } else if (msg.type === 'UPDATE_PLAYER') {
          if (msg.name) player.name = msg.name.trim().substring(0, 18);
          if (msg.avatarId) player.avatarId = msg.avatarId;
          if (msg.color) player.color = msg.color;
          broadcastRoom(room, { type: 'ROOM_STATE', state: getSanitizedRoomState(room) });
        } else if (msg.type === 'PLAYER_INPUT' && room.status === 'playing') {
          player.vx = msg.vx || 0;
          player.vy = msg.vy || 0;
          player.angle = msg.angle || 0;
          if (msg.isBoosting && player.boostCooldown === 0) {
            player.speedMultiplier = 1.6;
            player.boostCooldown = 120; // 4 seconds cooldown
            setTimeout(() => {
              player.speedMultiplier = 1.0;
            }, 1200);
          }
        } else if (msg.type === 'THROW_LASSO' && room.status === 'playing') {
          if (player.lassoState === 'ready' && !player.isStunned && !player.isNetTrapped) {
            player.lassoState = 'extending';
            player.lassoAngle = msg.angle !== undefined ? msg.angle : player.angle;
            player.lassoLength = 0;
            player.lassoX = player.x;
            player.lassoY = player.y;
            player.isThrowingLasso = true;
          }
        } else if (msg.type === 'USE_POWERUP' && room.status === 'playing') {
          usePlayerPowerUp(room, player);
        } else if (msg.type === 'DROP_LURE' && room.status === 'playing') {
          if (player.lureCount > 0) {
            player.lureCount--;
            room.lures.push({
              id: `lure_${Date.now()}`,
              x: player.x,
              y: player.y,
              ownerId: player.id,
              duration: 200, // ~6.6 seconds
              radius: 190
            });
          }
        } else if (msg.type === 'ROAR_EMOTE') {
          broadcastRoom(room, {
            type: 'ROAR_EVENT',
            roarType: msg.emoteId || 'sharp_screech',
            x: player.x,
            y: player.y,
            dinoName: player.name
          });
        } else if (msg.type === 'RESTART_GAME' && player.isHost) {
          startRoomGameLoop(room);
        }
      } catch (err) {
        console.error('WS Error:', err);
      }
    });

    ws.on('close', () => {
      if (currentRoomId && currentPlayerId) {
        const room = rooms.get(currentRoomId);
        if (room) {
          delete room.players[currentPlayerId];
          const remaining = Object.values(room.players);
          if (remaining.length === 0) {
            if (room.tickInterval) clearInterval(room.tickInterval);
            rooms.delete(currentRoomId);
          } else {
            if (!remaining.some(p => p.isHost)) {
              remaining[0].isHost = true;
            }
            broadcastRoom(room, { type: 'ROOM_STATE', state: getSanitizedRoomState(room) });
          }
        }
      }
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`🦕 "A Day with Dinosaurs" Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
