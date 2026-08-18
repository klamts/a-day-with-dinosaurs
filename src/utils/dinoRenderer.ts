import { ActiveDinosaur } from '../types/game';
import { DINOSAUR_CATALOG, MAP_CONFIGS } from '../data/dinosaurs';
import { AVATAR_OPTIONS } from '../data/avatars';

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
  player: {
    id: string;
    name: string;
    avatarId: string;
    color: string;
    x: number;
    y: number;
    angle: number;
    isThrowingLasso: boolean;
    lassoX: number;
    lassoY: number;
    lassoState: string;
    isStunned: boolean;
    slotNumber: number;
  },
  timeTick: number,
  isControlledLocal: boolean = false
) {
  const avatar = AVATAR_OPTIONS.find(a => a.id === player.avatarId) || AVATAR_OPTIONS[0];

  // Draw Lasso Line if active
  if (player.lassoState !== 'ready') {
    ctx.save();
    ctx.strokeStyle = player.color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(player.x, player.y);
    ctx.lineTo(player.lassoX, player.lassoY);
    ctx.stroke();

    // Lasso loop / electric net effect at tip
    ctx.fillStyle = player.color;
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

  // Overhead Player Tag & Slot indicator
  ctx.save();
  ctx.translate(player.x, player.y - 26);
  ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
  ctx.beginPath();
  ctx.roundRect(-30, -10, 60, 16, 4);
  ctx.fill();

  ctx.fillStyle = player.color;
  ctx.font = 'bold 10px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`P${player.slotNumber}: ${player.name.substring(0, 8)}`, 0, 2);
  ctx.restore();
}
