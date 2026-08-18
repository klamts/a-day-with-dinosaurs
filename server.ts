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
  captureProgress: number;
  capturingPlayerIds: string[];
  health?: number;
  maxHealth?: number;
  animationTick: number;
  spawnTime: number;
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
  lassoState: 'ready' | 'extending' | 'returning' | 'hooked';
  lassoTargetDinoId: string | null;
  speedMultiplier: number;
  boostCooldown: number;
  lureCount: number;
  isStunned: boolean;
  stunTimer: number;
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
    activeEvents: room.activeEvents,
    recentCaptures: room.recentCaptures
  };
}

function startRoomGameLoop(room: Room) {
  if (room.tickInterval) clearInterval(room.tickInterval);

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
    p.speedMultiplier = 1.0;
    p.boostCooldown = 0;
    p.lureCount = 3;
    p.isStunned = false;
    slotIdx++;
  }

  room.status = 'playing';
  room.timeRemaining = room.totalTime;
  room.coopTeamScore = 0;
  room.coopComboMultiplier = 1;
  room.comboTimer = 0;
  room.recentCaptures = [];

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
      if (player.isStunned) {
        player.stunTimer--;
        if (player.stunTimer <= 0) player.isStunned = false;
      } else {
        const baseSpeed = 4.8 * player.speedMultiplier;
        player.x += player.vx * baseSpeed;
        player.y += player.vy * baseSpeed;

        // Boundaries clamp
        player.x = Math.max(40, Math.min(MAP_BOUNDS.width - 40, player.x));
        player.y = Math.max(40, Math.min(MAP_BOUNDS.height - 40, player.y));
      }

      if (player.boostCooldown > 0) player.boostCooldown--;

      // Update Lasso Mechanics
      if (player.lassoState === 'extending') {
        player.lassoLength += 16;
        player.lassoX = player.x + Math.cos(player.lassoAngle) * player.lassoLength;
        player.lassoY = player.y + Math.sin(player.lassoAngle) * player.lassoLength;

        // Check collision with dinosaurs
        let hitDino: ServerDino | null = null;
        for (const dino of room.dinos) {
          const dx = dino.x - player.lassoX;
          const dy = dino.y - player.lassoY;
          const dist = Math.hypot(dx, dy);
          if (dist < dino.size + 15) {
            hitDino = dino;
            break;
          }
        }

        if (hitDino) {
          player.lassoState = 'hooked';
          player.lassoTargetDinoId = hitDino.instanceId;
          hitDino.state = 'being_captured';
          if (!hitDino.capturingPlayerIds.includes(player.id)) {
            hitDino.capturingPlayerIds.push(player.id);
          }
        } else if (player.lassoLength >= player.lassoMaxLength) {
          player.lassoState = 'returning';
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
          targetDino.x += Math.cos(pullAngle) * pullSpeed;
          targetDino.y += Math.sin(pullAngle) * pullSpeed;

          const distToPlayer = Math.hypot(player.x - targetDino.x, player.y - targetDino.y);
          if (distToPlayer < 45) {
            // CAPTURE COMPLETED!
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

      // Check nearby lures
      let attractedLure = null;
      for (const lure of room.lures) {
        const dist = Math.hypot(lure.x - dino.x, lure.y - dino.y);
        if (dist < lure.radius) {
          attractedLure = lure;
          break;
        }
      }

      if (attractedLure) {
        const angle = Math.atan2(attractedLure.y - dino.y, attractedLure.x - dino.x);
        dino.vx = Math.cos(angle) * (dino.speed * 0.8);
        dino.vy = Math.sin(angle) * (dino.speed * 0.8);
        dino.angle = angle;
      } else if (dino.state !== 'being_captured') {
        // Find nearest player
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

        // Fast dinosaurs actively evade players!
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

      dino.x += dino.vx;
      dino.y += dino.vy;

      // Keep within bounds
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
  }, 1000 / 30); // 30 ticks per second
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
            speedMultiplier: 1.0,
            boostCooldown: 0,
            lureCount: 3,
            isStunned: false,
            stunTimer: 0,
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

        if (msg.type === 'SET_READY') {
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
              speedMultiplier: 1.0,
              boostCooldown: 0,
              lureCount: 3,
              isStunned: false,
              stunTimer: 0,
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
        } else if (msg.type === 'START_GAME' && player.isHost) {
          if (msg.mode) room.mode = msg.mode;
          if (msg.map) room.map = msg.map;
          if (msg.duration) {
            room.totalTime = msg.duration;
            room.timeRemaining = msg.duration;
          }
          startRoomGameLoop(room);
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
          if (player.lassoState === 'ready' && !player.isStunned) {
            player.lassoState = 'extending';
            player.lassoAngle = msg.angle !== undefined ? msg.angle : player.angle;
            player.lassoLength = 0;
            player.lassoX = player.x;
            player.lassoY = player.y;
            player.isThrowingLasso = true;
          }
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
