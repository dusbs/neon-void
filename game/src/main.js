// Neon Void bootstrap: canvas, input, the fixed-step loop, and the
// deterministic screenshot scenes (?shot=title|play|over&seed=N).
import { VIEW } from './config.js';
import { Input } from './input.js';
import { World } from './world.js';
import { Renderer } from './render.js';
import { buildShotScene } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = VIEW.width;
canvas.height = VIEW.height;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seed = Number(params.get('seed') || 7) || 7;

const input = new Input(canvas);
const world = new World(seed);
const renderer = new Renderer(ctx);

// First gesture unlocks sound; the world unlocks it again on start.
window.addEventListener('keydown', () => world.sound.unlock(), { once: false });
window.addEventListener('mousedown', () => world.sound.unlock(), { once: false });

if (shot) {
  // A screenshot scene: hide the page footer, simulate, draw one frame,
  // and say it is ready.
  const footer = document.querySelector('footer');
  if (footer) footer.style.display = 'none';
  buildShotScene(world, shot, seed);
  renderer.draw(world);
  window.__shotReady = true;
} else {
  const STEP = 1 / 60;
  let last = performance.now();
  let acc = 0;
  function frame(now) {
    let dt = (now - last) / 1000;
    last = now;
    if (dt > 0.25) dt = 0.25;
    acc += dt;
    while (acc >= STEP) {
      world.update(STEP, input);
      acc -= STEP;
    }
    renderer.draw(world);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

// Exposed for debugging and for the play-test harness.
window.__neonVoid = { world, input };
