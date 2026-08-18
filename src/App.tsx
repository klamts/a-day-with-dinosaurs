import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  GameMode,
  GameStatus,
  MapType,
  Player,
  ActiveDinosaur,
  GameRoomState,
  AvatarOption,
  WSClientMessage,
  WSServerMessage
} from './types/game';
import { DINOSAUR_CATALOG, MAP_CONFIGS } from './data/dinosaurs';
import { AVATAR_OPTIONS, PLAYER_SLOT_COLORS } from './data/avatars';
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

  // Initialize Local Players in state
  const resetLocalPlayers = useCallback((count: number, currentAv: AvatarOption, curName: string, curCol: string) => {
    const newPlayers: Record<string, Player> = {};
    const slots = [1, 2, 3, 4] as const;

    for (let i = 0; i < count; i++) {
      const slot = slots[i];
      const pId = slot === 1 ? myPlayerId.current : `local_p${slot}`;
      const av = slot === 1 ? currentAv : AVATAR_OPTIONS[(i + 1) % AVATAR_OPTIONS.length];
      const col = slot === 1 ? curCol : PLAYER_SLOT_COLORS[slot].primary;
      const name = slot === 1 ? curName : `Ranger ${slot}`;

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
        speedMultiplier: 1.0,
        boostCooldown: 0,
        lureCount: 3,
        isStunned: false,
        stunTimer: 0,
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
  }, []);

  // Start Local Match Loop
  const startLocalMatch = useCallback(() => {
    if (localLoopRef.current) clearInterval(localLoopRef.current);

    // Populate dinosaurs
    const initialDinos: ActiveDinosaur[] = [];
    for (let i = 0; i < 12; i++) {
      initialDinos.push(spawnLocalDino());
    }

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
        p.isThrowingLasso = false;
        p.lureCount = 3;
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

        // Maintain dinos
        const dinos = [...prev.dinos];
        if (dinos.length < 12 && Math.random() < 0.04) {
          dinos.push(spawnLocalDino());
        }

        const players = { ...prev.players };
        const captures = [...prev.recentCaptures];
        let teamScore = prev.coopTeamScore;

        // Update Bot players logic
        (Object.values(players) as Player[]).forEach(p => {
          if (p.inputSource === 'bot' && !p.isStunned) {
            // AI Bot wanders toward nearest dino
            if (dinos.length > 0) {
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

          // Move player
          const speed = 4.8 * p.speedMultiplier;
          p.x += p.vx * speed;
          p.y += p.vy * speed;
          p.x = Math.max(40, Math.min(1360, p.x));
          p.y = Math.max(40, Math.min(860, p.y));

          // Lasso Mechanics
          if (p.lassoState === 'extending') {
            p.lassoLength += 16;
            p.lassoX = p.x + Math.cos(p.lassoAngle) * p.lassoLength;
            p.lassoY = p.y + Math.sin(p.lassoAngle) * p.lassoLength;

            // Check hit dino
            let hitDino: ActiveDinosaur | null = null;
            for (const d of dinos) {
              const dist = Math.hypot(d.x - p.lassoX, d.y - p.lassoY);
              if (dist < d.size + 15) {
                hitDino = d;
                break;
              }
            }

            if (hitDino) {
              p.lassoState = 'hooked';
              p.lassoTargetDinoId = hitDino.instanceId;
              hitDino.state = 'being_captured';
              if (!hitDino.capturingPlayerIds.includes(p.id)) {
                hitDino.capturingPlayerIds.push(p.id);
              }
            } else if (p.lassoLength >= p.lassoMaxLength) {
              p.lassoState = 'returning';
            }
          } else if (p.lassoState === 'hooked') {
            const hookedDino = dinos.find(d => d.instanceId === p.lassoTargetDinoId);
            if (hookedDino) {
              p.lassoX = hookedDino.x;
              p.lassoY = hookedDino.y;
              p.lassoLength = Math.hypot(hookedDino.x - p.x, hookedDino.y - p.y);

              const pullAngle = Math.atan2(p.y - hookedDino.y, p.x - hookedDino.x);
              hookedDino.x += Math.cos(pullAngle) * 7.5;
              hookedDino.y += Math.sin(pullAngle) * 7.5;

              const dist = Math.hypot(p.x - hookedDino.x, p.y - hookedDino.y);
              if (dist < 45) {
                // CAPTURE!
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
            } else {
              p.lassoX = p.x + Math.cos(p.lassoAngle) * p.lassoLength;
              p.lassoY = p.y + Math.sin(p.lassoAngle) * p.lassoLength;
            }
          }
        });

        // Update dinos AI
        dinos.forEach(d => {
          d.animationTick += 0.2;
          if (d.state !== 'being_captured') {
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
          d.x += d.vx;
          d.y += d.vy;
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
          recentCaptures: captures
        };
      });
    }, 1000 / 30);
  }, [spawnLocalDino, gameMode, selectedMap]);

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
            onLocalP2Input={localPlayerCount >= 2 ? handleP2Move : undefined}
            onLocalP2Lasso={localPlayerCount >= 2 ? handleP2Lasso : undefined}
            onLocalP2Lure={localPlayerCount >= 2 ? handleP2Lure : undefined}
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
            onP2Move={localPlayerCount >= 2 ? handleP2Move : undefined}
            onP2Lasso={localPlayerCount >= 2 ? handleP2Lasso : undefined}
            onP2Boost={localPlayerCount >= 2 ? handleP2Boost : undefined}
            onP2Lure={localPlayerCount >= 2 ? handleP2Lure : undefined}
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
