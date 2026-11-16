// Keyboard and mouse state, in canvas pixels. The world reads movement and
// aim from here every step, and edge-triggered actions through consume().
// Shot scenes feed the world a plain object with the same shape instead.
import { VIEW } from './config.js';

const KEY_ACTIONS = {
  Enter: 'start',
  ' ': 'start',
  p: 'pause',
  P: 'pause',
  Escape: 'pause',
  r: 'restart',
  R: 'restart',
  m: 'mute',
  M: 'mute',
  1: 'choice0',
  2: 'choice1',
  3: 'choice2',
};

export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.pressed = new Set();
    this.mouse = { x: VIEW.width / 2, y: VIEW.height - 120, down: false };
    window.addEventListener('keydown', (event) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(event.key)) {
        event.preventDefault();
      }
      this.keys.add(event.key.length === 1 ? event.key.toLowerCase() : event.key);
      const action = KEY_ACTIONS[event.key];
      if (action) this.pressed.add(action);
    });
    window.addEventListener('keyup', (event) => {
      this.keys.delete(event.key.length === 1 ? event.key.toLowerCase() : event.key);
    });
    window.addEventListener('blur', () => { this.keys.clear(); });
    canvas.addEventListener('mousemove', (event) => this.trackMouse(event));
    canvas.addEventListener('mousedown', (event) => {
      this.trackMouse(event);
      this.mouse.down = true;
      this.pressed.add('click');
    });
    window.addEventListener('mouseup', () => { this.mouse.down = false; });
  }

  trackMouse(event) {
    const rect = this.canvas.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * VIEW.width;
    this.mouse.y = ((event.clientY - rect.top) / rect.height) * VIEW.height;
  }

  get moveX() {
    let x = 0;
    if (this.keys.has('a') || this.keys.has('ArrowLeft')) x -= 1;
    if (this.keys.has('d') || this.keys.has('ArrowRight')) x += 1;
    return x;
  }

  get moveY() {
    let y = 0;
    if (this.keys.has('w') || this.keys.has('ArrowUp')) y -= 1;
    if (this.keys.has('s') || this.keys.has('ArrowDown')) y += 1;
    return y;
  }

  get aimX() { return this.mouse.x; }
  get aimY() { return this.mouse.y; }

  /** True once per key press or click; the world consumes it. */
  consume(action) {
    if (!this.pressed.has(action)) return false;
    this.pressed.delete(action);
    return true;
  }
}
