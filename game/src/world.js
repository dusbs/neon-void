// The world: the state machine (title, playing, level-up, paused, over),
// waves, bullets, orbs, gems, collisions and score. One fixed step at a
// time, so a screenshot scene replays exactly the same every run.
import { COLORS, VIEW, spawnInterval, waveComposition } from './config.js';
import { Player } from './player.js';
import { ParticleSystem } from './particles.js';
import { SoundEngine } from './audio.js';
import { drawEnemy, spawnEnemy, updateEnemy } from './enemies.js';
import { mulberry32, range, shuffle } from './random.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'playing';
export const SCREEN_LEVELUP = 'levelup';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

const BEST_KEY = 'neon-void-best-score';

function loadBest() {
  try {
    return Number(window.localStorage.getItem(BEST_KEY)) || 0;
  } catch {
    return 0;
  }
}

function saveBest(score) {
  try {
    window.localStorage.setItem(BEST_KEY, String(score));
  } catch {
    // Private mode or no storage: the best score just does not persist.
  }
}

export class World {
  constructor(seed) {
    this.seed = seed;
    this.rng = mulberry32(seed);
    this.sound = new SoundEngine();
    this.particles = new ParticleSystem();
    this.player = new Player();
    this.reset();
  }

  reset() {
    this.screen = SCREEN_TITLE;
    this.score = 0;
    this.best = loadBest();
    this.wave = 0;
    this.kills = 0;
    this.time = 0;
    this.bullets = [];
    this.enemies = [];
    this.orbs = [];
    this.gems = [];
    this.spawnQueue = [];
    this.spawnTimer = 0;
    this.waveClearTimer = 0;
    this.banner = '';
    this.bannerTimer = 0;
    this.shake = 0;
    this.flash = 0;
    this.choices = [];
    this.demoPassive = false;
    this.newBest = false;
    this.particles = new ParticleSystem();
    this.player.reset();
  }

  /** Start a fresh run from the title screen. */
  startGame() {
    this.reset();
    this.screen = SCREEN_PLAY;
    this.nextWave();
  }

  nextWave() {
    this.wave += 1;
    this.spawnQueue = shuffle(this.rng, waveComposition(this.wave));
    this.spawnTimer = 0.5;
    this.showBanner(`WAVE ${this.wave}`);
    this.sound.waveStart();
  }

  showBanner(text) {
    this.banner = text;
    this.bannerTimer = 2;
  }

  addShake(amount) {
    this.shake = Math.min(14, this.shake + amount);
  }

  /** A volley of bolts from the player toward the aim point. */
  fireVolley(player) {
    // Aim assist: snap to the nearest enemy near the aim line, so a shot
    // pointed roughly at the swarm lands instead of sailing past it.
    let angle = player.aimAngle;
    let bestAngle = null;
    let bestScore = Infinity;
    for (const e of this.enemies) {
      const dx = e.x - player.x;
      const dy = e.y - player.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 720) continue;
      let diff = Math.atan2(dy, dx) - angle;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      if (Math.abs(diff) < 0.45) {
        const score = Math.abs(diff) * 200 + dist * 0.2;
        if (score < bestScore) {
          bestScore = score;
          bestAngle = Math.atan2(dy, dx);
        }
      }
    }
    if (bestAngle !== null) angle = bestAngle;
    const count = player.shots;
    const spread = 0.16;
    for (let i = 0; i < count; i += 1) {
      const offset = (i - (count - 1) / 2) * spread;
      const a = angle + offset;
      this.bullets.push({
        x: player.x + Math.cos(a) * (player.radius + 6),
        y: player.y + Math.sin(a) * (player.radius + 6),
        vx: Math.cos(a) * player.bulletSpeed,
        vy: Math.sin(a) * player.bulletSpeed,
        damage: player.damage,
        pierce: player.pierce,
        radius: 5,
        life: 1.4,
      });
    }
    this.sound.shoot();
  }

  /** The nova ring: 12 bolts in every direction at once. */
  fireNova(player) {
    for (let i = 0; i < 12; i += 1) {
      const angle = (i / 12) * Math.PI * 2;
      this.bullets.push({
        x: player.x + Math.cos(angle) * (player.radius + 6),
        y: player.y + Math.sin(angle) * (player.radius + 6),
        vx: Math.cos(angle) * player.bulletSpeed * 0.9,
        vy: Math.sin(angle) * player.bulletSpeed * 0.9,
        damage: player.damage,
        pierce: 0,
        radius: 5,
        life: 1.1,
      });
    }
    this.particles.spawnRing(player.x, player.y, COLORS.player, 90);
    this.sound.tone(520, 1040, 0.18, 'sine', 0.14);
  }

  /** A slow enemy orb, fired by a spitter at the player. */
  spawnOrb(x, y, nx, ny) {
    this.orbs.push({ x, y, vx: nx * 170, vy: ny * 170, radius: 7, life: 4.5 });
  }

  /** Apply a level-up choice and return to play. */
  chooseUpgrade(index) {
    const upgrade = this.choices[index];
    if (!upgrade) return;
    this.player.applyUpgrade(upgrade);
    this.choices = [];
    this.screen = SCREEN_PLAY;
  }

  update(dt, input) {
    if (this.bannerTimer > 0) this.bannerTimer -= dt;
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 30);
    if (this.flash > 0) this.flash = Math.max(0, this.flash - dt * 2.2);
    this.particles.update(dt);

    if (this.screen === SCREEN_TITLE) {
      this.updateTitle(dt, input);
    } else if (this.screen === SCREEN_PLAY) {
      this.updatePlaying(dt, input);
    } else if (this.screen === SCREEN_LEVELUP) {
      this.updateLevelUp(input);
    } else if (this.screen === SCREEN_PAUSED) {
      if (input.consume('pause') || input.consume('start')) this.screen = SCREEN_PLAY;
    } else if (this.screen === SCREEN_OVER) {
      if (input.consume('restart') || input.consume('start') || input.consume('click')) {
        this.startGame();
      }
    }
    if (input.consume('mute')) this.sound.toggleMute();
  }

  /** The title screen: demo enemies drift behind the menu. */
  updateTitle(dt, input) {
    if (this.enemies.length < 9 && Math.random() < dt * 2) {
      this.enemies.push(spawnEnemy('drifter', 1, this.rng));
    }
    for (let i = this.enemies.length - 1; i >= 0; i -= 1) {
      const e = this.enemies[i];
      e.age += dt;
      e.x += Math.sin(e.age * 0.8 + e.wobble) * 30 * dt;
      e.y += 60 * dt;
      if (e.y > VIEW.height + 40) this.enemies.splice(i, 1);
    }
    if (input.consume('start') || input.consume('click')) {
      this.sound.unlock();
      this.startGame();
    }
  }

  updateLevelUp(input) {
    if (input.consume('choice0')) this.chooseUpgrade(0);
    else if (input.consume('choice1')) this.chooseUpgrade(1);
    else if (input.consume('choice2')) this.chooseUpgrade(2);
    else if (input.consume('click')) {
      const card = this.cardAt(input.aimX, input.aimY);
      if (card >= 0) this.chooseUpgrade(card);
    }
  }

  /** Which level-up card, if any, sits under a point. */
  cardAt(x, y) {
    for (let i = 0; i < this.choices.length; i += 1) {
      const rect = this.cardRect(i);
      if (x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h) return i;
    }
    return -1;
  }

  cardRect(i) {
    const w = 300;
    const h = 170;
    const gap = 36;
    const total = this.choices.length * w + (this.choices.length - 1) * gap;
    return {
      x: (VIEW.width - total) / 2 + i * (w + gap),
      y: 300,
      w,
      h,
    };
  }

  updatePlaying(dt, input) {
    this.time += dt;
    // Invulnerability ticks down even when the player is not steering
    // (a passive demo still needs to be hittable).
    if (this.player.invuln > 0) this.player.invuln -= dt;
    if (input.consume('pause')) {
      this.screen = SCREEN_PAUSED;
      return;
    }
    if (!this.demoPassive) this.player.update(dt, input, this);

    // Spawn the wave's queue, a few at a time; later waves arrive in pairs.
    if (this.spawnQueue.length > 0) {
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0) {
        this.spawnTimer = spawnInterval(this.wave);
        const batch = this.wave >= 3 ? 2 : 1;
        for (let n = 0; n < batch && this.spawnQueue.length > 0; n += 1) {
          const type = this.spawnQueue.pop();
          this.enemies.push(spawnEnemy(type, this.wave, this.rng));
        }
      }
    } else if (this.enemies.length === 0) {
      // Wave cleared: a breather, then the next one.
      this.waveClearTimer += dt;
      if (this.waveClearTimer > 2.2) {
        this.waveClearTimer = 0;
        this.score += 100 * this.wave;
        this.nextWave();
      }
    }

    for (const enemy of this.enemies) updateEnemy(enemy, this, dt);
    this.updateBullets(dt);
    this.updateOrbs(dt);
    this.updateGems(dt);
    this.collidePlayer(dt);

    if (this.player.hp <= 0) {
      this.screen = SCREEN_OVER;
      this.newBest = this.score > this.best;
      if (this.newBest) {
        this.best = this.score;
        saveBest(this.score);
      }
      this.particles.spawnExplosion(this.player.x, this.player.y, COLORS.player, 60, 340);
      this.particles.spawnRing(this.player.x, this.player.y, COLORS.player, 160);
      this.addShake(12);
      this.sound.gameOver();
    }
  }

  updateBullets(dt) {
    for (let i = this.bullets.length - 1; i >= 0; i -= 1) {
      const b = this.bullets[i];
      b.life -= dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      let dead = b.life <= 0 || b.x < -20 || b.x > VIEW.width + 20 || b.y < -20 || b.y > VIEW.height + 20;
      if (!dead) {
        for (let j = this.enemies.length - 1; j >= 0; j -= 1) {
          const e = this.enemies[j];
          const dx = e.x - b.x;
          const dy = e.y - b.y;
          if (dx * dx + dy * dy < (e.radius + b.radius) * (e.radius + b.radius)) {
            e.hp -= b.damage;
            e.flash = 0.08;
            this.particles.spawnSparks(b.x, b.y, '#ffe45e', 4);
            this.sound.enemyHit();
            if (e.hp <= 0) {
              this.killEnemy(j);
            } else if (b.pierce > 0) {
              b.pierce -= 1;
            } else {
              dead = true;
            }
            if (dead) break;
          }
        }
      }
      if (dead) this.bullets.splice(i, 1);
    }
  }

  updateOrbs(dt) {
    for (let i = this.orbs.length - 1; i >= 0; i -= 1) {
      const o = this.orbs[i];
      o.life -= dt;
      o.x += o.vx * dt;
      o.y += o.vy * dt;
      if (o.life <= 0 || o.x < -20 || o.x > VIEW.width + 20 || o.y < -20 || o.y > VIEW.height + 20) {
        this.orbs.splice(i, 1);
      }
    }
  }

  updateGems(dt) {
    const p = this.player;
    for (let i = this.gems.length - 1; i >= 0; i -= 1) {
      const g = this.gems[i];
      const dx = p.x - g.x;
      const dy = p.y - g.y;
      const dist = Math.hypot(dx, dy) || 1;
      if (dist < p.magnetRadius) {
        const pull = 520 * (1 - dist / (p.magnetRadius + 40));
        g.x += (dx / dist) * pull * dt;
        g.y += (dy / dist) * pull * dt;
      } else {
        g.x += g.vx * dt;
        g.y += g.vy * dt;
        g.vx *= 0.96;
        g.vy *= 0.96;
      }
      if (dist < p.radius + 10) {
        this.gems.splice(i, 1);
        this.particles.spawnSparks(g.x, g.y, COLORS.gem, 3);
        this.sound.pickup();
        if (p.gainXp(g.value)) {
          this.choices = Player.rollChoices(this.rng);
          this.screen = SCREEN_LEVELUP;
          this.sound.levelUp();
        }
      }
    }
  }

  /** Enemies touching the player, and orbs hitting the player. */
  collidePlayer(dt) {
    const p = this.player;
    if (p.invuln > 0) return;
    for (const e of this.enemies) {
      const dx = e.x - p.x;
      const dy = e.y - p.y;
      const r = e.radius + p.radius;
      if (dx * dx + dy * dy < r * r) {
        const died = p.takeDamage(e.type === 'brute' ? 22 : 12);
        this.flash = 0.7;
        this.addShake(8);
        this.sound.hurt();
        this.particles.spawnSparks(p.x, p.y, COLORS.danger, 10);
        if (died) return;
        break;
      }
    }
    for (let i = this.orbs.length - 1; i >= 0; i -= 1) {
      const o = this.orbs[i];
      const dx = o.x - p.x;
      const dy = o.y - p.y;
      const r = o.radius + p.radius;
      if (dx * dx + dy * dy < r * r) {
        this.orbs.splice(i, 1);
        const died = p.takeDamage(8);
        this.flash = 0.6;
        this.sound.hurt();
        if (died) return;
      }
    }
  }

  /** Score, gems and juice for a kill. */
  killEnemy(index) {
    const e = this.enemies[index];
    this.enemies.splice(index, 1);
    this.kills += 1;
    this.score += e.score;
    this.particles.spawnExplosion(e.x, e.y, e.color, e.type === 'brute' ? 40 : 18, 300);
    if (e.type === 'brute') {
      this.particles.spawnRing(e.x, e.y, e.color, 120);
      this.addShake(6);
    }
    this.particles.spawnText(e.x, e.y - e.radius, `+${e.score}`, '#ffffff');
    this.sound.explosion(e.type === 'brute');
    for (let i = 0; i < e.xp; i += 1) {
      const angle = this.rng() * Math.PI * 2;
      this.gems.push({
        x: e.x,
        y: e.y,
        vx: Math.cos(angle) * range(this.rng, 40, 120),
        vy: Math.sin(angle) * range(this.rng, 40, 120),
        value: 1,
      });
    }
  }
}
