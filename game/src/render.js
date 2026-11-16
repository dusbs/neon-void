// Rendering: one canvas, everything drawn in code — the starfield, the
// grid, the ships, the HUD and every menu. No images, no fonts to fetch.
import { COLORS, VIEW } from './config.js';
import { SCREEN_LEVELUP, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE } from './world.js';
import { drawEnemy } from './enemies.js';
import { mulberry32, range } from './random.js';

const STARS = (() => {
  const rng = mulberry32(1337);
  const stars = [];
  for (let i = 0; i < 110; i += 1) {
    stars.push({ x: range(rng, 0, VIEW.width), y: range(rng, 0, VIEW.height), r: range(rng, 0.6, 2), tw: range(rng, 0, Math.PI * 2) });
  }
  return stars;
})();

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export class Renderer {
  constructor(ctx) {
    this.ctx = ctx;
    this.time = 0;
  }

  draw(world) {
    this.time += 1 / 60;
    const ctx = this.ctx;
    ctx.save();
    ctx.clearRect(0, 0, VIEW.width, VIEW.height);
    if (world.shake > 0.2) {
      ctx.translate((Math.random() - 0.5) * world.shake, (Math.random() - 0.5) * world.shake);
    }
    this.drawBackground(ctx);
    if (world.screen !== SCREEN_TITLE) {
      this.drawGems(ctx, world);
      this.drawOrbs(ctx, world);
      for (const enemy of world.enemies) drawEnemy(ctx, enemy);
      this.drawBullets(ctx, world);
      if (world.screen !== SCREEN_OVER) this.drawPlayer(ctx, world);
    } else {
      for (const enemy of world.enemies) drawEnemy(ctx, enemy);
    }
    world.particles.draw(ctx);
    ctx.restore();

    if (world.flash > 0) {
      ctx.fillStyle = `rgba(255, 40, 60, ${world.flash * 0.22})`;
      ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    }
    if (world.screen === SCREEN_PLAY || world.screen === SCREEN_LEVELUP || world.screen === SCREEN_PAUSED) {
      this.drawHud(ctx, world);
    }
    if (world.bannerTimer > 0 && world.screen === SCREEN_PLAY) this.drawBanner(ctx, world);
    if (world.screen === SCREEN_TITLE) this.drawTitle(ctx, world);
    else if (world.screen === SCREEN_LEVELUP) this.drawLevelUp(ctx, world);
    else if (world.screen === SCREEN_PAUSED) this.drawPaused(ctx, world);
    else if (world.screen === SCREEN_OVER) this.drawGameOver(ctx, world);
  }

  drawBackground(ctx) {
    const grad = ctx.createLinearGradient(0, 0, 0, VIEW.height);
    grad.addColorStop(0, '#0a0224');
    grad.addColorStop(0.55, '#05010f');
    grad.addColorStop(1, '#12041f');
    ctx.fillStyle = grad;
    ctx.fillRect(-20, -20, VIEW.width + 40, VIEW.height + 40);
    for (const star of STARS) {
      ctx.globalAlpha = 0.35 + 0.3 * Math.sin(this.time * 1.4 + star.tw);
      ctx.fillStyle = '#cdd7ff';
      ctx.fillRect(star.x, star.y, star.r, star.r);
    }
    ctx.globalAlpha = 1;
    ctx.strokeStyle = COLORS.grid;
    ctx.lineWidth = 1;
    for (let x = 0; x <= VIEW.width; x += 64) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, VIEW.height);
      ctx.stroke();
    }
    for (let y = 0; y <= VIEW.height; y += 64) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(VIEW.width, y);
      ctx.stroke();
    }
  }

  drawGems(ctx, world) {
    for (const g of world.gems) {
      const pulse = 1 + 0.15 * Math.sin(this.time * 5 + g.x);
      ctx.save();
      ctx.translate(g.x, g.y);
      ctx.rotate(Math.PI / 4);
      ctx.scale(pulse, pulse);
      ctx.fillStyle = COLORS.gem;
      ctx.shadowColor = COLORS.gem;
      ctx.shadowBlur = 10;
      ctx.fillRect(-5, -5, 10, 10);
      ctx.restore();
    }
  }

  drawOrbs(ctx, world) {
    for (const o of world.orbs) {
      ctx.save();
      ctx.fillStyle = '#ff9f1c';
      ctx.shadowColor = '#ff9f1c';
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.arc(o.x, o.y, o.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff3d6';
      ctx.beginPath();
      ctx.arc(o.x, o.y, o.radius * 0.45, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  drawBullets(ctx, world) {
    for (const b of world.bullets) {
      ctx.save();
      ctx.strokeStyle = COLORS.bullet;
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.shadowColor = COLORS.bullet;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.moveTo(b.x - b.vx * 0.016, b.y - b.vy * 0.016);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
      ctx.restore();
    }
  }

  drawPlayer(ctx, world) {
    const p = world.player;
    ctx.save();
    ctx.translate(p.x, p.y);
    const blink = p.invuln > 0 && Math.floor(this.time * 14) % 2 === 0;
    ctx.globalAlpha = blink ? 0.35 : 1;
    if (p.thrust) {
      ctx.fillStyle = '#ff9f1c';
      ctx.shadowColor = '#ff9f1c';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.moveTo(-p.radius - 4 - Math.random() * 8, 0);
      ctx.lineTo(-p.radius, 6);
      ctx.lineTo(-p.radius, -6);
      ctx.closePath();
      ctx.fill();
    }
    ctx.rotate(p.aimAngle);
    ctx.fillStyle = COLORS.player;
    ctx.shadowColor = COLORS.player;
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.moveTo(p.radius + 8, 0);
    ctx.lineTo(-p.radius, p.radius * 0.85);
    ctx.lineTo(-p.radius * 0.45, 0);
    ctx.lineTo(-p.radius, -p.radius * 0.85);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = COLORS.playerCore;
    ctx.beginPath();
    ctx.arc(2, 0, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  drawHud(ctx, world) {
    const p = world.player;
    ctx.save();
    ctx.textBaseline = 'top';
    ctx.fillStyle = COLORS.text;
    ctx.font = 'bold 26px "Segoe UI", system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`SCORE ${world.score}`, 22, 16);
    ctx.font = '16px "Segoe UI", system-ui, sans-serif';
    ctx.fillStyle = COLORS.dimText;
    ctx.fillText(`BEST ${Math.max(world.best, world.score)}`, 22, 48);
    ctx.textAlign = 'center';
    ctx.fillStyle = COLORS.text;
    ctx.font = 'bold 24px "Segoe UI", system-ui, sans-serif';
    ctx.fillText(`WAVE ${world.wave}`, VIEW.width / 2, 16);
    ctx.font = '16px "Segoe UI", system-ui, sans-serif';
    ctx.fillStyle = COLORS.dimText;
    ctx.fillText(`${world.kills} KILLS  ·  ${formatTime(world.time)}`, VIEW.width / 2, 46);
    ctx.textAlign = 'right';
    ctx.fillStyle = COLORS.text;
    ctx.font = 'bold 20px "Segoe UI", system-ui, sans-serif';
    ctx.fillText(`LV ${p.level}`, VIEW.width - 22, 16);
    ctx.font = '14px "Segoe UI", system-ui, sans-serif';
    ctx.fillStyle = COLORS.dimText;
    ctx.fillText('M mute · P pause', VIEW.width - 22, 44);

    // HP bar and XP bar, bottom of the screen.
    const barW = 460;
    const barX = (VIEW.width - barW) / 2;
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.fillRect(barX, VIEW.height - 44, barW, 12);
    ctx.fillStyle = p.hp / p.maxHp > 0.3 ? '#39ff88' : '#ff3b30';
    ctx.fillRect(barX, VIEW.height - 44, barW * Math.max(0, p.hp / p.maxHp), 12);
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.fillRect(barX, VIEW.height - 26, barW, 8);
    ctx.fillStyle = '#7dff5e';
    ctx.fillRect(barX, VIEW.height - 26, barW * Math.min(1, p.xp / p.xpNext), 8);
    ctx.fillStyle = COLORS.text;
    ctx.font = '13px "Segoe UI", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`HP ${Math.ceil(p.hp)} / ${p.maxHp}`, VIEW.width / 2, VIEW.height - 62);
    ctx.restore();
  }

  drawBanner(ctx, world) {
    const alpha = Math.min(1, world.bannerTimer);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#7b2dff';
    ctx.shadowBlur = 24;
    ctx.font = 'bold 54px "Segoe UI", system-ui, sans-serif';
    ctx.fillText(world.banner, VIEW.width / 2, 220);
    ctx.restore();
  }

  drawTitle(ctx, world) {
    ctx.save();
    ctx.fillStyle = 'rgba(5, 1, 15, 0.55)';
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    ctx.textAlign = 'center';
    ctx.shadowColor = '#7b2dff';
    ctx.shadowBlur = 34;
    ctx.fillStyle = '#39ffdc';
    ctx.font = 'bold 92px "Segoe UI", system-ui, sans-serif';
    ctx.fillText('NEON VOID', VIEW.width / 2, 150);
    ctx.shadowColor = '#ff2d78';
    ctx.shadowBlur = 18;
    ctx.fillStyle = '#ff9fdc';
    ctx.font = 'bold 26px "Segoe UI", system-ui, sans-serif';
    ctx.fillText('SURVIVE THE SWARM  ·  LEVEL UP  ·  HOLD THE VOID', VIEW.width / 2, 268);
    ctx.shadowBlur = 0;
    ctx.fillStyle = COLORS.text;
    ctx.font = '20px "Segoe UI", system-ui, sans-serif';
    ctx.fillText('WASD / arrows to fly  ·  mouse to aim  ·  bolts fire on their own', VIEW.width / 2, 330);
    ctx.fillText('Collect green gems to level up and choose upgrades', VIEW.width / 2, 362);
    ctx.fillText('Dodge the swarm. Spitters shoot back. Brutes take some killing.', VIEW.width / 2, 394);
    const pulse = 0.65 + 0.35 * Math.sin(this.time * 3);
    ctx.globalAlpha = pulse;
    ctx.fillStyle = '#ffe45e';
    ctx.font = 'bold 30px "Segoe UI", system-ui, sans-serif';
    ctx.fillText('PRESS ENTER OR CLICK TO START', VIEW.width / 2, 470);
    ctx.globalAlpha = 1;
    if (world.best > 0) {
      ctx.fillStyle = COLORS.dimText;
      ctx.font = '18px "Segoe UI", system-ui, sans-serif';
      ctx.fillText(`BEST SCORE ${world.best}`, VIEW.width / 2, 530);
    }
    ctx.restore();
  }

  drawLevelUp(ctx, world) {
    ctx.save();
    ctx.fillStyle = 'rgba(5, 1, 15, 0.72)';
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffe45e';
    ctx.shadowColor = '#ffe45e';
    ctx.shadowBlur = 20;
    ctx.font = 'bold 44px "Segoe UI", system-ui, sans-serif';
    ctx.fillText(`LEVEL ${world.player.level} — CHOOSE AN UPGRADE`, VIEW.width / 2, 190);
    ctx.shadowBlur = 0;
    world.choices.forEach((choice, i) => {
      const rect = world.cardRect(i);
      ctx.fillStyle = 'rgba(24, 10, 64, 0.92)';
      ctx.strokeStyle = '#7b2dff';
      ctx.lineWidth = 2;
      ctx.shadowColor = '#7b2dff';
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.roundRect(rect.x, rect.y, rect.w, rect.h, 14);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#39ffdc';
      ctx.font = 'bold 22px "Segoe UI", system-ui, sans-serif';
      ctx.fillText(choice.name, rect.x + rect.w / 2, rect.y + 34);
      ctx.fillStyle = COLORS.text;
      ctx.font = '17px "Segoe UI", system-ui, sans-serif';
      ctx.fillText(choice.desc, rect.x + rect.w / 2, rect.y + 78);
      ctx.fillStyle = COLORS.dimText;
      ctx.font = 'bold 16px "Segoe UI", system-ui, sans-serif';
      ctx.fillText(`PRESS ${i + 1} OR CLICK`, rect.x + rect.w / 2, rect.y + 124);
    });
    ctx.restore();
  }

  drawPaused(ctx, world) {
    ctx.save();
    ctx.fillStyle = 'rgba(5, 1, 15, 0.66)';
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    ctx.textAlign = 'center';
    ctx.fillStyle = COLORS.text;
    ctx.font = 'bold 56px "Segoe UI", system-ui, sans-serif';
    ctx.fillText('PAUSED', VIEW.width / 2, 300);
    ctx.font = '20px "Segoe UI", system-ui, sans-serif';
    ctx.fillStyle = COLORS.dimText;
    ctx.fillText('Press P or Enter to keep flying', VIEW.width / 2, 380);
    ctx.restore();
  }

  drawGameOver(ctx, world) {
    const p = world.player;
    ctx.save();
    ctx.fillStyle = 'rgba(5, 1, 15, 0.72)';
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ff3b30';
    ctx.shadowColor = '#ff3b30';
    ctx.shadowBlur = 26;
    ctx.font = 'bold 64px "Segoe UI", system-ui, sans-serif';
    ctx.fillText('THE VOID TOOK YOU', VIEW.width / 2, 150);
    ctx.shadowBlur = 0;
    ctx.fillStyle = COLORS.text;
    ctx.font = 'bold 40px "Segoe UI", system-ui, sans-serif';
    ctx.fillText(`SCORE ${world.score}`, VIEW.width / 2, 250);
    if (world.newBest) {
      ctx.fillStyle = '#ffe45e';
      ctx.font = 'bold 22px "Segoe UI", system-ui, sans-serif';
      ctx.fillText('★ NEW BEST SCORE ★', VIEW.width / 2, 302);
    }
    ctx.fillStyle = COLORS.dimText;
    ctx.font = '20px "Segoe UI", system-ui, sans-serif';
    ctx.fillText(`Wave ${world.wave}  ·  ${world.kills} kills  ·  Level ${p.level}  ·  Survived ${formatTime(world.time)}`, VIEW.width / 2, 350);
    const pulse = 0.65 + 0.35 * Math.sin(this.time * 3);
    ctx.globalAlpha = pulse;
    ctx.fillStyle = '#ffe45e';
    ctx.font = 'bold 28px "Segoe UI", system-ui, sans-serif';
    ctx.fillText('PRESS R OR CLICK TO FLY AGAIN', VIEW.width / 2, 440);
    ctx.restore();
  }
}
