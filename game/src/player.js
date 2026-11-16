// The player: a neon ship that moves with WASD or arrows, aims with the
// mouse and fires on its own. Level-ups mutate exactly one stat each.
import { PLAYER, UPGRADES, VIEW, xpNeeded } from './config.js';

export class Player {
  constructor() {
    this.reset();
  }

  reset() {
    this.x = VIEW.width / 2;
    this.y = VIEW.height / 2;
    this.radius = PLAYER.radius;
    this.speed = PLAYER.speed;
    this.hp = PLAYER.maxHp;
    this.maxHp = PLAYER.maxHp;
    this.level = 1;
    this.xp = 0;
    this.xpNext = xpNeeded(1);
    this.damage = PLAYER.bulletDamage;
    this.fireInterval = PLAYER.fireInterval;
    this.bulletSpeed = PLAYER.bulletSpeed;
    this.magnetRadius = PLAYER.magnetRadius;
    this.shots = 1;
    this.pierce = 0;
    this.novaInterval = 0;
    this.novaTimer = 0;
    this.fireTimer = 0.2;
    this.invuln = 0;
    this.aimAngle = -Math.PI / 2;
    this.thrust = 0;
  }

  /** Move, aim and fire for one step. Returns nothing; firing goes through the world. */
  update(dt, input, world) {
    if (this.invuln > 0) this.invuln -= dt;
    const mx = input.moveX;
    const my = input.moveY;
    const len = Math.hypot(mx, my) || 1;
    this.x += (mx / len) * this.speed * dt * (mx === 0 && my === 0 ? 0 : 1);
    this.y += (my / len) * this.speed * dt * (mx === 0 && my === 0 ? 0 : 1);
    this.x = Math.max(this.radius, Math.min(VIEW.width - this.radius, this.x));
    this.y = Math.max(this.radius, Math.min(VIEW.height - this.radius, this.y));
    this.thrust = mx !== 0 || my !== 0 ? 1 : 0;
    this.aimAngle = Math.atan2(input.aimY - this.y, input.aimX - this.x);

    this.fireTimer -= dt;
    if (this.fireTimer <= 0) {
      this.fireTimer = this.fireInterval;
      world.fireVolley(this);
    }
    if (this.novaInterval > 0) {
      this.novaTimer -= dt;
      if (this.novaTimer <= 0) {
        this.novaTimer = this.novaInterval;
        world.fireNova(this);
      }
    }
  }

  /** Take a hit unless briefly invulnerable. Returns true when it kills. */
  takeDamage(amount) {
    if (this.invuln > 0) return false;
    this.hp -= amount;
    this.invuln = PLAYER.invulnerableSeconds;
    return this.hp <= 0;
  }

  /** Add XP; returns true when a level was gained (the world opens the choice). */
  gainXp(amount) {
    this.xp += amount;
    if (this.xp < this.xpNext) return false;
    this.xp -= this.xpNext;
    this.level += 1;
    this.xpNext = xpNeeded(this.level);
    return true;
  }

  applyUpgrade(upgrade) {
    upgrade.apply(this);
  }

  /** Three distinct upgrades to offer, drawn from the pool. */
  static rollChoices(rng) {
    const pool = UPGRADES.slice();
    const choices = [];
    while (choices.length < 3 && pool.length > 0) {
      const index = Math.floor(rng() * pool.length);
      choices.push(pool.splice(index, 1)[0]);
    }
    return choices;
  }
}
