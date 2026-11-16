// Particles, shockwave rings and floating score text: the juice. Every
// effect is a small object with a lifetime; the system updates and draws
// them, and drops the dead ones.
export class ParticleSystem {
  constructor() {
    this.particles = [];
    this.rings = [];
    this.texts = [];
  }

  /** A burst of glowing sparks flying out from a point. */
  spawnExplosion(x, y, color, count, speed) {
    for (let i = 0; i < count; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const v = speed * (0.3 + Math.random() * 0.7);
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * v,
        vy: Math.sin(angle) * v,
        life: 0.45 + Math.random() * 0.35,
        maxLife: 0.8,
        size: 2 + Math.random() * 3,
        color,
      });
    }
  }

  /** A few fast streaks, for a bullet impact. */
  spawnSparks(x, y, color, count) {
    this.spawnExplosion(x, y, color, count, 260);
  }

  /** An expanding ring, for novas and big deaths. */
  spawnRing(x, y, color, maxRadius) {
    this.rings.push({ x, y, radius: 6, maxRadius, life: 0.45, maxLife: 0.45, color });
  }

  /** Text that floats up and fades, for score popups. */
  spawnText(x, y, text, color) {
    this.texts.push({ x, y, text, color, life: 0.9, maxLife: 0.9 });
  }

  update(dt) {
    for (let i = this.particles.length - 1; i >= 0; i -= 1) {
      const p = this.particles[i];
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.92;
      p.vy *= 0.92;
      if (p.life <= 0) this.particles.splice(i, 1);
    }
    for (let i = this.rings.length - 1; i >= 0; i -= 1) {
      const r = this.rings[i];
      r.life -= dt;
      r.radius += (r.maxRadius / r.maxLife) * dt;
      if (r.life <= 0) this.rings.splice(i, 1);
    }
    for (let i = this.texts.length - 1; i >= 0; i -= 1) {
      const t = this.texts[i];
      t.life -= dt;
      t.y -= 42 * dt;
      if (t.life <= 0) this.texts.splice(i, 1);
    }
  }

  draw(ctx) {
    ctx.save();
    for (const p of this.particles) {
      const alpha = Math.max(0, p.life / p.maxLife);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 8;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    for (const r of this.rings) {
      const alpha = Math.max(0, r.life / r.maxLife);
      ctx.globalAlpha = alpha * 0.9;
      ctx.strokeStyle = r.color;
      ctx.lineWidth = 3;
      ctx.shadowColor = r.color;
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.shadowBlur = 0;
    ctx.textAlign = 'center';
    ctx.font = 'bold 16px "Segoe UI", system-ui, sans-serif';
    for (const t of this.texts) {
      ctx.globalAlpha = Math.max(0, t.life / t.maxLife);
      ctx.fillStyle = t.color;
      ctx.fillText(t.text, t.x, t.y);
    }
    ctx.restore();
  }
}
