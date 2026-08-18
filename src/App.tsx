import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  GameMode,
  GameStatus,
  MapType,
  Player,
  ActiveDinosaur,
  GameRoomState,
  AvatarOption,
  PowerUpType,
  EarthFissure,
  TidalWave,
  WSClientMessage,
  WSServerMessage
} from './types/game';
import { DINOSAUR_CATALOG, MAP_CONFIGS } from './data/dinosaurs';
import { AVATAR_OPTIONS, PLAYER_SLOT_COLORS } from './data/avatars';
import { GEM_CATALOG } from './data/gems';
import { audioEngine } from './audio/audioEngine';
import { AvatarSelect } from './components/AvatarSelect';
import { LobbyRoom } from './components/LobbyRoom';
import { GameCanvas } from './components/GameCanvas';
import { DualControllers } from './components/DualControllers';
import { ScoreboardOverlay } from './components/ScoreboardOverlay';
import { FieldGuideModal } from './components/FieldGuideModal';
import { GameOverModal } from './components/GameOverModal';
import {
  Volume2,
  VolumeX,
  BookOpen,
  Sparkles,
  Gamepad2,
  Compass,
  Layers,
  HeartHandshake,
  Trophy
} from 'lucide-react';

/** Impassable Earth Fissure barrier collision resolver */
function resolveFissureBarrier(
  oldX: number,
  oldY: number,
  targetX: number,
  targetY: number,
  radius: number,
  fissures: EarthFissure[]
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
    const minRequiredDist = radius + 14; // Impassable wall thickness

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

export default function App() {
  // Main Navigation / State - Start with Character & Nickname Selection screen!
  const [currentStatus, setCurrentStatus] = useState<GameStatus>('avatar_select');
  const [isOnlineMode, setIsOnlineMode] = useState<boolean>(false);
  const [roomId, setRoomId] = useState<string>('DINO-LAN');
  const [gameMode, setGameMode] = useState<GameMode>('competitive');
  const [selectedMap, setSelectedMap] = useState<MapType>('jurassic_jungle');
  const [localPlayerCount, setLocalPlayerCount] = useState<number>(1);
  const [isFieldGuideOpen, setIsFieldGuideOpen] = useState<boolean>(false);
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // Local Player Configuration
  const [myPlayerSlot, setMyPlayerSlot] = useState<1 | 2 | 3 | 4>(1);
  const [myAvatar, setMyAvatar] = useState<AvatarOption>(AVATAR_OPTIONS[0]);
  const [myPlayerName, setMyPlayerName] = useState<string>('Leo');
  const [myColor, setMyColor] = useState<string>('#f97316');
  const [equippedGems, setEquippedGems] = useState<[PowerUpType, PowerUpType]>(['tidal_wave', 'net_trap']);

  // Authoritative Room State (synced from WS or simulated locally)
  const [roomState, setRoomState] = useState<GameRoomState>({
    roomId: 'DINO-LAN',
    mode: 'competitive',
    status: 'playing',
    map: 'jurassic_jungle',
    timeRemaining: 90,
    totalTime: 90,
    coopTeamScore: 0,
    coopTargetScore: 80,
    coopComboMultiplier: 1,
    comboTimer: 0,
    dinos: [],
    players: {},
    lures: [],
    activeEvents: [],
    recentCaptures: []
  });

  const wsRef = useRef<WebSocket | null>(null);
  const localLoopRef = useRef<NodeJS.Timeout | null>(null);
  const myPlayerId = useRef<string>(`local_p1_${Date.now()}`);

  // Initialize Audio & Background music
  const toggleMute = () => {
    const nextMute = !isMuted;
    setIsMuted(nextMute);
    audioEngine.setMuted(nextMute);
  };

  // --- LOCAL SIMULATION ENGINE (Provides instant, zero-lag local 1-4P multiplayer) ---
  const spawnLocalDino = useCallback((specificDefId?: string): ActiveDinosaur => {
    let def = DINOSAUR_CATALOG[0];
    if (specificDefId) {
      def = DINOSAUR_CATALOG.find(d => d.id === specificDefId) || DINOSAUR_CATALOG[0];
    } else {
      const rand = Math.random();
      if (rand < 0.38) {
        const slow = DINOSAUR_CATALOG.filter(d => d.speedCategory === 'slow');
        def = slow[Math.floor(Math.random() * slow.length)];
      } else if (rand < 0.72) {
        const med = DINOSAUR_CATALOG.filter(d => d.speedCategory === 'medium');
        def = med[Math.floor(Math.random() * med.length)];
      } else if (rand < 0.94) {
        const fast = DINOSAUR_CATALOG.filter(d => d.speedCategory === 'fast');
        def = fast[Math.floor(Math.random() * fast.length)];
      } else {
        const apex = DINOSAUR_CATALOG.filter(d => d.speedCategory === 'apex');
        def = apex[Math.floor(Math.random() * apex.length)];
      }
    }

    const edge = Math.floor(Math.random() * 4);
    let x = Math.random() * 1200 + 100;
    let y = Math.random() * 700 + 100;
    if (edge === 0) x = 60;
    else if (edge === 1) x = 1340;
    else if (edge === 2) y = 60;
    else y = 840;

    const targetX = Math.random() * 1200 + 100;
    const targetY = Math.random() * 700 + 100;
    const angle = Math.atan2(targetY - y, targetX - x);
    const speed = def.baseSpeed;
    const isBoss = def.speedCategory === 'apex';

    return {
      instanceId: `local_dino_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      defId: def.id,
      x,
      y,
      targetX,
      targetY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      speed,
      points: def.points,
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
  }, []);

  // Initialize Local Players in state with powerups & gem loadouts
  const resetLocalPlayers = useCallback((count: number, currentAv: AvatarOption, curName: string, curCol: string) => {
    const newPlayers: Record<string, Player> = {};
    const slots = [1, 2, 3, 4] as const;

    const defaultGemsForSlot: [PowerUpType, PowerUpType][] = [
      ['tidal_wave', 'net_trap'],
      ['earth_fissure', 'stun_shockwave'],
      ['speed_boost', 'tornado_gust'],
      ['titan_strength', 'dino_call']
    ];

    for (let i = 0; i < count; i++) {
      const slot = slots[i];
      const pId = slot === 1 ? myPlayerId.current : `local_p${slot}`;
      const av = slot === 1 ? currentAv : AVATAR_OPTIONS[(i + 1) % AVATAR_OPTIONS.length];
      const col = slot === 1 ? curCol : PLAYER_SLOT_COLORS[slot].primary;
      const name = slot === 1 ? curName : `Ranger ${slot}`;
      const pGems = slot === 1 ? equippedGems : defaultGemsForSlot[i % defaultGemsForSlot.length];

      newPlayers[pId] = {
        id: pId,
        name,
        avatarId: av.id,
        color: col,
        x: 250 + i * 220,
        y: 450,
        vx: 0,
        vy: 0,
        angle: 0,
        score: 0,
        capturedDinosCount: 0,
        fastDinosCount: 0,
        slowDinosCount: 0,
        isThrowingLasso: false,
        lassoX: 250 + i * 220,
        lassoY: 450,
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
        equippedGems: pGems,
        gemCooldowns: { gem1: 0, gem2: 0, sprint: 0 },
        gemMaxCooldowns: { gem1: 300, gem2: 300, sprint: 180 },
        activeBuffs: {
          speedTimer: 0,
          titanStrengthTimer: 0,
          dinoCallTimer: 0
        },
        isReady: true,
        isHost: slot === 1,
        slotNumber: slot,
        inputSource: slot === 1 ? 'local_p1' : slot === 2 ? 'local_p2' : 'bot'
      };
    }

    setRoomState(prev => ({
      ...prev,
      players: newPlayers
    }));
  }, [equippedGems]);

  // Activate a gem skill effect locally (Shared between power-ups and gems)
  const activateSkillEffect = (skillType: PowerUpType, p: Player, prev: GameRoomState) => {
    audioEngine.playSkill(skillType);
    const myHome = prev.homeBases?.find(hb => hb.slotNumber === p.slotNumber);

    const nextEarthFissures = [...(prev.earthFissures || [])];
    const nextSecretTunnels = [...(prev.secretTunnels || [])];
    const nextTidalWaves = [...(prev.tidalWaves || [])];

    switch (skillType) {
      case 'tidal_wave': {
        const angle = p.angle || 0;
        const speed = 12;
        // Spawns from behind the character (kéo từ sau ra trước nhân vật)
        const spawnBehindDist = 180;
        const waveX = p.x - Math.cos(angle) * spawnBehindDist;
        const waveY = p.y - Math.sin(angle) * spawnBehindDist;
        nextTidalWaves.push({
          id: `wave_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          ownerId: p.id,
          x: waveX,
          y: waveY,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          angle,
          speed,
          width: 120, // 3 ô ngang = 120px
          length: 400, // 10 ô dài = 400px
          life: 75,
          maxLife: 75
        });
        break;
      }
      case 'net_trap': {
        (Object.values(prev.players) as Player[]).forEach(opp => {
          if (opp.id !== p.id) {
            const dist = Math.hypot(opp.x - p.x, opp.y - p.y);
            if (dist < 450) {
              opp.isNetTrapped = true;
              opp.netTrapTimer = 150;
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
        p.activeBuffs = p.activeBuffs || { speedTimer: 0, titanStrengthTimer: 0, dinoCallTimer: 0 };
        p.activeBuffs.speedTimer = 150;
        p.speedMultiplier = 2.2;
        break;
      }
      case 'titan_strength': {
        p.activeBuffs = p.activeBuffs || { speedTimer: 0, titanStrengthTimer: 0, dinoCallTimer: 0 };
        p.activeBuffs.titanStrengthTimer = 150;
        break;
      }
      case 'secret_tunnel': {
        nextSecretTunnels.push({
          id: `local_tunnel_${Date.now()}`,
          ownerId: p.id,
          x: p.x,
          y: p.y,
          homeX: myHome ? myHome.x : 130,
          homeY: myHome ? myHome.y : 130,
          duration: 150
        });
        break;
      }
      case 'dino_call': {
        p.activeBuffs = p.activeBuffs || { speedTimer: 0, titanStrengthTimer: 0, dinoCallTimer: 0 };
        p.activeBuffs.dinoCallTimer = 150;
        break;
      }
      case 'earth_fissure': {
        const angle = p.angle || 0;
        const perpAngle = angle + Math.PI / 2;
        const halfLength = 280; // 14 ô = 560px tổng chiều dài vách ngăn
        const cx = p.x + Math.cos(angle) * 45;
        const cy = p.y + Math.sin(angle) * 45;
        nextEarthFissures.push({
          id: `local_fissure_${Date.now()}`,
          ownerId: p.id,
          x1: Math.max(30, Math.min(1370, cx - Math.cos(perpAngle) * halfLength)),
          y1: Math.max(30, Math.min(870, cy - Math.sin(perpAngle) * halfLength)),
          x2: Math.max(30, Math.min(1370, cx + Math.cos(perpAngle) * halfLength)),
          y2: Math.max(30, Math.min(870, cy + Math.sin(perpAngle) * halfLength)),
          duration: 150 // 5 giây (150 ticks)
        });
        break;
      }
      case 'stun_shockwave': {
        (Object.values(prev.players) as Player[]).forEach(opp => {
          if (opp.id !== p.id) {
            const dist = Math.hypot(opp.x - p.x, opp.y - p.y);
            if (dist < 400) {
              opp.isStunned = true;
              opp.stunTimer = 150;
            }
          }
        });
        break;
      }
      case 'tornado_gust': {
        (Object.values(prev.players) as Player[]).forEach(opp => {
          if (opp.id !== p.id) {
            opp.lassoState = 'ready';
            opp.lassoLength = 0;
            opp.isThrowingLasso = false;
            opp.tetheredDinoId = null;
          }
        });
        break;
      }
    }

    return {
      ...prev,
      earthFissures: nextEarthFissures,
      secretTunnels: nextSecretTunnels,
      tidalWaves: nextTidalWaves
    };
  };

  // Use Power-up Skill locally
  const usePowerUpLocally = useCallback((playerId: string) => {
    setRoomState(prev => {
      const p = prev.players[playerId];
      if (!p || !p.heldPowerUp) return prev;
      const skillType = p.heldPowerUp;
      p.heldPowerUp = null;
      return activateSkillEffect(skillType, p, prev);
    });
  }, []);

  // Use Gem Slot locally with cooldown & score unlock verification
  const useGemLocally = useCallback((playerId: string, slotKey: 1 | 2 | 'sprint') => {
    setRoomState(prev => {
      const p = prev.players[playerId];
      if (!p || p.isStunned || p.isNetTrapped) return prev;

      p.gemCooldowns = p.gemCooldowns || { gem1: 0, gem2: 0, sprint: 0 };
      p.gemMaxCooldowns = p.gemMaxCooldowns || { gem1: 300, gem2: 300, sprint: 180 };
      p.equippedGems = p.equippedGems || ['tidal_wave', 'net_trap'];

      if (slotKey === 'sprint') {
        if (p.gemCooldowns.sprint > 0) return prev;
        p.gemCooldowns.sprint = 180; // 6s cooldown
        p.speedMultiplier = 1.8;
        audioEngine.playBoost();
        setTimeout(() => {
          setRoomState(ps => {
            const pl = ps.players[playerId];
            if (pl) pl.speedMultiplier = 1.0;
            return { ...ps };
          });
        }, 1500);
        return { ...prev };
      }

      const gemType = slotKey === 1 ? p.equippedGems[0] : p.equippedGems[1];
      const gemDef = GEM_CATALOG.find(g => g.id === gemType) || GEM_CATALOG[0];
      const cdProp = slotKey === 1 ? 'gem1' : 'gem2';

      // Verify Score requirement and Cooldown
      if (p.score < gemDef.unlockScore) return prev;
      if (p.gemCooldowns[cdProp] > 0) return prev;

      const cdTicks = gemDef.cooldownSeconds * 30;
      p.gemCooldowns[cdProp] = cdTicks;
      p.gemMaxCooldowns[cdProp] = cdTicks;

      return activateSkillEffect(gemType, p, prev);
    });
  }, []);

  // Handle Gem Selection in Lobby or Customizer
  const handleSelectGems = useCallback((slot1: PowerUpType, slot2: PowerUpType) => {
    setEquippedGems([slot1, slot2]);
    setRoomState(prev => {
      const p = prev.players[myPlayerId.current];
      if (p) {
        p.equippedGems = [slot1, slot2];
      }
      return { ...prev };
    });
    if (isOnlineMode && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'SELECT_GEMS', gems: [slot1, slot2] }));
    }
  }, [isOnlineMode]);

  // Handle P1 Gem & Skill triggers
  const handleP1UseGem1 = useCallback(() => {
    if (isOnlineMode && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'USE_GEM', gemSlot: 1 }));
    } else {
      useGemLocally(myPlayerId.current, 1);
    }
  }, [isOnlineMode, useGemLocally]);

  const handleP1UseGem2 = useCallback(() => {
    if (isOnlineMode && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'USE_GEM', gemSlot: 2 }));
    } else {
      useGemLocally(myPlayerId.current, 2);
    }
  }, [isOnlineMode, useGemLocally]);

  const handleP1UseSprint = useCallback(() => {
    if (isOnlineMode && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'USE_GEM', gemSlot: 'sprint' }));
    } else {
      useGemLocally(myPlayerId.current, 'sprint');
    }
  }, [isOnlineMode, useGemLocally]);

  // Handle P2 Gem triggers
  const handleP2UseGem1 = useCallback(() => {
    useGemLocally('local_p2', 1);
  }, [useGemLocally]);

  const handleP2UseGem2 = useCallback(() => {
    useGemLocally('local_p2', 2);
  }, [useGemLocally]);

  const handleP2UseSprint = useCallback(() => {
    useGemLocally('local_p2', 'sprint');
  }, [useGemLocally]);

  // Handle Power-Up pickups
  const handleP1UsePowerUp = useCallback(() => {
    if (isOnlineMode && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'USE_POWERUP' }));
    } else {
      usePowerUpLocally(myPlayerId.current);
    }
  }, [isOnlineMode, usePowerUpLocally]);

  const handleP2UsePowerUp = useCallback(() => {
    usePowerUpLocally('local_p2');
  }, [usePowerUpLocally]);

  // Start Local Match Loop
  const startLocalMatch = useCallback(() => {
    if (localLoopRef.current) clearInterval(localLoopRef.current);

    // Populate dinosaurs
    const initialDinos: ActiveDinosaur[] = [];
    for (let i = 0; i < 12; i++) {
      initialDinos.push(spawnLocalDino());
    }

    const homeBases = [
      { slotNumber: 1 as const, x: 130, y: 130, radius: 95, color: '#f97316', label: 'P1 CORRAL' },
      { slotNumber: 2 as const, x: 1270, y: 130, radius: 95, color: '#06b6d4', label: 'P2 CORRAL' },
      { slotNumber: 3 as const, x: 130, y: 770, radius: 95, color: '#10b981', label: 'P3 CORRAL' },
      { slotNumber: 4 as const, x: 1270, y: 770, radius: 95, color: '#ec4899', label: 'P4 CORRAL' }
    ];

    const powerUpTypes = ['net_trap', 'speed_boost', 'titan_strength', 'secret_tunnel', 'dino_call', 'earth_fissure', 'stun_shockwave', 'tornado_gust'] as const;
    const initialPowerUps = [
      {
        id: `pw_1_${Date.now()}`,
        type: powerUpTypes[Math.floor(Math.random() * powerUpTypes.length)],
        x: 450,
        y: 450,
        spawnTime: Date.now(),
        duration: 600
      },
      {
        id: `pw_2_${Date.now()}`,
        type: powerUpTypes[Math.floor(Math.random() * powerUpTypes.length)],
        x: 950,
        y: 450,
        spawnTime: Date.now(),
        duration: 600
      }
    ];

    setRoomState(prev => {
      const resetPlayers = { ...prev.players };
      const spawnPos = [{ x: 300, y: 300 }, { x: 1100, y: 300 }, { x: 300, y: 650 }, { x: 1100, y: 650 }];
      let idx = 0;
      for (const p of Object.values(resetPlayers) as Player[]) {
        const pos = spawnPos[idx % spawnPos.length];
        p.x = pos.x;
        p.y = pos.y;
        p.vx = 0;
        p.vy = 0;
        p.score = 0;
        p.capturedDinosCount = 0;
        p.fastDinosCount = 0;
        p.slowDinosCount = 0;
        p.lassoState = 'ready';
        p.lassoLength = 0;
        p.lassoTargetDinoId = null;
        p.tetheredDinoId = null;
        p.tetheredPlayerId = null;
        p.isThrowingLasso = false;
        p.lureCount = 3;
        p.heldPowerUp = null;
        p.isStunned = false;
        p.stunTimer = 0;
        p.isNetTrapped = false;
        p.netTrapTimer = 0;
        p.activeBuffs = { speedTimer: 0, titanStrengthTimer: 0, dinoCallTimer: 0 };
        idx++;
      }

      return {
        ...prev,
        status: 'playing',
        mode: gameMode,
        map: selectedMap,
        timeRemaining: 90,
        coopTeamScore: 0,
        coopComboMultiplier: 1,
        comboTimer: 0,
        dinos: initialDinos,
        homeBases,
        activePowerUps: initialPowerUps,
        earthFissures: [],
        secretTunnels: [],
        lures: [],
        recentCaptures: []
      };
    });

    setCurrentStatus('playing');
    audioEngine.startMusic();

    let localTicks = 0;

    localLoopRef.current = setInterval(() => {
      localTicks++;

      setRoomState(prev => {
        if (prev.status !== 'playing') return prev;

        let timeRem = prev.timeRemaining;
        if (localTicks % 30 === 0) {
          timeRem--;
          if (timeRem <= 0) {
            audioEngine.playVictory();
            setCurrentStatus('gameover');
            return { ...prev, status: 'gameover', timeRemaining: 0 };
          }
        }

        let comboMul = prev.coopComboMultiplier;
        let comboTime = prev.comboTimer;
        if (comboTime > 0) {
          comboTime--;
          if (comboTime === 0) comboMul = 1;
        }

        // Maintain Fissures & Tunnels
        const fissures = [...(prev.earthFissures || [])];
        for (let i = fissures.length - 1; i >= 0; i--) {
          fissures[i].duration--;
          if (fissures[i].duration <= 0) fissures.splice(i, 1);
        }

        const tunnels = [...(prev.secretTunnels || [])];
        for (let i = tunnels.length - 1; i >= 0; i--) {
          tunnels[i].duration--;
          if (tunnels[i].duration <= 0) tunnels.splice(i, 1);
        }

        // Maintain Tidal Waves physics & directional push for everything in wave area
        const tidalWaves = [...(prev.tidalWaves || [])];
        for (let i = tidalWaves.length - 1; i >= 0; i--) {
          const wave = tidalWaves[i];
          wave.x += wave.vx;
          wave.y += wave.vy;
          wave.life--;

          const cosW = Math.cos(-wave.angle);
          const sinW = Math.sin(-wave.angle);
          const waveHalfLength = (wave.length || 400) / 2; // 10 ô dài = 400px
          const waveHalfWidth = (wave.width || 120) / 2; // 3 ô ngang = 120px

          // Push opponent players within wave area
          (Object.values(prev.players) as Player[]).forEach(p => {
            if (p.id !== wave.ownerId) {
              const dx = p.x - wave.x;
              const dy = p.y - wave.y;
              const localX = dx * cosW - dy * sinW;
              const localY = dx * sinW + dy * cosW;

              if (Math.abs(localX) <= (waveHalfLength + 25) && Math.abs(localY) <= (waveHalfWidth + 25)) {
                p.x += wave.vx * 1.15;
                p.y += wave.vy * 1.15;
                p.x = Math.max(40, Math.min(1360, p.x));
                p.y = Math.max(40, Math.min(860, p.y));
                p.lassoState = 'ready';
                p.lassoLength = 0;
                p.isThrowingLasso = false;
                p.tetheredDinoId = null;
                p.tetheredPlayerId = null;
              }
            }
          });

          // Push dinosaurs within wave area
          prev.dinos.forEach(d => {
            const dx = d.x - wave.x;
            const dy = d.y - wave.y;
            const localX = dx * cosW - dy * sinW;
            const localY = dx * sinW + dy * cosW;

            if (Math.abs(localX) <= (waveHalfLength + d.size) && Math.abs(localY) <= (waveHalfWidth + d.size)) {
              d.x += wave.vx * 1.15;
              d.y += wave.vy * 1.15;
              d.x = Math.max(30, Math.min(1370, d.x));
              d.y = Math.max(30, Math.min(870, d.y));
            }
          });

          if (wave.life <= 0) {
            tidalWaves.splice(i, 1);
          }
        }

        // Maintain dinos
        const dinos = [...prev.dinos];
        if (dinos.length < 12 && Math.random() < 0.04) {
          dinos.push(spawnLocalDino());
        }

        const players = { ...prev.players };
        const captures = [...prev.recentCaptures];
        let teamScore = prev.coopTeamScore;

        // Update players logic & dragging
        (Object.values(players) as Player[]).forEach(p => {
          // Decrement Gem Cooldowns
          if (p.gemCooldowns) {
            if (p.gemCooldowns.gem1 > 0) p.gemCooldowns.gem1--;
            if (p.gemCooldowns.gem2 > 0) p.gemCooldowns.gem2--;
            if (p.gemCooldowns.sprint > 0) p.gemCooldowns.sprint--;
          }

          // Stun & Net handling
          if (p.isStunned) {
            p.stunTimer--;
            if (p.stunTimer <= 0) p.isStunned = false;
          }
          if (p.isNetTrapped) {
            p.netTrapTimer--;
            if (p.netTrapTimer <= 0) p.isNetTrapped = false;
          }

          if (p.activeBuffs?.speedTimer && p.activeBuffs.speedTimer > 0) {
            p.activeBuffs.speedTimer--;
            p.speedMultiplier = 2.0;
            if (p.activeBuffs.speedTimer <= 0) p.speedMultiplier = 1.0;
          }
          if (p.activeBuffs?.titanStrengthTimer && p.activeBuffs.titanStrengthTimer > 0) {
            p.activeBuffs.titanStrengthTimer--;
          }
          if (p.activeBuffs?.dinoCallTimer && p.activeBuffs.dinoCallTimer > 0) {
            p.activeBuffs.dinoCallTimer--;
          }

          // AI Bot logic
          if (p.inputSource === 'bot' && !p.isStunned && !p.isNetTrapped) {
            if (p.heldPowerUp && Math.random() < 0.03) {
              usePowerUpLocally(p.id);
            }

            // AI Gem Usage
            p.gemCooldowns = p.gemCooldowns || { gem1: 0, gem2: 0, sprint: 0 };
            p.equippedGems = p.equippedGems || ['tidal_wave', 'net_trap'];
            const g1Def = GEM_CATALOG.find(g => g.id === p.equippedGems[0]) || GEM_CATALOG[0];
            const g2Def = GEM_CATALOG.find(g => g.id === p.equippedGems[1]) || GEM_CATALOG[0];

            if (p.score >= g1Def.unlockScore && p.gemCooldowns.gem1 === 0 && Math.random() < 0.02) {
              p.gemCooldowns.gem1 = g1Def.cooldownSeconds * 30;
              activateSkillEffect(p.equippedGems[0], p, prev);
            } else if (p.score >= g2Def.unlockScore && p.gemCooldowns.gem2 === 0 && Math.random() < 0.02) {
              p.gemCooldowns.gem2 = g2Def.cooldownSeconds * 30;
              activateSkillEffect(p.equippedGems[1], p, prev);
            } else if (p.gemCooldowns.sprint === 0 && Math.random() < 0.01) {
              p.gemCooldowns.sprint = 180;
              p.speedMultiplier = 1.8;
            }

            const myHome = prev.homeBases?.find(hb => hb.slotNumber === p.slotNumber);
            if (p.tetheredDinoId && myHome) {
              // Drag tethered dino to home corral!
              const angleToHome = Math.atan2(myHome.y - p.y, myHome.x - p.x);
              p.vx = Math.cos(angleToHome);
              p.vy = Math.sin(angleToHome);
              p.angle = angleToHome;
            } else if (dinos.length > 0) {
              const target = dinos[0];
              const angle = Math.atan2(target.y - p.y, target.x - p.x);
              p.vx = Math.cos(angle);
              p.vy = Math.sin(angle);
              p.angle = angle;
              const dist = Math.hypot(target.x - p.x, target.y - p.y);
              if (dist < 140 && p.lassoState === 'ready' && Math.random() < 0.08) {
                p.lassoState = 'extending';
                p.lassoAngle = angle;
                p.lassoLength = 0;
                p.isThrowingLasso = true;
              }
            }
          }

          // Move player with impassable fissure barrier resolution
          if (!p.isStunned) {
            const speed = 4.8 * p.speedMultiplier;
            const targetX = Math.max(40, Math.min(1360, p.x + p.vx * speed));
            const targetY = Math.max(40, Math.min(860, p.y + p.vy * speed));
            const pos = resolveFissureBarrier(p.x, p.y, targetX, targetY, 26, fissures);
            p.x = pos.x;
            p.y = pos.y;
          }

          // Lasso & Dragging Mechanics
          if (p.lassoState === 'extending') {
            p.lassoLength += 16;
            p.lassoX = p.x + Math.cos(p.lassoAngle) * p.lassoLength;
            p.lassoY = p.y + Math.sin(p.lassoAngle) * p.lassoLength;

            // Check if lasso crosses any Earth Fissure impassable barrier
            let lassoBlocked = false;
            for (const fis of fissures) {
              const ccw = (ax: number, ay: number, bx: number, by: number, cx: number, cy: number) => {
                return (cy - ay) * (bx - ax) > (by - ay) * (cx - ax);
              };
              if (ccw(p.x, p.y, fis.x1, fis.y1, fis.x2, fis.y2) !== ccw(p.lassoX, p.lassoY, fis.x1, fis.y1, fis.x2, fis.y2) &&
                  ccw(p.x, p.y, p.lassoX, p.lassoY, fis.x1, fis.y1) !== ccw(p.x, p.y, p.lassoX, p.lassoY, fis.x2, fis.y2)) {
                lassoBlocked = true;
                break;
              }
            }

            if (lassoBlocked) {
              p.lassoState = 'returning';
            } else {
              let hitDino: ActiveDinosaur | null = null;
              for (const d of dinos) {
                const dist = Math.hypot(d.x - p.lassoX, d.y - p.lassoY);
                if (dist < d.size + 16) {
                  hitDino = d;
                  break;
                }
              }

              if (hitDino) {
                if (prev.mode === 'competitive') {
                  p.lassoState = 'tethering';
                  p.tetheredDinoId = hitDino.instanceId;
                  hitDino.state = 'tethered';
                  hitDino.tetheredByPlayerId = p.id;
                } else {
                  p.lassoState = 'hooked';
                  p.lassoTargetDinoId = hitDino.instanceId;
                  hitDino.state = 'being_captured';
                  if (!hitDino.capturingPlayerIds.includes(p.id)) {
                    hitDino.capturingPlayerIds.push(p.id);
                  }
                }
              } else if (p.lassoLength >= p.lassoMaxLength) {
                p.lassoState = 'returning';
              }
            }
          } else if (p.lassoState === 'tethering') {
            // Competitive dragging to home corral or secret tunnel
            if (p.tetheredDinoId) {
              const tetheredDino = dinos.find(d => d.instanceId === p.tetheredDinoId);
              if (tetheredDino) {
                p.lassoX = tetheredDino.x;
                p.lassoY = tetheredDino.y;
                p.lassoLength = Math.hypot(tetheredDino.x - p.x, tetheredDino.y - p.y);

                const pullAngle = Math.atan2(p.y - tetheredDino.y, p.x - tetheredDino.x);
                const dist = Math.hypot(p.x - tetheredDino.x, p.y - tetheredDino.y);
                const pullSpeed = dist > 70 ? 5.5 : 2.0;
                
                const targetDinoX = tetheredDino.x + Math.cos(pullAngle) * pullSpeed;
                const targetDinoY = tetheredDino.y + Math.sin(pullAngle) * pullSpeed;
                const dinoPos = resolveFissureBarrier(tetheredDino.x, tetheredDino.y, targetDinoX, targetDinoY, tetheredDino.size, fissures);
                tetheredDino.x = Math.max(30, Math.min(1370, dinoPos.x));
                tetheredDino.y = Math.max(30, Math.min(870, dinoPos.y));
                tetheredDino.angle = pullAngle;

                const myHome = prev.homeBases?.find(hb => hb.slotNumber === p.slotNumber);
                let capturedAtHome = false;
                if (myHome && Math.hypot(tetheredDino.x - myHome.x, tetheredDino.y - myHome.y) < myHome.radius) {
                  capturedAtHome = true;
                }
                const myTunnel = tunnels.find(t => t.ownerId === p.id);
                if (myTunnel && Math.hypot(tetheredDino.x - myTunnel.x, tetheredDino.y - myTunnel.y) < 48) {
                  capturedAtHome = true;
                }

                if (capturedAtHome) {
                  const def = DINOSAUR_CATALOG.find(d => d.id === tetheredDino.defId);
                  const isFast = def && (def.speedCategory === 'fast' || def.speedCategory === 'apex');
                  const pts = tetheredDino.points;

                  p.score += pts;
                  p.capturedDinosCount++;
                  if (isFast) p.fastDinosCount++;
                  else p.slowDinosCount++;

                  p.lassoState = 'ready';
                  p.lassoLength = 0;
                  p.isThrowingLasso = false;
                  p.tetheredDinoId = null;

                  audioEngine.playCaptureSuccess(!!isFast, pts);
                  if (def) audioEngine.playRoar(def.roarType);

                  const dIdx = dinos.findIndex(d => d.instanceId === tetheredDino.instanceId);
                  if (dIdx !== -1) dinos.splice(dIdx, 1);

                  captures.unshift({
                    playerName: p.name,
                    dinoName: def?.name || 'Dino',
                    points: pts,
                    timestamp: Date.now(),
                    isFast: !!isFast
                  });
                  if (captures.length > 8) captures.pop();
                }
              } else {
                p.lassoState = 'returning';
                p.tetheredDinoId = null;
              }
            }
          } else if (p.lassoState === 'hooked') {
            const hookedDino = dinos.find(d => d.instanceId === p.lassoTargetDinoId);
            if (hookedDino) {
              p.lassoX = hookedDino.x;
              p.lassoY = hookedDino.y;
              p.lassoLength = Math.hypot(hookedDino.x - p.x, hookedDino.y - p.y);

              const pullAngle = Math.atan2(p.y - hookedDino.y, p.x - hookedDino.x);
              const targetHookX = hookedDino.x + Math.cos(pullAngle) * 7.5;
              const targetHookY = hookedDino.y + Math.sin(pullAngle) * 7.5;
              const dinoPos = resolveFissureBarrier(hookedDino.x, hookedDino.y, targetHookX, targetHookY, hookedDino.size, fissures);
              hookedDino.x = Math.max(30, Math.min(1370, dinoPos.x));
              hookedDino.y = Math.max(30, Math.min(870, dinoPos.y));

              const dist = Math.hypot(p.x - hookedDino.x, p.y - hookedDino.y);
              if (dist < 45) {
                const def = DINOSAUR_CATALOG.find(d => d.id === hookedDino.defId);
                const isFast = def && (def.speedCategory === 'fast' || def.speedCategory === 'apex');

                let pts = hookedDino.points;
                if (prev.mode === 'cooperative') {
                  if (hookedDino.capturingPlayerIds.length > 1) {
                    comboMul = Math.min(4, comboMul + 1);
                    pts *= comboMul;
                  }
                  teamScore += pts;
                  comboTime = 150;
                }

                p.score += pts;
                p.capturedDinosCount++;
                if (isFast) p.fastDinosCount++;
                else p.slowDinosCount++;

                p.lassoState = 'ready';
                p.lassoLength = 0;
                p.isThrowingLasso = false;
                p.lassoTargetDinoId = null;

                audioEngine.playCaptureSuccess(!!isFast, pts);
                if (def) audioEngine.playRoar(def.roarType);

                const dIdx = dinos.findIndex(d => d.instanceId === hookedDino.instanceId);
                if (dIdx !== -1) dinos.splice(dIdx, 1);

                captures.unshift({
                  playerName: p.name,
                  dinoName: def?.name || 'Dino',
                  points: pts,
                  timestamp: Date.now(),
                  isFast: !!isFast
                });
                if (captures.length > 8) captures.pop();
              }
            } else {
              p.lassoState = 'returning';
              p.lassoTargetDinoId = null;
            }
          } else if (p.lassoState === 'returning') {
            p.lassoLength -= 20;
            if (p.lassoLength <= 0) {
              p.lassoLength = 0;
              p.lassoState = 'ready';
              p.isThrowingLasso = false;
              p.lassoTargetDinoId = null;
              p.tetheredDinoId = null;
              p.tetheredPlayerId = null;
            } else {
              p.lassoX = p.x + Math.cos(p.lassoAngle) * p.lassoLength;
              p.lassoY = p.y + Math.sin(p.lassoAngle) * p.lassoLength;
            }
          }
        });

        // Update dinos AI with fissure obstacle avoidance
        dinos.forEach(d => {
          d.animationTick += 0.2;
          if (d.state === 'tethered') return;

          let callingPlayer: Player | null = null;
          for (const p of Object.values(players) as Player[]) {
            if (p.activeBuffs?.dinoCallTimer && p.activeBuffs.dinoCallTimer > 0) {
              callingPlayer = p;
              break;
            }
          }

          if (callingPlayer) {
            const angle = Math.atan2(callingPlayer.y - d.y, callingPlayer.x - d.x);
            d.vx = Math.cos(angle) * (d.speed * 1.2);
            d.vy = Math.sin(angle) * (d.speed * 1.2);
            d.angle = angle;
          } else if (d.state !== 'being_captured') {
            const dist = Math.hypot(d.targetX - d.x, d.targetY - d.y);
            if (dist < 30 || Math.random() < 0.015) {
              d.targetX = Math.random() * 1200 + 100;
              d.targetY = Math.random() * 700 + 100;
            }
            const angle = Math.atan2(d.targetY - d.y, d.targetX - d.x);
            d.vx = Math.cos(angle) * d.speed;
            d.vy = Math.sin(angle) * d.speed;
            d.angle = angle;
          }
          
          const targetDinoX = d.x + d.vx;
          const targetDinoY = d.y + d.vy;
          const dinoPos = resolveFissureBarrier(d.x, d.y, targetDinoX, targetDinoY, d.size, fissures);
          if (dinoPos.x === d.x && dinoPos.y === d.y) {
            // Rebounded from fissure barrier
            d.vx *= -1;
            d.vy *= -1;
            d.targetX = Math.random() * 1200 + 100;
            d.targetY = Math.random() * 700 + 100;
          } else {
            d.x = dinoPos.x;
            d.y = dinoPos.y;
          }

          if (d.x < 30) { d.x = 30; d.vx *= -1; }
          if (d.x > 1370) { d.x = 1370; d.vx *= -1; }
          if (d.y < 30) { d.y = 30; d.vy *= -1; }
          if (d.y > 870) { d.y = 870; d.vy *= -1; }
        });

        return {
          ...prev,
          timeRemaining: timeRem,
          coopTeamScore: teamScore,
          coopComboMultiplier: comboMul,
          comboTimer: comboTime,
          dinos,
          players,
          activePowerUps: [],
          earthFissures: fissures,
          secretTunnels: tunnels,
          recentCaptures: captures
        };
      });
    }, 1000 / 30);
  }, [spawnLocalDino, gameMode, selectedMap, usePowerUpLocally]);

  // Initial check for URL query room parameter (e.g. https://your-app.onrender.com?room=TREX)
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const roomParam = params.get('room');
      if (roomParam && roomParam.trim()) {
        const cleaned = roomParam.trim().toUpperCase();
        setRoomId(cleaned);
        setIsOnlineMode(true);
      }
    } catch (e) {}
  }, []);

  // Connect WebSocket for LAN 4-player online mode
  const connectWebSocket = useCallback((targetRoomId: string) => {
    try {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.close();
      }

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        ws.send(
          JSON.stringify({
            type: 'JOIN_ROOM',
            roomId: targetRoomId,
            player: {
              id: myPlayerId.current,
              name: myPlayerName,
              avatarId: myAvatar.id,
              color: myColor
            }
          })
        );
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'ROOM_STATE') {
            setRoomState(msg.state);
            setCurrentStatus(msg.state.status);
          } else if (msg.type === 'CAPTURE_SUCCESS') {
            audioEngine.playCaptureSuccess(msg.isFast, msg.points);
          } else if (msg.type === 'ROAR_EVENT') {
            audioEngine.playRoar(msg.roarType);
          }
        } catch (e) {
          console.error('WS Parse Error', e);
        }
      };

      ws.onerror = (err) => {
        console.warn('WS connection notice, ready for fallback:', err);
      };
    } catch (err) {
      console.warn('WS not available, using local simulation mode');
    }
  }, [myAvatar.id, myColor, myPlayerName]);

  // Handle Avatar Complete
  const handleAvatarSelectComplete = (
    avatar: AvatarOption,
    name: string,
    color: string,
    autoStart: boolean = false,
    selectedOnline?: boolean
  ) => {
    setMyAvatar(avatar);
    setMyPlayerName(name);
    setMyColor(color);

    const onlineTarget = selectedOnline !== undefined ? selectedOnline : isOnlineMode;
    if (selectedOnline !== undefined) {
      setIsOnlineMode(selectedOnline);
      if (selectedOnline) {
        connectWebSocket(roomId);
      }
    }

    resetLocalPlayers(localPlayerCount, avatar, name, color);

    if (onlineTarget && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'UPDATE_PLAYER',
          name,
          avatarId: avatar.id,
          color
        })
      );
    }

    if (autoStart) {
      if (onlineTarget && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: 'START_GAME',
            mode: gameMode,
            map: selectedMap,
            duration: 90
          })
        );
        setCurrentStatus('playing');
        audioEngine.startMusic();
      } else {
        startLocalMatch();
      }
    } else {
      setCurrentStatus('lobby');
    }
  };

  const handleUpdateProfile = useCallback((avatar: AvatarOption, name: string, color: string) => {
    setMyAvatar(avatar);
    setMyPlayerName(name);
    setMyColor(color);
    resetLocalPlayers(localPlayerCount, avatar, name, color);
    if (isOnlineMode && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'UPDATE_PLAYER',
          name,
          avatarId: avatar.id,
          color
        })
      );
    }
  }, [isOnlineMode, localPlayerCount, resetLocalPlayers]);

  // Local Player 1 Actions
  const handleP1Move = useCallback((vx: number, vy: number, angle: number, isBoosting: boolean = false) => {
    if (isOnlineMode && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'PLAYER_INPUT', vx, vy, angle, isBoosting }));
    } else {
      setRoomState(prev => {
        const p = prev.players[myPlayerId.current];
        if (!p) return prev;
        p.vx = vx;
        p.vy = vy;
        if (vx !== 0 || vy !== 0) p.angle = angle;
        return { ...prev };
      });
    }
  }, [isOnlineMode]);

  const handleP1Lasso = useCallback((customAngle?: number) => {
    if (isOnlineMode && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'THROW_LASSO', angle: customAngle }));
    } else {
      setRoomState(prev => {
        const p = prev.players[myPlayerId.current];
        if (p && p.lassoState === 'ready' && !p.isStunned) {
          p.lassoState = 'extending';
          p.lassoAngle = customAngle !== undefined ? customAngle : p.angle;
          p.lassoLength = 0;
          p.lassoX = p.x;
          p.lassoY = p.y;
          p.isThrowingLasso = true;
        }
        return { ...prev };
      });
    }
  }, [isOnlineMode]);

  const handleP1Boost = useCallback(() => {
    audioEngine.playBoost();
    if (isOnlineMode && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'PLAYER_INPUT', vx: 0, vy: 0, angle: 0, isBoosting: true }));
    } else {
      setRoomState(prev => {
        const p = prev.players[myPlayerId.current];
        if (p && p.boostCooldown === 0) {
          p.speedMultiplier = 1.6;
          p.boostCooldown = 120;
          setTimeout(() => {
            p.speedMultiplier = 1.0;
          }, 1200);
        }
        return { ...prev };
      });
    }
  }, [isOnlineMode]);

  const handleP1Lure = useCallback(() => {
    audioEngine.playLureDrop();
    if (isOnlineMode && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'DROP_LURE' }));
    } else {
      setRoomState(prev => {
        const p = prev.players[myPlayerId.current];
        if (p && p.lureCount > 0) {
          p.lureCount--;
          prev.lures.push({
            id: `lure_${Date.now()}`,
            x: p.x,
            y: p.y,
            ownerId: p.id,
            duration: 200,
            radius: 190
          });
        }
        return { ...prev };
      });
    }
  }, [isOnlineMode]);

  // Local Player 2 Actions (for Dual on-screen controller / split keyboard!)
  const handleP2Move = useCallback((vx: number, vy: number, angle: number, isBoosting: boolean = false) => {
    setRoomState(prev => {
      const p = prev.players['local_p2'];
      if (!p) return prev;
      p.vx = vx;
      p.vy = vy;
      if (vx !== 0 || vy !== 0) p.angle = angle;
      return { ...prev };
    });
  }, []);

  const handleP2Lasso = useCallback(() => {
    setRoomState(prev => {
      const p = prev.players['local_p2'];
      if (p && p.lassoState === 'ready' && !p.isStunned) {
        p.lassoState = 'extending';
        p.lassoAngle = p.angle;
        p.lassoLength = 0;
        p.lassoX = p.x;
        p.lassoY = p.y;
        p.isThrowingLasso = true;
      }
      return { ...prev };
    });
  }, []);

  const handleP2Boost = useCallback(() => {
    audioEngine.playBoost();
    setRoomState(prev => {
      const p = prev.players['local_p2'];
      if (p && p.boostCooldown === 0) {
        p.speedMultiplier = 1.6;
        p.boostCooldown = 120;
        setTimeout(() => {
          p.speedMultiplier = 1.0;
        }, 1200);
      }
      return { ...prev };
    });
  }, []);

  const handleP2Lure = useCallback(() => {
    audioEngine.playLureDrop();
    setRoomState(prev => {
      const p = prev.players['local_p2'];
      if (p && p.lureCount > 0) {
        p.lureCount--;
        prev.lures.push({
          id: `lure_p2_${Date.now()}`,
          x: p.x,
          y: p.y,
          ownerId: p.id,
          duration: 200,
          radius: 190
        });
      }
      return { ...prev };
    });
  }, []);

  const handleRoarEmote = useCallback((roarType: string) => {
    audioEngine.playRoar(roarType);
    if (isOnlineMode && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'ROAR_EMOTE', emoteId: roarType }));
    }
  }, [isOnlineMode]);

  // Initial local players setup on mount
  useEffect(() => {
    resetLocalPlayers(localPlayerCount, myAvatar, myPlayerName, myColor);

    // Auto-unlock AudioContext on first user interaction anywhere
    const unlockAudio = () => {
      audioEngine.playCaptureSuccess(false, 0.5);
      window.removeEventListener('pointerdown', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
    };

    window.addEventListener('pointerdown', unlockAudio, { once: true });
    window.addEventListener('keydown', unlockAudio, { once: true });
    window.addEventListener('touchstart', unlockAudio, { once: true });

    return () => {
      window.removeEventListener('pointerdown', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
    };
  }, []);

  return (
    <div id="dinosaur-app-root" className="relative flex h-screen w-screen flex-col overflow-hidden bg-slate-950 font-sans text-slate-100 select-none">
      {/* 1. AVATAR SELECTION VIEW */}
      {currentStatus === 'avatar_select' && (
        <AvatarSelect
          playerSlot={myPlayerSlot}
          initialAvatarId={myAvatar.id}
          initialPlayerName={myPlayerName}
          onSelectComplete={handleAvatarSelectComplete}
        />
      )}

      {/* 2. MULTIPLAYER & SQUAD LOBBY VIEW */}
      {currentStatus === 'lobby' && (
        <LobbyRoom
          roomId={roomId}
          isOnlineMode={isOnlineMode}
          isHost={true}
          gameMode={gameMode}
          selectedMap={selectedMap}
          players={roomState.players}
          localPlayerCount={localPlayerCount}
          currentPlayerName={myPlayerName}
          currentAvatar={myAvatar}
          currentColor={myColor}
          equippedGems={equippedGems}
          onSelectGems={handleSelectGems}
          onUpdateProfile={handleUpdateProfile}
          onSetGameMode={(mode) => {
            setGameMode(mode);
            if (isOnlineMode && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
              wsRef.current.send(JSON.stringify({ type: 'UPDATE_ROOM_CONFIG', mode }));
            }
          }}
          onSetMap={(map) => {
            setSelectedMap(map);
            if (isOnlineMode && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
              wsRef.current.send(JSON.stringify({ type: 'UPDATE_ROOM_CONFIG', map }));
            }
          }}
          onSetLocalPlayerCount={(count) => {
            setLocalPlayerCount(count);
            resetLocalPlayers(count, myAvatar, myPlayerName, myColor);
          }}
          onAddBot={() => {
            if (isOnlineMode && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
              wsRef.current.send(JSON.stringify({ type: 'ADD_BOT' }));
            } else {
              const currentCount = Object.keys(roomState.players).length;
              if (currentCount < 4) {
                const nextCount = currentCount + 1;
                setLocalPlayerCount(nextCount);
                resetLocalPlayers(nextCount, myAvatar, myPlayerName, myColor);
              }
            }
          }}
          onRemoveBot={(botId) => {
            if (isOnlineMode && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
              wsRef.current.send(JSON.stringify({ type: 'REMOVE_BOT', botId }));
            } else {
              setRoomState(prev => {
                const newP = { ...prev.players };
                delete newP[botId];
                return { ...prev, players: newP };
              });
            }
          }}
          onToggleReady={() => {}}
          onStartGame={() => {
            if (isOnlineMode) {
              if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                wsRef.current.send(JSON.stringify({ type: 'START_GAME', mode: gameMode, map: selectedMap, duration: 90 }));
                setCurrentStatus('playing');
                audioEngine.startMusic();
              } else {
                startLocalMatch();
              }
            } else {
              startLocalMatch();
            }
          }}
          onSwitchToAvatarSelect={(slot) => {
            setMyPlayerSlot(slot);
            setCurrentStatus('avatar_select');
          }}
          onSwitchModeOnlineLocal={(online) => {
            setIsOnlineMode(online);
            if (online) connectWebSocket(roomId);
          }}
          onJoinRoomByCode={(code) => {
            setRoomId(code);
            connectWebSocket(code);
          }}
          isReady={true}
        />
      )}

      {/* 3. ACTIVE GAME VIEW */}
      {currentStatus === 'playing' && (
        <div id="active-game-container" className="relative flex h-full w-full flex-col">
          {/* Main 60 FPS HTML5 Canvas */}
          <GameCanvas
            roomState={roomState}
            localPlayerId={myPlayerId.current}
            isOnlineMode={isOnlineMode}
            onSendPlayerInput={handleP1Move}
            onThrowLasso={handleP1Lasso}
            onDropLure={handleP1Lure}
            onUsePowerUp={handleP1UsePowerUp}
            onUseGem1={handleP1UseGem1}
            onUseGem2={handleP1UseGem2}
            onUseSprint={handleP1UseSprint}
            onLocalP2Input={localPlayerCount >= 2 ? handleP2Move : undefined}
            onLocalP2Lasso={localPlayerCount >= 2 ? handleP2Lasso : undefined}
            onLocalP2Lure={localPlayerCount >= 2 ? handleP2Lure : undefined}
            onLocalP2UsePowerUp={localPlayerCount >= 2 ? handleP2UsePowerUp : undefined}
            onLocalP2UseGem1={localPlayerCount >= 2 ? handleP2UseGem1 : undefined}
            onLocalP2UseGem2={localPlayerCount >= 2 ? handleP2UseGem2 : undefined}
            onLocalP2UseSprint={localPlayerCount >= 2 ? handleP2UseSprint : undefined}
          />

          {/* In-Game HUD Overlay */}
          <ScoreboardOverlay
            mode={roomState.mode}
            timeRemaining={roomState.timeRemaining}
            players={roomState.players}
            coopTeamScore={roomState.coopTeamScore}
            coopTargetScore={roomState.coopTargetScore}
            coopComboMultiplier={roomState.coopComboMultiplier}
            comboTimer={roomState.comboTimer}
            recentCaptures={roomState.recentCaptures}
            playerCount={isOnlineMode ? Object.keys(roomState.players).length : localPlayerCount}
            onSetPlayerCount={(count) => {
              if (isOnlineMode) {
                // In online mode, adjust bots to reach count
                const cur = Object.keys(roomState.players).length;
                if (count > cur && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                  for (let i = cur; i < count; i++) {
                    wsRef.current.send(JSON.stringify({ type: 'ADD_BOT' }));
                  }
                }
              } else {
                setLocalPlayerCount(count);
                resetLocalPlayers(count, myAvatar, myPlayerName, myColor);
              }
            }}
            onOpenFieldGuide={() => setIsFieldGuideOpen(true)}
            onOpenAvatarSelect={() => setIsAvatarModalOpen(true)}
            onAddBot={() => {
              if (isOnlineMode && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                wsRef.current.send(JSON.stringify({ type: 'ADD_BOT' }));
              } else {
                const currentCount = Object.keys(roomState.players).length;
                if (currentCount < 4) {
                  const nextCount = currentCount + 1;
                  setLocalPlayerCount(nextCount);
                  resetLocalPlayers(nextCount, myAvatar, myPlayerName, myColor);
                }
              }
            }}
            onRestartMatch={() => startLocalMatch()}
            onRoarEmote={handleRoarEmote}
            onToggleMute={toggleMute}
            isMuted={isMuted}
            onExitToLobby={() => {
              if (localLoopRef.current) clearInterval(localLoopRef.current);
              audioEngine.stopMusic();
              setCurrentStatus('lobby');
            }}
          />

          {/* Dual On-Screen Controllers (for Touch Devices / Tablets / 2 Local Players) */}
          <DualControllers
            onP1Move={handleP1Move}
            onP1Lasso={handleP1Lasso}
            onP1Boost={handleP1Boost}
            onP1Lure={handleP1Lure}
            onP1UsePowerUp={handleP1UsePowerUp}
            p1HeldPowerUp={roomState.players[myPlayerId.current]?.heldPowerUp}
            onP1UseGem1={handleP1UseGem1}
            onP1UseGem2={handleP1UseGem2}
            onP1UseSprint={handleP1UseSprint}
            p1EquippedGems={roomState.players[myPlayerId.current]?.equippedGems || equippedGems}
            p1GemCooldowns={roomState.players[myPlayerId.current]?.gemCooldowns}
            p1GemMaxCooldowns={roomState.players[myPlayerId.current]?.gemMaxCooldowns}
            p1Score={roomState.players[myPlayerId.current]?.score || 0}
            onP2Move={localPlayerCount >= 2 ? handleP2Move : undefined}
            onP2Lasso={localPlayerCount >= 2 ? handleP2Lasso : undefined}
            onP2Boost={localPlayerCount >= 2 ? handleP2Boost : undefined}
            onP2Lure={localPlayerCount >= 2 ? handleP2Lure : undefined}
            onP2UsePowerUp={localPlayerCount >= 2 ? handleP2UsePowerUp : undefined}
            p2HeldPowerUp={roomState.players['local_p2']?.heldPowerUp}
            onP2UseGem1={localPlayerCount >= 2 ? handleP2UseGem1 : undefined}
            onP2UseGem2={localPlayerCount >= 2 ? handleP2UseGem2 : undefined}
            onP2UseSprint={localPlayerCount >= 2 ? handleP2UseSprint : undefined}
            p2EquippedGems={roomState.players['local_p2']?.equippedGems}
            p2GemCooldowns={roomState.players['local_p2']?.gemCooldowns}
            p2GemMaxCooldowns={roomState.players['local_p2']?.gemMaxCooldowns}
            p2Score={roomState.players['local_p2']?.score || 0}
            isDualMode={localPlayerCount >= 2}
          />
        </div>
      )}

      {/* 4. GAME OVER RESULTS MODAL */}
      {currentStatus === 'gameover' && (
        <GameOverModal
          mode={roomState.mode}
          players={roomState.players}
          coopTeamScore={roomState.coopTeamScore}
          coopTargetScore={roomState.coopTargetScore}
          onRematch={() => {
            if (isOnlineMode && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
              wsRef.current.send(JSON.stringify({ type: 'RESTART_GAME' }));
            } else {
              startLocalMatch();
            }
          }}
          onReturnToLobby={() => {
            if (localLoopRef.current) clearInterval(localLoopRef.current);
            audioEngine.stopMusic();
            setCurrentStatus('lobby');
          }}
        />
      )}

      {/* Prehistoric Dino Field Guide & Roar Synthesizer Modal */}
      <FieldGuideModal
        isOpen={isFieldGuideOpen}
        onClose={() => setIsFieldGuideOpen(false)}
      />

      {/* Avatar Change In-Game Modal */}
      {isAvatarModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl border-4 border-yellow-400 bg-green-800 shadow-2xl p-4 md:p-6">
            <AvatarSelect
              playerSlot={myPlayerSlot}
              initialAvatarId={myAvatar.id}
              initialPlayerName={myPlayerName}
              onBack={() => setIsAvatarModalOpen(false)}
              onSelectComplete={(avatar, name, color) => {
                setMyAvatar(avatar);
                setMyPlayerName(name);
                setMyColor(color);
                setRoomState(prev => {
                  const p = prev.players[myPlayerId.current];
                  if (p) {
                    p.avatarId = avatar.id;
                    p.name = name;
                    p.color = color;
                  }
                  return { ...prev };
                });
                setIsAvatarModalOpen(false);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
