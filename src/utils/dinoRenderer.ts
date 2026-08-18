import { ActiveDinosaur, ActivePowerUp, EarthFissure, SecretTunnel, TidalWave, HomeBase, Player, PowerUpType } from '../types/game';
import { DINOSAUR_CATALOG, MAP_CONFIGS } from '../data/dinosaurs';
import { AVATAR_OPTIONS } from '../data/avatars';

export function drawTidalWaves(
  ctx: CanvasRenderingContext2D,
  tidalWaves: TidalWave[],
  timeTick: number
) {
  if (!tidalWaves || tidalWaves.length === 0) return;

  tidalWaves.forEach((w) => {
    ctx.save();
    ctx.translate(w.x, w.y);
    ctx.rotate(w.angle);

    const alpha = Math.max(0, Math.min(1, w.life / 20));
    const width = w.width || 120; // 3 ô = 120px width
    const length = w.length || 400; // 10 ô = 400px length

    // 1. Water Surge Body Area (Wave Length x Width bounding box)
    const surgeGrad = ctx.createLinearGradient(-length / 2, 0, length / 2, 0);
    surgeGrad.addColorStop(0, `rgba(2, 132, 199, 0)`);
    surgeGrad.addColorStop(0.2, `rgba(14, 165, 233, ${0.45 * alpha})`);
    surgeGrad.addColorStop(0.7, `rgba(56, 189, 248, ${0.75 * alpha})`);
    surgeGrad.addColorStop(1, `rgba(224, 242, 254, ${0.92 * alpha})`);

    ctx.fillStyle = surgeGrad;
    ctx.beginPath();
    ctx.roundRect(-length / 2, -width / 2, length, width, 16);
    ctx.fill();

    // 2. Streamline currents showing forward sweep vector along the 10-tile length
    const streamRows = 5;
    for (let i = 0; i < streamRows; i++) {
      const yPos = -width / 2 + (i + 0.5) * (width / streamRows);
      const wavePhase = Math.sin(timeTick * 0.4 + i * 1.2) * 6;
      
      ctx.strokeStyle = `rgba(255, 255, 255, ${0.65 * alpha})`;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(-length / 2 + 15, yPos + wavePhase);
      ctx.lineTo(length / 2 - 10, yPos);
      ctx.stroke();

      // Forward arrow chevrons indicating push direction from back to front
      const arrowSteps = 4;
      for (let s = 1; s <= arrowSteps; s++) {
        const arrowX = -length / 2 + (s / (arrowSteps + 1)) * length;
        ctx.strokeStyle = `rgba(255, 255, 255, ${0.85 * alpha})`;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(arrowX - 12, yPos - 5);
        ctx.lineTo(arrowX, yPos);
        ctx.lineTo(arrowX - 12, yPos + 5);
        ctx.stroke();
      }
    }

    // 3. Front Crashing Wave Crest (Foam & Spray)
    ctx.strokeStyle = `rgba(255, 255, 255, ${0.98 * alpha})`;
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(length / 2, -width / 2);
    ctx.lineTo(length / 2, width / 2);
    ctx.stroke();

    // Foaming water droplets along front crest
    const dropCount = 10;
    for (let d = 0; d < dropCount; d++) {
      const dy = -width / 2 + (d / (dropCount - 1)) * width;
      const dx = length / 2 + Math.sin(timeTick * 0.6 + d) * 10 + 4;
      ctx.fillStyle = `rgba(255, 255, 255, ${0.95 * alpha})`;
      ctx.beginPath();
      ctx.arc(dx, dy, 5, 0, Math.PI * 2);
      ctx.fill();
    }

    // 4. Central Wave Badge
    ctx.fillStyle = 'rgba(2, 132, 199, 0.9)';
    ctx.beginPath();
    ctx.roundRect(-24, -16, 48, 32, 8);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.font = '16px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🌊', 0, 0);

    ctx.restore();
  });
}

export function drawHomeBases(
  ctx: CanvasRenderingContext2D,
  homeBases: HomeBase[],
  timeTick: number
) {
  if (!homeBases || homeBases.length === 0) return;

  homeBases.forEach((base) => {
    ctx.save();

    // Outer corral boundary glow
    const pulse = Math.sin(timeTick * 0.05 + base.slotNumber) * 4;
    ctx.fillStyle = `${base.color}22`; // transparent tint
    ctx.strokeStyle = base.color;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(base.x, base.y, base.radius + pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Inner patterned pasture
    ctx.fillStyle = `${base.color}33`;
    ctx.beginPath();
    ctx.arc(base.x, base.y, base.radius * 0.75, 0, Math.PI * 2);
    ctx.fill();

    // Wooden fence posts around perimeter
    const postCount = 12;
    for (let i = 0; i < postCount; i++) {
      const angle = (i / postCount) * Math.PI * 2 + (timeTick * 0.005);
      const px = base.x + Math.cos(angle) * base.radius;
      const py = base.y + Math.sin(angle) * base.radius;
      ctx.fillStyle = '#78350f'; // wood fence
      ctx.beginPath();
      ctx.arc(px, py, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    // Home Corral Center Icon & Tag
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.roundRect(base.x - 45, base.y - 18, 90, 36, 10);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`🏡 ${base.label}`, base.x, base.y + 4);

    // Arrow guide pulse in Competitive mode
    ctx.fillStyle = base.color;
    ctx.font = 'bold 9px sans-serif';
    ctx.fillText('KÉO VỀ ĐÂY', base.x, base.y + 26);

    ctx.restore();
  });
}

export function drawActivePowerUps(
  ctx: CanvasRenderingContext2D,
  powerUps: ActivePowerUp[],
  timeTick: number
) {
  if (!powerUps || powerUps.length === 0) return;

  const emojiMap: Record<PowerUpType, string> = {
    tidal_wave: '🌊',
    net_trap: '🕸️',
    speed_boost: '⚡',
    titan_strength: '💪',
    secret_tunnel: '🌀',
    dino_call: '📢',
    earth_fissure: '🌋',
    stun_shockwave: '💫',
    tornado_gust: '🌪️'
  };

  const nameMap: Record<PowerUpType, string> = {
    tidal_wave: 'Thủy Triều',
    net_trap: 'Lưới Cá',
    speed_boost: 'Chạy Nhanh',
    titan_strength: 'Sức Mạnh',
    secret_tunnel: 'Đường Hầm',
    dino_call: 'Gọi Khủng Long',
    earth_fissure: 'Rãnh Nứt',
    stun_shockwave: 'Choáng',
    tornado_gust: 'Gió Lốc'
  };

  powerUps.forEach((pu) => {
    ctx.save();
    const floatY = Math.sin(timeTick * 0.1 + pu.x) * 6;
    const y = pu.y + floatY;

    // Glowing aura circle
    const glowSize = 22 + Math.sin(timeTick * 0.15) * 3;
    const grad = ctx.createRadialGradient(pu.x, y, 5, pu.x, y, glowSize);
    grad.addColorStop(0, 'rgba(250, 204, 21, 0.9)');
    grad.addColorStop(0.5, 'rgba(234, 88, 12, 0.6)');
    grad.addColorStop(1, 'rgba(234, 88, 12, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(pu.x, y, glowSize, 0, Math.PI * 2);
    ctx.fill();

    // Mystery Crystal Box
    ctx.fillStyle = '#f59e0b';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(pu.x, y, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Skill Emoji
    ctx.font = '16px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(emojiMap[pu.type] || '❓', pu.x, y);

    // Label tag
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.beginPath();
    ctx.roundRect(pu.x - 36, y + 22, 72, 16, 4);
    ctx.fill();

    ctx.fillStyle = '#fef08a';
    ctx.font = 'bold 9px sans-serif';
    ctx.fillText(nameMap[pu.type] || 'SKILL', pu.x, y + 33);

    ctx.restore();
  });
}

export function drawEarthFissures(
  ctx: CanvasRenderingContext2D,
  fissures: EarthFissure[],
  timeTick: number
) {
  if (!fissures || fissures.length === 0) return;

  fissures.forEach((f) => {
    ctx.save();
    
    // 1. Outer Magma Heat Aura Glow
    const pulse = Math.sin(timeTick * 0.2) * 3;
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.35)';
    ctx.lineWidth = 32 + pulse;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(f.x1, f.y1);
    ctx.lineTo(f.x2, f.y2);
    ctx.stroke();

    // 2. Deep Volcanic Trench (Black / Dark Red Base)
    ctx.strokeStyle = '#450a0a';
    ctx.lineWidth = 18;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(f.x1, f.y1);
    ctx.lineTo(f.x2, f.y2);
    ctx.stroke();

    // 3. Glowing Molten Lava Core (Red -> Orange -> Bright Yellow)
    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = 12;
    ctx.beginPath();
    ctx.moveTo(f.x1, f.y1);
    ctx.lineTo(f.x2, f.y2);
    ctx.stroke();

    ctx.strokeStyle = '#f97316';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(f.x1, f.y1);
    ctx.lineTo(f.x2, f.y2);
    ctx.stroke();

    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(f.x1, f.y1);
    ctx.lineTo(f.x2, f.y2);
    ctx.stroke();

    // 4. Volcanic Spike Pillars at both endpoints
    [ { x: f.x1, y: f.y1 }, { x: f.x2, y: f.y2 } ].forEach((pt) => {
      ctx.fillStyle = '#7f1d1d';
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 4, 0, Math.PI * 2);
      ctx.fill();
    });

    // 5. Fire Embers Floating Upward
    const sparkCount = 4;
    for (let s = 0; s < sparkCount; s++) {
      const t = (s + 0.5) / sparkCount;
      const sx = f.x1 + (f.x2 - f.x1) * t + Math.sin(timeTick * 0.4 + s) * 6;
      const sy = f.y1 + (f.y2 - f.y1) * t - (timeTick * 1.5 + s * 10) % 24;
      ctx.fillStyle = s % 2 === 0 ? '#fbbf24' : '#ef4444';
      ctx.beginPath();
      ctx.arc(sx, sy, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // 6. Central Barrier Warning Badge
    const midX = (f.x1 + f.x2) / 2;
    const midY = (f.y1 + f.y2) / 2;
    
    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.beginPath();
    ctx.roundRect(midX - 60, midY - 14, 120, 28, 8);
    ctx.fill();
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#fef08a';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('⛔ VÁCH NGĂN ĐỊA TẦNG', midX, midY);

    ctx.restore();
  });
}

export function drawSecretTunnels(
  ctx: CanvasRenderingContext2D,
  tunnels: SecretTunnel[],
  timeTick: number
) {
  if (!tunnels || tunnels.length === 0) return;

  tunnels.forEach((st) => {
    ctx.save();
    // Swirling Portal vortex
    const rot = timeTick * 0.1;
    ctx.translate(st.x, st.y);
    ctx.rotate(rot);

    ctx.fillStyle = 'rgba(147, 51, 234, 0.4)';
    ctx.beginPath();
    ctx.ellipse(0, 0, 36, 20, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#a855f7';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, 0, 20, 10, Math.PI / 4, 0, Math.PI * 2);
    ctx.stroke();

    ctx.rotate(-rot);
    ctx.fillStyle = '#ffffff';
    ctx.font = '18px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🌀', 0, 6);

    ctx.fillStyle = '#c084fc';
    ctx.font = 'bold 10px sans-serif';
    ctx.fillText('ĐƯỜNG HẦM VỀ NHÀ', 0, 32);

    ctx.restore();
  });
}

export function drawTetherRope(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: string,
  isTitan: boolean = false
) {
  ctx.save();
  ctx.strokeStyle = isTitan ? '#ef4444' : color;
  ctx.lineWidth = isTitan ? 6 : 3;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();

  // Energy rings along rope
  const dist = Math.hypot(x2 - x1, y2 - y1);
  const segments = Math.floor(dist / 30);
  for (let i = 1; i <= segments; i++) {
    const t = i / (segments + 1);
    const rx = x1 + (x2 - x1) * t;
    const ry = y1 + (y2 - y1) * t;
    ctx.fillStyle = isTitan ? '#fbbf24' : '#ffffff';
    ctx.beginPath();
    ctx.arc(rx, ry, isTitan ? 4 : 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

export function drawPrehistoricMap(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  mapType: 'jurassic_jungle' | 'volcanic_valley' | 'crystal_river',
  timeTick: number
) {
  const cfg = MAP_CONFIGS[mapType] || MAP_CONFIGS.jurassic_jungle;

  // Background ground
  ctx.fillStyle = cfg.groundColor;
  ctx.fillRect(0, 0, width, height);

  // Prehistoric Terrain Grid & Foliage / Lava Streams
  ctx.strokeStyle = cfg.gridColor;
  ctx.lineWidth = 1;
  const gridSize = 60;
  for (let x = 0; x < width; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 0; y < height; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  // Prehistoric decorative features (trees/rocks/lava streams)
  if (mapType === 'jurassic_jungle') {
    // Ancient giant ferns and cycads
    const trees = [
      { x: 180, y: 140, r: 45 },
      { x: 700, y: 120, r: 55 },
      { x: 1200, y: 180, r: 50 },
      { x: 150, y: 750, r: 60 },
      { x: 800, y: 780, r: 55 },
      { x: 1250, y: 720, r: 50 },
      { x: 450, y: 480, r: 35 },
      { x: 950, y: 460, r: 40 }
    ];

    trees.forEach(t => {
      // Tree shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
      ctx.beginPath();
      ctx.ellipse(t.x + 8, t.y + 8, t.r, t.r * 0.75, 0, 0, Math.PI * 2);
      ctx.fill();

      // Tree foliage layers with subtle breeze animation
      const breeze = Math.sin(timeTick * 0.03 + t.x) * 3;
      ctx.fillStyle = cfg.foliageColor;
      ctx.beginPath();
      ctx.arc(t.x + breeze, t.y, t.r, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#22c55e';
      ctx.beginPath();
      ctx.arc(t.x + breeze * 0.7 - 5, t.y - 6, t.r * 0.65, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#86efac';
      ctx.beginPath();
      ctx.arc(t.x + breeze * 0.4 - 10, t.y - 12, t.r * 0.35, 0, Math.PI * 2);
      ctx.fill();
    });

    // Central ancient watering hole
    ctx.fillStyle = 'rgba(2, 132, 199, 0.45)';
    ctx.beginPath();
    ctx.ellipse(700, 480, 140, 75, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.stroke();

  } else if (mapType === 'volcanic_valley') {
    // Volcanic vents and lava cracks
    ctx.fillStyle = 'rgba(220, 38, 38, 0.4)';
    ctx.beginPath();
    ctx.ellipse(700, 450, 160, 90, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#f97316';
    ctx.beginPath();
    ctx.ellipse(700, 450, 110, 55, 0, 0, Math.PI * 2);
    ctx.fill();

    // Lava glow pulse
    const pulse = (Math.sin(timeTick * 0.05) + 1) * 0.5;
    ctx.fillStyle = `rgba(254, 240, 138, ${0.4 + pulse * 0.3})`;
    ctx.beginPath();
    ctx.ellipse(700, 450, 60, 25, 0, 0, Math.PI * 2);
    ctx.fill();

    // Ash rocks
    const rocks = [
      { x: 220, y: 200, r: 35 },
      { x: 1180, y: 220, r: 40 },
      { x: 280, y: 700, r: 45 },
      { x: 1100, y: 740, r: 38 }
    ];
    rocks.forEach(r => {
      ctx.fillStyle = '#1c1917';
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#44403c';
      ctx.beginPath();
      ctx.arc(r.x - 4, r.y - 4, r.r * 0.7, 0, Math.PI * 2);
      ctx.fill();
    });
  } else {
    // Crystal River Delta
    ctx.fillStyle = 'rgba(2, 132, 199, 0.55)';
    ctx.beginPath();
    ctx.moveTo(0, 350);
    ctx.bezierCurveTo(400, 300, 800, 550, width, 480);
    ctx.lineTo(width, 580);
    ctx.bezierCurveTo(800, 650, 400, 400, 0, 450);
    ctx.closePath();
    ctx.fill();
  }

  // Prehistoric Boundary Hazard Fencing
  ctx.strokeStyle = 'rgba(249, 115, 22, 0.4)';
  ctx.lineWidth = 4;
  ctx.strokeRect(10, 10, width - 20, height - 20);
}

export function drawDinosaur(
  ctx: CanvasRenderingContext2D,
  dino: ActiveDinosaur,
  timeTick: number
) {
  const def = DINOSAUR_CATALOG.find(d => d.id === dino.defId) || DINOSAUR_CATALOG[0];

  ctx.save();
  ctx.translate(dino.x, dino.y);

  // Rotate towards movement direction
  ctx.rotate(dino.angle);

  const scale = (def.scale || 1.0) * (dino.isRareGolden ? 1.2 : 1.0);
  ctx.scale(scale, scale);

  // Shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
  ctx.beginPath();
  ctx.ellipse(0, 14, 22, 10, 0, 0, Math.PI * 2);
  ctx.fill();

  // Walking leg wiggle
  const walkPhase = Math.sin(dino.animationTick * 3);
  const tailWiggle = Math.sin(dino.animationTick * 2.2) * 6;

  // Rare Golden Glow
  if (dino.isRareGolden) {
    ctx.shadowColor = '#fbbf24';
    ctx.shadowBlur = 16;
  }

  const primColor = dino.isRareGolden ? '#fbbf24' : def.primaryColor;
  const secColor = dino.isRareGolden ? '#d97706' : def.secondaryColor;
  const accColor = dino.isRareGolden ? '#fef08a' : def.accentColor;

  // Render specific dinosaur species geometry
  switch (dino.defId) {
    case 'brachiosaurus': {
      // Long tail
      ctx.strokeStyle = secColor;
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.moveTo(-15, 0);
      ctx.quadraticCurveTo(-32, tailWiggle, -46, tailWiggle * 1.4);
      ctx.stroke();

      // Colossal Body
      ctx.fillStyle = primColor;
      ctx.beginPath();
      ctx.ellipse(0, 0, 24, 16, 0, 0, Math.PI * 2);
      ctx.fill();

      // Giant Pillars Legs
      ctx.fillStyle = secColor;
      ctx.fillRect(-12, 10 + walkPhase * 4, 7, 14);
      ctx.fillRect(8, 10 - walkPhase * 4, 7, 14);

      // Long Neck & Head
      ctx.strokeStyle = primColor;
      ctx.lineWidth = 11;
      ctx.beginPath();
      ctx.moveTo(14, -2);
      ctx.quadraticCurveTo(28, -18, 38, -26);
      ctx.stroke();

      // Head
      ctx.fillStyle = primColor;
      ctx.beginPath();
      ctx.ellipse(40, -28, 9, 6, Math.PI / 6, 0, Math.PI * 2);
      ctx.fill();

      // Eye
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(42, -29, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.arc(42.5, -29, 1.2, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'stegosaurus': {
      // Body
      ctx.fillStyle = primColor;
      ctx.beginPath();
      ctx.ellipse(0, 0, 20, 13, 0, 0, Math.PI * 2);
      ctx.fill();

      // Back plates (diamond shaped)
      ctx.fillStyle = accColor;
      for (let i = -14; i <= 14; i += 7) {
        ctx.beginPath();
        ctx.moveTo(i, -12);
        ctx.lineTo(i + 3, -22);
        ctx.lineTo(i + 6, -12);
        ctx.closePath();
        ctx.fill();
      }

      // Spiked Tail (Thagomizer)
      ctx.strokeStyle = secColor;
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.moveTo(-16, 0);
      ctx.lineTo(-34, tailWiggle);
      ctx.stroke();

      // Tail spikes
      ctx.strokeStyle = '#fef08a';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-32, tailWiggle);
      ctx.lineTo(-38, tailWiggle - 8);
      ctx.moveTo(-32, tailWiggle);
      ctx.lineTo(-38, tailWiggle + 8);
      ctx.stroke();

      // Head & legs
      ctx.fillStyle = primColor;
      ctx.beginPath();
      ctx.ellipse(22, 2, 7, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'velociraptor': {
      // Agile bipedal body
      ctx.fillStyle = primColor;
      ctx.beginPath();
      ctx.ellipse(2, 0, 16, 8, 0, 0, Math.PI * 2);
      ctx.fill();

      // Dynamic Feathered / Whipping Tail
      ctx.strokeStyle = secColor;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(-12, 0);
      ctx.quadraticCurveTo(-26, tailWiggle * 1.5, -38, tailWiggle * 2.2);
      ctx.stroke();

      // Feather fan on tail
      ctx.fillStyle = accColor;
      ctx.beginPath();
      ctx.ellipse(-34, tailWiggle * 1.8, 8, 4, 0, 0, Math.PI * 2);
      ctx.fill();

      // Running Legs & Sickle Claw
      ctx.strokeStyle = secColor;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, 6);
      ctx.lineTo(walkPhase * 6, 16);
      ctx.lineTo(walkPhase * 6 + 6, 16);
      ctx.stroke();

      // Sharp Head with open toothy snout
      ctx.fillStyle = primColor;
      ctx.beginPath();
      ctx.moveTo(14, -4);
      ctx.lineTo(26, -2);
      ctx.lineTo(26, 4);
      ctx.lineTo(14, 5);
      ctx.closePath();
      ctx.fill();

      // Piercing Yellow Eye
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(19, -1, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.arc(19.5, -1, 1.2, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'pterodactyl': {
      // Flying Wingspan
      const wingFlap = Math.sin(timeTick * 0.18) * 12;
      ctx.fillStyle = primColor;
      // Left Wing
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-6, -28 + wingFlap);
      ctx.lineTo(12, -18 + wingFlap * 0.6);
      ctx.closePath();
      ctx.fill();

      // Right Wing
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-6, 28 - wingFlap);
      ctx.lineTo(12, 18 - wingFlap * 0.6);
      ctx.closePath();
      ctx.fill();

      // Torso & Crested Head
      ctx.fillStyle = secColor;
      ctx.beginPath();
      ctx.ellipse(2, 0, 10, 5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Long Beak & Head Crest
      ctx.fillStyle = accColor;
      ctx.beginPath();
      ctx.moveTo(8, -2);
      ctx.lineTo(26, 0);
      ctx.lineTo(8, 2);
      ctx.lineTo(0, -7); // crest
      ctx.closePath();
      ctx.fill();
      break;
    }

    case 'tyrannosaurus': {
      // Apex Boss T-Rex: Muscular heavy body
      ctx.fillStyle = primColor;
      ctx.beginPath();
      ctx.ellipse(0, 0, 26, 16, 0, 0, Math.PI * 2);
      ctx.fill();

      // Powerful Tail
      ctx.strokeStyle = secColor;
      ctx.lineWidth = 12;
      ctx.beginPath();
      ctx.moveTo(-18, 0);
      ctx.quadraticCurveTo(-38, tailWiggle, -52, tailWiggle * 1.2);
      ctx.stroke();

      // Massive Heavy Head & Jaws
      ctx.fillStyle = primColor;
      ctx.beginPath();
      ctx.roundRect(16, -10, 18, 16, 4);
      ctx.fill();

      // Sharp Teeth
      ctx.fillStyle = '#ffffff';
      for (let tx = 20; tx <= 30; tx += 3) {
        ctx.beginPath();
        ctx.moveTo(tx, 3);
        ctx.lineTo(tx + 1.5, 6);
        ctx.lineTo(tx + 3, 3);
        ctx.fill();
      }

      // Glowing Fierce Eye
      ctx.fillStyle = '#fde047';
      ctx.beginPath();
      ctx.arc(24, -4, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.arc(24.5, -4, 1.5, 0, Math.PI * 2);
      ctx.fill();

      // Tiny Arms
      ctx.strokeStyle = secColor;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(12, 4);
      ctx.lineTo(16, 8);
      ctx.stroke();
      break;
    }

    default: {
      // Generic Quadruped / Herbivore / Runner
      ctx.fillStyle = primColor;
      ctx.beginPath();
      ctx.ellipse(0, 0, 18, 11, 0, 0, Math.PI * 2);
      ctx.fill();

      // Tail
      ctx.strokeStyle = secColor;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(-14, 0);
      ctx.lineTo(-30, tailWiggle);
      ctx.stroke();

      // Head
      ctx.fillStyle = primColor;
      ctx.beginPath();
      ctx.ellipse(18, 0, 8, 6, 0, 0, Math.PI * 2);
      ctx.fill();

      // Eye
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(20, -2, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.arc(20.5, -2, 1, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
  }

  // Restore rotation
  ctx.restore();

  // Overhead points badge & speed indicator
  ctx.save();
  ctx.translate(dino.x, dino.y - dino.size - 10);

  // Category Tag
  const isFast = def.speedCategory === 'fast' || def.speedCategory === 'apex';
  ctx.fillStyle = isFast ? '#dc2626' : '#15803d';
  ctx.beginPath();
  ctx.roundRect(-24, -10, 48, 16, 4);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 10px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`${def.points} PTS`, 0, 2);

  // If Boss dino, draw health pips
  if (dino.maxHealth && dino.maxHealth > 1) {
    const pips = dino.maxHealth;
    const current = dino.health || 1;
    for (let p = 0; p < pips; p++) {
      ctx.fillStyle = p < current ? '#e11d48' : '#4b5563';
      ctx.beginPath();
      ctx.arc(-10 + p * 10, -14, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
}

export function drawPlayer(
  ctx: CanvasRenderingContext2D,
  player: Player,
  timeTick: number,
  isControlledLocal: boolean = false
) {
  const avatar = AVATAR_OPTIONS.find(a => a.id === player.avatarId) || AVATAR_OPTIONS[0];

  // 1. Draw Titan Strength Aura (Flaming Red/Orange Ring)
  const isTitan = player.activeBuffs && player.activeBuffs.titanStrengthTimer > 0;
  if (isTitan) {
    ctx.save();
    const auraPulse = Math.sin(timeTick * 0.2) * 5;
    ctx.fillStyle = 'rgba(239, 68, 68, 0.35)';
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(player.x, player.y, 28 + auraPulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ef4444';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🔥 TITAN 🔥', player.x, player.y - 42);
    ctx.restore();
  }

  // 2. Draw Speed Boost Trail / Aura
  const isSpeeding = player.activeBuffs && player.activeBuffs.speedTimer > 0;
  if (isSpeeding) {
    ctx.save();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 3;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.arc(player.x, player.y, 22, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // 3. Draw Dino Call Sound Waves
  const isDinoCalling = player.activeBuffs && player.activeBuffs.dinoCallTimer > 0;
  if (isDinoCalling) {
    ctx.save();
    const waveR = (timeTick * 3) % 60;
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(player.x, player.y, 20 + waveR, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // Draw Lasso Line if active
  if (player.lassoState !== 'ready') {
    ctx.save();
    ctx.strokeStyle = isTitan ? '#ef4444' : player.color;
    ctx.lineWidth = isTitan ? 5 : 3;
    ctx.beginPath();
    ctx.moveTo(player.x, player.y);
    ctx.lineTo(player.lassoX, player.lassoY);
    ctx.stroke();

    // Lasso loop / electric net effect at tip
    ctx.fillStyle = isTitan ? '#ef4444' : player.color;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    const spin = timeTick * 0.2;
    ctx.ellipse(player.lassoX, player.lassoY, 14, 8, spin, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  ctx.save();
  ctx.translate(player.x, player.y);

  // Highlight ring for local player
  if (isControlledLocal) {
    ctx.strokeStyle = player.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 24, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.beginPath();
  ctx.ellipse(0, 12, 14, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  // Rotate avatar towards motion angle
  ctx.rotate(player.angle);

  // Player Body (Ranger suit)
  ctx.fillStyle = player.color;
  ctx.beginPath();
  ctx.arc(0, 0, 12, 0, Math.PI * 2);
  ctx.fill();

  // Armor vest / gear
  ctx.fillStyle = '#1e293b';
  ctx.beginPath();
  ctx.arc(0, 0, 7, 0, Math.PI * 2);
  ctx.fill();

  // Ranger Head
  ctx.fillStyle = avatar.skinTone;
  ctx.beginPath();
  ctx.arc(6, 0, 6, 0, Math.PI * 2);
  ctx.fill();

  // Hair / Visor / Cap
  ctx.fillStyle = avatar.primaryColor;
  ctx.beginPath();
  ctx.arc(6, -2, 5, 0, Math.PI);
  ctx.fill();

  // Hands / Tracker gadget
  ctx.fillStyle = player.color;
  ctx.beginPath();
  ctx.arc(10, 6, 3, 0, Math.PI * 2);
  ctx.arc(10, -6, 3, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();

  // 4. Draw Net Trapped Web Mesh
  if (player.isNetTrapped) {
    ctx.save();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let r = 8; r <= 24; r += 8) {
      ctx.arc(player.x, player.y, r, 0, Math.PI * 2);
    }
    ctx.stroke();

    ctx.fillStyle = '#ef4444';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🕸️ BỊ TRÓI LƯỚI 🕸️', player.x, player.y - 34);
    ctx.restore();
  }

  // 5. Draw Stunned Stars
  if (player.isStunned) {
    ctx.save();
    const starRot = timeTick * 0.15;
    for (let i = 0; i < 3; i++) {
      const sAngle = starRot + (i * Math.PI * 2) / 3;
      const sx = player.x + Math.cos(sAngle) * 18;
      const sy = player.y - 15 + Math.sin(sAngle) * 6;
      ctx.fillStyle = '#fde047';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('⭐', sx, sy);
    }
    ctx.restore();
  }

  // Overhead Player Tag & Slot indicator
  ctx.save();
  ctx.translate(player.x, player.y - 26);
  ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
  ctx.beginPath();
  ctx.roundRect(-34, -10, 68, 16, 4);
  ctx.fill();

  ctx.fillStyle = player.color;
  ctx.font = 'bold 10px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`P${player.slotNumber}: ${player.name.substring(0, 8)}`, 0, 2);

  // Held skill badge if any
  if (player.heldPowerUp) {
    const skillEmoji: Record<string, string> = {
      tidal_wave: '🌊',
      net_trap: '🕸️',
      speed_boost: '⚡',
      titan_strength: '💪',
      secret_tunnel: '🌀',
      dino_call: '📢',
      earth_fissure: '🌋',
      stun_shockwave: '💫',
      tornado_gust: '🌪️'
    };
    ctx.fillStyle = '#fbbf24';
    ctx.font = '12px sans-serif';
    ctx.fillText(skillEmoji[player.heldPowerUp] || '⭐', 28, 2);
  }

  ctx.restore();
}

export function drawSkillAimIndicator(
  ctx: CanvasRenderingContext2D,
  player: Player,
  skillType: PowerUpType,
  timeTick: number,
  homeBase?: HomeBase
) {
  if (!player || !skillType) return;
  const angle = player.angle || 0;
  const pulse = Math.sin(timeTick * 0.15);

  ctx.save();

  switch (skillType) {
    case 'tidal_wave': {
      // 3 ô ngang = 120px, 10 ô dài = 400px, sweeps from behind (-180) to front
      const width = 120;
      const length = 400;
      // The wave starts at player.x - cos(angle)*180 and ends at player.x + cos(angle)*220
      const centerDist = 20; // center of the 400px box is at -180 + 200 = +20px relative to player
      const cx = player.x + Math.cos(angle) * centerDist;
      const cy = player.y + Math.sin(angle) * centerDist;

      ctx.translate(cx, cy);
      ctx.rotate(angle);

      // Area fill
      const grad = ctx.createLinearGradient(-length / 2, 0, length / 2, 0);
      grad.addColorStop(0, 'rgba(14, 165, 233, 0.1)');
      grad.addColorStop(0.5, `rgba(14, 165, 233, ${0.3 + pulse * 0.08})`);
      grad.addColorStop(1, `rgba(56, 189, 248, ${0.45 + pulse * 0.1})`);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(-length / 2, -width / 2, length, width, 12);
      ctx.fill();

      // Border with animated dashed neon
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2.5;
      ctx.setLineDash([8, 6]);
      ctx.lineDashOffset = -timeTick * 1.5;
      ctx.strokeRect(-length / 2, -width / 2, length, width);
      ctx.setLineDash([]);

      // Chevrons along length
      const chevronSteps = 5;
      for (let s = 1; s <= chevronSteps; s++) {
        const xPos = -length / 2 + (s / (chevronSteps + 1)) * length;
        ctx.strokeStyle = `rgba(255, 255, 255, ${0.6 + pulse * 0.2})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(xPos - 14, -20);
        ctx.lineTo(xPos, 0);
        ctx.lineTo(xPos - 14, 20);
        ctx.stroke();
      }

      // Front Wave Crest Marker
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(length / 2, -width / 2);
      ctx.lineTo(length / 2, width / 2);
      ctx.stroke();

      // Dimension & Cast Label
      ctx.rotate(-angle); // unrotate for readable text
      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.beginPath();
      ctx.roundRect(-140, -width / 2 - 28, 280, 24, 6);
      ctx.fill();
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('🌊 THỦY TRIỀU (3 × 10 Ô) - NHẤN LẦN 2 ĐỂ PHÓNG!', 0, -width / 2 - 12);
      break;
    }
    case 'earth_fissure': {
      // 14 ô = 560px total length barrier line perpendicular to facing angle, 45px ahead
      const perpAngle = angle + Math.PI / 2;
      const halfLength = 280;
      const cx = player.x + Math.cos(angle) * 45;
      const cy = player.y + Math.sin(angle) * 45;
      const x1 = cx - Math.cos(perpAngle) * halfLength;
      const y1 = cy - Math.sin(perpAngle) * halfLength;
      const x2 = cx + Math.cos(perpAngle) * halfLength;
      const y2 = cy + Math.sin(perpAngle) * halfLength;

      // Outer Danger Glow
      ctx.strokeStyle = `rgba(239, 68, 68, ${0.35 + pulse * 0.1})`;
      ctx.lineWidth = 36;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();

      // Molten core line
      ctx.strokeStyle = '#f97316';
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();

      // Dashed hazard line
      ctx.strokeStyle = '#fef08a';
      ctx.lineWidth = 3;
      ctx.setLineDash([10, 8]);
      ctx.lineDashOffset = -timeTick * 1.5;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      ctx.setLineDash([]);

      // Endpoint Volcanic Totems
      [ { x: x1, y: y1 }, { x: x2, y: y2 } ].forEach(pt => {
        ctx.fillStyle = '#dc2626';
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#fef08a';
        ctx.lineWidth = 2;
        ctx.stroke();
      });

      // Label
      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.beginPath();
      ctx.roundRect(cx - 150, cy - 36, 300, 24, 6);
      ctx.fill();
      ctx.strokeStyle = '#f97316';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = '#f97316';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('🌋 VÁCH RÃNH NỨT (14 Ô) - NHẤN LẦN 2 ĐỂ TẠO!', cx, cy - 20);
      break;
    }
    case 'net_trap': {
      const radius = 450;
      // Radial circle around player
      ctx.fillStyle = `rgba(139, 92, 246, ${0.15 + pulse * 0.05})`;
      ctx.beginPath();
      ctx.arc(player.x, player.y, radius, 0, Math.PI * 2);
      ctx.fill();

      // Electric perimeter
      ctx.strokeStyle = '#c084fc';
      ctx.lineWidth = 2.5;
      ctx.setLineDash([12, 8]);
      ctx.lineDashOffset = timeTick * 1.2;
      ctx.beginPath();
      ctx.arc(player.x, player.y, radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      // Web spokes
      for (let i = 0; i < 8; i++) {
        const spokeA = (i * Math.PI * 2) / 8 + timeTick * 0.02;
        ctx.strokeStyle = 'rgba(192, 132, 252, 0.35)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(player.x, player.y);
        ctx.lineTo(player.x + Math.cos(spokeA) * radius, player.y + Math.sin(spokeA) * radius);
        ctx.stroke();
      }

      // Label
      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.beginPath();
      ctx.roundRect(player.x - 140, player.y - 40, 280, 24, 6);
      ctx.fill();
      ctx.strokeStyle = '#c084fc';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = '#c084fc';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('🕸️ LƯỚI BẪY ĐIỆN (R=450PX) - NHẤN LẦN 2 ĐỂ BẮN!', player.x, player.y - 24);
      break;
    }
    case 'stun_shockwave': {
      const radius = 400;
      ctx.fillStyle = `rgba(234, 179, 8, ${0.15 + pulse * 0.05})`;
      ctx.beginPath();
      ctx.arc(player.x, player.y, radius, 0, Math.PI * 2);
      ctx.fill();

      // Rings
      for (let r = 120; r <= radius; r += 140) {
        ctx.strokeStyle = `rgba(250, 204, 21, ${0.7 - (r / radius) * 0.4})`;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(player.x, player.y, r + (pulse * 10), 0, Math.PI * 2);
        ctx.stroke();
      }

      // Label
      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.beginPath();
      ctx.roundRect(player.x - 140, player.y - 40, 280, 24, 6);
      ctx.fill();
      ctx.strokeStyle = '#eab308';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = '#eab308';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('💫 SÓNG CHẤN ĐỘNG (R=400PX) - NHẤN LẦN 2 ĐỂ GẦM!', player.x, player.y - 24);
      break;
    }
    case 'dino_call': {
      const radius = 500;
      ctx.fillStyle = `rgba(16, 185, 129, ${0.15 + pulse * 0.05})`;
      ctx.beginPath();
      ctx.arc(player.x, player.y, radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#34d399';
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      ctx.arc(player.x, player.y, radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      // Soundwave ripples
      for (let a = -0.5; a <= 0.5; a += 0.25) {
        const waveA = angle + a;
        ctx.strokeStyle = 'rgba(52, 211, 153, 0.6)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(player.x, player.y, 80 + pulse * 10, waveA - 0.2, waveA + 0.2);
        ctx.stroke();
      }

      // Label
      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.beginPath();
      ctx.roundRect(player.x - 150, player.y - 40, 300, 24, 6);
      ctx.fill();
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('📢 TIẾNG GỌI KHỦNG LONG - NHẤN LẦN 2 ĐỂ GỌI!', player.x, player.y - 24);
      break;
    }
    case 'secret_tunnel': {
      const targetHomeX = homeBase ? homeBase.x : 130;
      const targetHomeY = homeBase ? homeBase.y : 130;

      // Vortex at player feet
      ctx.fillStyle = 'rgba(168, 85, 247, 0.3)';
      ctx.beginPath();
      ctx.arc(player.x, player.y, 48, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#c084fc';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(player.x, player.y, 48, 0, Math.PI * 2);
      ctx.stroke();

      // Energy conduit dashed line to Home
      ctx.strokeStyle = '#a855f7';
      ctx.lineWidth = 3;
      ctx.setLineDash([10, 8]);
      ctx.lineDashOffset = -timeTick * 2;
      ctx.beginPath();
      ctx.moveTo(player.x, player.y);
      ctx.lineTo(targetHomeX, targetHomeY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Portal destination marker at home
      ctx.fillStyle = 'rgba(168, 85, 247, 0.4)';
      ctx.beginPath();
      ctx.arc(targetHomeX, targetHomeY, 50, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#f472b6';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Label
      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.beginPath();
      ctx.roundRect(player.x - 145, player.y - 40, 290, 24, 6);
      ctx.fill();
      ctx.strokeStyle = '#a855f7';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = '#c084fc';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('🌀 HẦM VỀ CHUỒNG NHÀ - NHẤN LẦN 2 ĐỂ MỞ!', player.x, player.y - 24);
      break;
    }
    case 'tornado_gust': {
      const radius = 380;
      ctx.fillStyle = `rgba(6, 182, 212, ${0.15 + pulse * 0.05})`;
      ctx.beginPath();
      ctx.arc(player.x, player.y, radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#22d3ee';
      ctx.lineWidth = 2.5;
      ctx.setLineDash([12, 6]);
      ctx.lineDashOffset = timeTick * 2;
      ctx.beginPath();
      ctx.arc(player.x, player.y, radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      // Label
      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.beginPath();
      ctx.roundRect(player.x - 140, player.y - 40, 280, 24, 6);
      ctx.fill();
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = '#06b6d4';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('🌪️ GIÓ LỐC CẮT DÂY (R=380PX) - NHẤN LẦN 2 ĐỂ THỔI!', player.x, player.y - 24);
      break;
    }
    case 'titan_strength': {
      ctx.fillStyle = `rgba(239, 68, 68, ${0.2 + pulse * 0.08})`;
      ctx.beginPath();
      ctx.arc(player.x, player.y, 60, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Label
      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.beginPath();
      ctx.roundRect(player.x - 140, player.y - 40, 280, 24, 6);
      ctx.fill();
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = '#f87171';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('💪 SỨC MẠNH TITAN - NHẤN LẦN 2 ĐỂ KÍCH HOẠT!', player.x, player.y - 24);
      break;
    }
    default:
      break;
  }

  ctx.restore();
}
