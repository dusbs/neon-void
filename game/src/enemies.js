// Enemies: four kinds, each with its own shape, movement and threat.
// A drifter chases, a dart darts, a spitter keeps its distance and shoots,
// a brute soaks damage. All of them die in a burst of sparks and gems.
import { ENEMY_TYPES, VIEW } from './config.js';
import { range } from './random.js';

/** Build one enemy of `type` at the arena edge, scaled up by the wave. */
export function spawnEnemy(type, wave, rng) {
  const def = ENEMY_TYPES[type];
  const side = Math.floor(rng() * 4);
  const margin = 30;
  let x;
  let y;
  if (side === 0) { x = range(rng, 0, VIEW.width); y = -margin; }
  else if (side === 1) { x = VIEW.width + margin; y = range(rng, 0, VIEW.height); }
  else if (side === 2) { x = range(rng, 0, VIEW.width); y = VIEW.height + margin; }
  else { x = -margin; y = range(rng, 0, VIEW.height); }
  const hpScale = 1 + (wave - 1) * 0.16;
  const speedScale = 1 + Math.min(0.5, (wave - 1) * 0.03);
  return {
    type,
    x, y,
    vx: 0, vy: 0,
    radius: def.radius,
    hp: Math.round(def.hp * hpScale),
    maxHp: Math.round(def.hp * hpScale),
    speed: def.speed * speedScale,
    score: def.score,
    xp: def.xp,
    color: def.color,
    age: 0,
    shootTimer: range(rng, 1, 2.4),
    wobble: range(rng, 0, Math.PI * 2),
    flash: 0,
  };
}

/** Steer one enemy for a step. Spitters fire orbs through `world`. */
export function updateEnemy(enemy, world, dt) {
  const player = world.player;
  enemy.age += dt;
  if (enemy.flash > 0) enemy.flash -= dt;
  const dx = player.x - enemy.x;
  const dy = player.y - enemy.y;
  const dist = Math.hypot(dx, dy) || 1;
  const nx = dx / dist;
  const ny = dy / dist;

  if (enemy.type === 'drifter') {
    enemy.vx = nx * enemy.speed;
    enemy.vy = ny * enemy.speed;
  } else if (enemy.type === 'dart') {
    const wobble = Math.sin(enemy.age * 6 + enemy.wobble) * 0.7;
    const px = -ny * wobble;
    const py = nx * wobble;
    enemy.vx = (nx + px) * enemy.speed;
    enemy.vy = (ny + py) * enemy.speed;
  } else if (enemy.type === 'spitter') {
    // Close in until 260px out, then strafe and shoot.
    const toward = dist > 280 ? 1 : dist < 200 ? -0.7 : 0;
    const strafe = Math.sin(enemy.age * 1.6 + enemy.wobble) * 0.8;
    enemy.vx = (nx * toward - ny * strafe) * enemy.speed;
    enemy.vy = (ny * toward + nx * strafe) * enemy.speed;
    enemy.shootTimer -= dt;
    if (enemy.shootTimer <= 0 && dist < 560) {
      enemy.shootTimer = 2.4;
      world.spawnOrb(enemy.x, enemy.y, nx, ny);
    }
  } else if (enemy.type === 'brute') {
    enemy.vx = nx * enemy.speed;
    enemy.vy = ny * enemy.speed;
  }
  enemy.x += enemy.vx * dt;
  enemy.y += enemy.vy * dt;
}

/** One enemy, drawn as a glowing neon shape with a hurt flash and HP bar. */
export function drawEnemy(ctx, enemy) {
  ctx.save();
  ctx.translate(enemy.x, enemy.y);
  ctx.shadowColor = enemy.color;
  ctx.shadowBlur = 16;
  const flash = enemy.flash > 0;
  ctx.fillStyle = flash ? '#ffffff' : enemy.color;
  ctx.strokeStyle = enemy.color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  if (enemy.type === 'drifter') {
    ctx.arc(0, 0, enemy.radius, 0, Math.PI * 2);
    ctx.fill();
  } else if (enemy.type === 'dart') {
    const a = Math.atan2(enemy.vy, enemy.vx);
    ctx.rotate(a);
    ctx.moveTo(enemy.radius + 4, 0);
    ctx.lineTo(-enemy.radius, enemy.radius * 0.8);
    ctx.lineTo(-enemy.radius * 0.4, 0);
    ctx.lineTo(-enemy.radius, -enemy.radius * 0.8);
    ctx.closePath();
    ctx.fill();
  } else if (enemy.type === 'spitter') {
    ctx.rotate(Math.PI / 4);
    ctx.rect(-enemy.radius * 0.8, -enemy.radius * 0.8, enemy.radius * 1.6, enemy.radius * 1.6);
    ctx.fill();
    ctx.rotate(-Math.PI / 4);
    ctx.fillStyle = '#05010f';
    ctx.beginPath();
    ctx.arc(0, 0, enemy.radius * 0.35, 0, Math.PI * 2);
    ctx.fill();
  } else {
    for (let i = 0; i < 6; i += 1) {
      const a = (i / 6) * Math.PI * 2;
      const px = Math.cos(a) * enemy.radius;
      const py = Math.sin(a) * enemy.radius;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#05010f';
    ctx.beginPath();
    ctx.arc(0, 0, enemy.radius * 0.4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  if (enemy.hp < enemy.maxHp) {
    const w = enemy.radius * 2;
    const frac = Math.max(0, enemy.hp / enemy.maxHp);
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.fillRect(enemy.x - w / 2, enemy.y - enemy.radius - 10, w, 4);
    ctx.fillStyle = enemy.color;
    ctx.fillRect(enemy.x - w / 2, enemy.y - enemy.radius - 10, w * frac, 4);
  }
}
