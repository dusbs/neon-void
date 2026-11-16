// Deterministic screenshot scenes (?shot=title|play|over&seed=N). Each one
// plays the real rules forward from a fresh world for a fixed number of
// steps, steered by a small autopilot, so the frame is what a short game
// really looks like — and the same seed always gives the same frame.
import { VIEW } from './config.js';
import { mulberry32 } from './random.js';
import { SCREEN_LEVELUP, SCREEN_OVER, SCREEN_PLAY } from './world.js';

const STEP = 1 / 60;

/**
 * A virtual input with the shape the world reads, steered by the pilot.
 * mode 'play': flee nearby enemies, chase gems, aim at the nearest enemy.
 * mode 'still': stand and shoot at the nearest enemy (the end scene: the
 * swarm catches a pilot who never moves). mode 'passive': do nothing.
 */
function autopilotInput(world, mode) {
  const p = world.player;
  let mx = 0;
  let my = 0;
  let aimX = p.x + 200;
  let aimY = p.y;
  let nearestEnemy = null;
  let nearestEnemyDist = Infinity;
  for (const e of world.enemies) {
    const d = Math.hypot(e.x - p.x, e.y - p.y);
    if (d < nearestEnemyDist) { nearestEnemy = e; nearestEnemyDist = d; }
  }
  if (nearestEnemy) {
    aimX = nearestEnemy.x;
    aimY = nearestEnemy.y;
  }
  if (mode === 'play') {
    let nearestGem = null;
    let nearestGemDist = Infinity;
    for (const g of world.gems) {
      const d = Math.hypot(g.x - p.x, g.y - p.y);
      if (d < nearestGemDist) { nearestGem = g; nearestGemDist = d; }
    }
    if (nearestEnemy && nearestEnemyDist < 150) {
      mx = (p.x - nearestEnemy.x) / nearestEnemyDist;
      my = (p.y - nearestEnemy.y) / nearestEnemyDist;
    } else if (nearestGem && nearestGemDist < 300) {
      mx = (nearestGem.x - p.x) / nearestGemDist;
      my = (nearestGem.y - p.y) / nearestGemDist;
    } else {
      mx = Math.cos(world.time * 0.5);
      my = Math.sin(world.time * 0.5);
    }
  }
  return {
    moveX: mx,
    moveY: my,
    aimX,
    aimY,
    consume: () => false,
  };
}

/** Run the world forward `seconds` at 60Hz, picking level-ups as they come. */
function simulate(world, seconds, mode) {
  const steps = Math.round(seconds / STEP);
  for (let i = 0; i < steps; i += 1) {
    if (world.screen === SCREEN_LEVELUP) world.chooseUpgrade(0);
    if (world.screen === SCREEN_OVER) break;
    world.update(STEP, autopilotInput(world, mode));
  }
}

/** Build one named scene on a fresh world. Called once, before first paint. */
export function buildShotScene(world, scene, seed) {
  if (scene === 'title') {
    // Title over a live, drifting backdrop.
    world.reset();
    world.screen = 'title';
    for (let i = 0; i < 7; i += 1) {
      const enemy = { type: 'drifter', x: 120 + i * 170, y: 120 + (i % 3) * 160, vx: 0, vy: 0, radius: 16, hp: 18, maxHp: 18, speed: 72, score: 10, xp: 1, color: '#ff2d78', age: 0, shootTimer: 2, wobble: i, flash: 0 };
      world.enemies.push(enemy);
    }
    world.particles.spawnExplosion(VIEW.width / 2, 200, '#7b2dff', 24, 160);
    return;
  }
  if (scene === 'play') {
    // A real mid-game frame: two passes — first find the busiest moment of
    // a 40-second run, then replay to it, so the frame is full of action.
    let best = { count: -1, time: 0, seedOff: 0 };
    for (let attempt = 0; attempt < 4; attempt += 1) {
      world.rng = mulberry32(seed + attempt);
      world.startGame();
      const steps = Math.round(40 / STEP);
      for (let i = 0; i < steps; i += 1) {
        if (world.screen === SCREEN_LEVELUP) world.chooseUpgrade(0);
        if (world.screen === SCREEN_OVER) break;
        world.update(STEP, autopilotInput(world, 'play'));
        if (world.screen === SCREEN_PLAY && world.enemies.length > best.count) {
          best = { count: world.enemies.length, time: world.time, seedOff: attempt };
        }
      }
      if (best.count >= 8) break;
    }
    world.rng = mulberry32(seed + best.seedOff);
    world.startGame();
    if (best.count > 0) {
      const target = Math.round(best.time / STEP);
      for (let i = 0; i < target; i += 1) {
        if (world.screen === SCREEN_LEVELUP) world.chooseUpgrade(0);
        world.update(STEP, autopilotInput(world, 'play'));
      }
    } else {
      simulate(world, 12, 'play');
    }
    return;
  }
  if (scene === 'over') {
    // A pilot who stands and shoots but never moves: the swarm catches it,
    // after it has put up a fight worth showing on the end screen.
    world.startGame();
    simulate(world, 300, 'still');
    if (world.screen !== SCREEN_OVER) {
      // The swarm was too slow: finish the job so the frame shows the end.
      world.player.invuln = 0;
      world.player.hp = 0;
      world.update(STEP, autopilotInput(world, 'still'));
    }
    return;
  }
  // Unknown scene: plain title.
  world.reset();
}
