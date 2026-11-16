// Neon Void — every number the game balances on lives here, so tuning the
// game means editing this file, never the logic that reads it.
export const VIEW = { width: 1280, height: 720 };

export const COLORS = {
  background: '#05010f',
  grid: 'rgba(64, 32, 160, 0.20)',
  player: '#39ffdc',
  playerCore: '#eafffb',
  bullet: '#ffe45e',
  gem: '#7dff5e',
  text: '#e8ecff',
  dimText: '#8f96c9',
  danger: '#ff3b30',
};

export const PLAYER = {
  radius: 14,
  speed: 278,
  maxHp: 100,
  fireInterval: 0.32,
  bulletSpeed: 660,
  bulletDamage: 12,
  bulletRadius: 5,
  magnetRadius: 95,
  invulnerableSeconds: 0.6,
  contactDamageCooldown: 0.6,
};

/** Enemy kinds. hp and speed scale with the wave; score and xp are flat. */
export const ENEMY_TYPES = {
  drifter: { radius: 16, hp: 18, speed: 72, score: 10, xp: 1, color: '#ff2d78', label: 'Drifter' },
  dart: { radius: 12, hp: 10, speed: 195, score: 15, xp: 1, color: '#22e6ff', label: 'Dart' },
  spitter: { radius: 15, hp: 24, speed: 56, score: 25, xp: 2, color: '#ff9f1c', label: 'Spitter' },
  brute: { radius: 30, hp: 95, speed: 44, score: 50, xp: 5, color: '#ff3b30', label: 'Brute' },
};

/** How many of each kind a wave fields. Later waves mix faster, ranged and heavy foes. */
export function waveComposition(wave) {
  const list = [];
  const add = (type, count) => { for (let i = 0; i < count; i += 1) list.push(type); };
  add('drifter', 6 + wave * 2);
  if (wave >= 2) add('dart', wave * 2);
  if (wave >= 3) add('spitter', wave);
  if (wave >= 4) add('brute', Math.floor(wave / 2));
  return list;
}

/** Seconds between spawns inside a wave; waves get denser as they go on. */
export function spawnInterval(wave) {
  return Math.max(0.45, 1.0 - wave * 0.07);
}

/** XP needed to go from `level` to `level + 1`. */
export function xpNeeded(level) {
  return 5 + (level - 1) * 4;
}

/** Level-up choices. Each one mutates the player in exactly one way. */
export const UPGRADES = [
  {
    id: 'damage', name: 'OVERCHARGE', desc: '+25% bullet damage',
    apply: (p) => { p.damage = Math.round(p.damage * 1.25); },
  },
  {
    id: 'firerate', name: 'RAPID CYCLER', desc: '+20% fire rate',
    apply: (p) => { p.fireInterval *= 0.83; },
  },
  {
    id: 'speed', name: 'ION THRUSTERS', desc: '+12% move speed',
    apply: (p) => { p.speed *= 1.12; },
  },
  {
    id: 'hull', name: 'REINFORCED HULL', desc: '+25 max HP, heal 25',
    apply: (p) => { p.maxHp += 25; p.hp = Math.min(p.maxHp, p.hp + 25); },
  },
  {
    id: 'multishot', name: 'SPLIT SHOT', desc: '+1 bolt per volley',
    apply: (p) => { p.shots += 1; },
  },
  {
    id: 'pierce', name: 'LANCE ROUNDS', desc: 'Bolts pierce +1 enemy',
    apply: (p) => { p.pierce += 1; },
  },
  {
    id: 'magnet', name: 'TRACTOR FIELD', desc: '+70% gem magnet radius',
    apply: (p) => { p.magnetRadius *= 1.7; },
  },
  {
    id: 'nova', name: 'NOVA PULSE', desc: 'A ring of 12 bolts every 6s',
    apply: (p) => {
      if (p.novaInterval > 0) p.novaInterval *= 0.8;
      else { p.novaInterval = 6; p.novaTimer = 6; }
    },
  },
];
