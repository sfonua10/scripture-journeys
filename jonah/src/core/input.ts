// One set of actions, fed by keyboard, mouse, touch and controller. Gameplay reads actions, never devices.

export type Device = 'keys' | 'touch' | 'pad';
export type ButtonName = 'jump' | 'action' | 'slide' | 'pause';
export type UiEvent = 'up' | 'down' | 'left' | 'right' | 'confirm' | 'back' | 'pause';

class Button {
  down = false;
  pressed = false;
  released = false;
  /** Seconds it has been held. */
  held = 0;
  private want = false;
  private tap = false;

  set(down: boolean) {
    if (down && !this.want) this.tap = true;
    this.want = down;
  }
  step(dt: number, extra = false) {
    const now = this.want || extra || this.tap;
    this.pressed = now && !this.down;
    this.released = !now && this.down;
    this.down = now;
    this.held = now ? this.held + dt : 0;
    this.tap = false;
  }
  /** Forgets a press, so the button that closed a menu does not also jump. */
  eat() {
    this.pressed = false;
    this.down = false;
    this.want = false;
    this.tap = false;
  }
}

export interface BotInput {
  moveX: number;
  moveY: number;
  jump: boolean;
  action: boolean;
  slide: boolean;
  /** When set, the bot's stick is already in world space (moveX along x, moveY along z) and ignores the camera. */
  world: boolean;
}

const KEYMAP: Record<string, ButtonName> = {
  Space: 'jump',
  KeyE: 'action',
  KeyF: 'action',
  Enter: 'action',
  ShiftLeft: 'slide',
  ShiftRight: 'slide',
  KeyC: 'slide',
  ControlLeft: 'slide',
  KeyP: 'pause',
  Escape: 'pause',
  Tab: 'pause',
};

export class Input {
  /** Stick, x right and y forward, length at most 1. */
  moveX = 0;
  moveY = 0;
  /** Camera turn asked for this frame, in radians (already scaled by sensitivity). */
  lookX = 0;
  lookY = 0;
  readonly jump = new Button();
  readonly action = new Button();
  readonly slide = new Button();
  readonly pause = new Button();
  device: Device = 'keys';
  /** Called whenever the device used last changes, so prompts can follow. */
  onDevice: (d: Device) => void = () => {};
  /** Menu navigation, sent while a menu is open (and for pause, always). */
  onUi: (e: UiEvent) => void = () => {};
  /** Called on the first key, click, touch or pad press: sound may start. */
  onGesture: () => void = () => {};
  sensitivity = 1;
  invertY = false;
  /** While true, gameplay actions read as idle (a menu or a card is up). */
  blocked = false;
  bot: BotInput | null = null;

  /** Written by the touch layer. */
  readonly touch = { moveX: 0, moveY: 0, jump: false, action: false, slide: false, lookX: 0, lookY: 0 };

  private keys = new Set<string>();
  private mouseLook = false;
  private mouseDX = 0;
  private mouseDY = 0;
  private padPrev: boolean[] = [];
  private padStickUi = { x: 0, y: 0, t: 0 };
  private padLive = false;
  private testMode = new URLSearchParams(location.search).has('patch-test');

  constructor(private canvas: HTMLCanvasElement) {
    addEventListener('keydown', (e) => this.key(e, true));
    addEventListener('keyup', (e) => this.key(e, false));
    addEventListener('blur', () => this.releaseAll());
    canvas.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'mouse') return;
      this.setDevice('keys');
      this.onGesture();
      this.mouseLook = true;
      canvas.setPointerCapture(e.pointerId);
    });
    canvas.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse' || !this.mouseLook) return;
      this.mouseDX += e.movementX;
      this.mouseDY += e.movementY;
    });
    const end = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      this.mouseLook = false;
    };
    canvas.addEventListener('pointerup', end);
    canvas.addEventListener('pointercancel', end);
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  private setDevice(d: Device) {
    if (d === this.device) return;
    this.device = d;
    this.onDevice(d);
  }

  /** The touch layer calls this when a finger lands. */
  touched() {
    this.setDevice('touch');
    this.onGesture();
  }

  private key(e: KeyboardEvent, down: boolean) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const target = e.target as HTMLElement | null;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'SELECT')) return;
    const code = e.code;
    const known = code in KEYMAP || /^(Key[WASD]|Arrow(Up|Down|Left|Right))$/.test(code);
    if (!known) return;
    e.preventDefault();
    if (down) {
      this.onGesture();
      this.setDevice('keys');
      if (!e.repeat) {
        if (code === 'ArrowUp' || code === 'KeyW') this.onUi('up');
        else if (code === 'ArrowDown' || code === 'KeyS') this.onUi('down');
        else if (code === 'ArrowLeft' || code === 'KeyA') this.onUi('left');
        else if (code === 'ArrowRight' || code === 'KeyD') this.onUi('right');
        else if (code === 'Enter' || code === 'Space' || code === 'KeyE') this.onUi('confirm');
        else if (code === 'Escape' || code === 'Backspace') this.onUi('back');
        if (KEYMAP[code] === 'pause') this.onUi('pause');
      } else if (/^Arrow|^Key[WASD]$/.test(code)) {
        // held arrow keys walk through a menu
        this.onUi(code === 'ArrowUp' || code === 'KeyW' ? 'up' : code === 'ArrowDown' || code === 'KeyS' ? 'down' : code === 'ArrowLeft' || code === 'KeyA' ? 'left' : 'right');
      }
      this.keys.add(code);
    } else this.keys.delete(code);
    const name = KEYMAP[code];
    if (name && name !== 'pause') this[name].set(down || this.anyKeyFor(name));
  }

  private anyKeyFor(name: ButtonName) {
    for (const k of this.keys) if (KEYMAP[k] === name) return true;
    return false;
  }

  releaseAll() {
    this.keys.clear();
    this.jump.set(false);
    this.action.set(false);
    this.slide.set(false);
    this.mouseLook = false;
  }

  /** Forgets what is held, so the press that closed a menu is not also played. */
  eatAll() {
    this.jump.eat();
    this.action.eat();
    this.slide.eat();
    this.pause.eat();
  }

  private pollPad(dt: number) {
    let pad: Gamepad | null = null;
    if (!this.testMode && navigator.getGamepads) {
      for (const p of navigator.getGamepads()) {
        if (p && p.connected && p.mapping === 'standard') {
          pad = p;
          break;
        }
      }
    }
    const out = { x: 0, y: 0, lx: 0, ly: 0, jump: false, action: false, slide: false };
    if (!pad) {
      this.padLive = false;
      return out;
    }
    const b = pad.buttons.map((x) => x.pressed);
    const edge = (i: number) => b[i] && !this.padPrev[i];
    const dead = (x: number, y: number) => {
      const m = Math.hypot(x, y);
      if (m < 0.15) return [0, 0];
      const k = Math.min(1, (m - 0.15) / 0.85) / m;
      return [x * k, y * k];
    };
    const [sx, sy] = dead(pad.axes[0] ?? 0, pad.axes[1] ?? 0);
    const [rx, ry] = dead(pad.axes[2] ?? 0, pad.axes[3] ?? 0);
    const anyButton = b.some((v, i) => v && i !== 16);
    if (anyButton || Math.hypot(sx, sy) > 0.5 || Math.hypot(rx, ry) > 0.5) {
      if (anyButton && !this.padLive) this.onGesture();
      this.padLive = true;
      this.setDevice('pad');
    }
    if (this.padLive) {
      out.x = sx + (b[15] ? 1 : 0) - (b[14] ? 1 : 0);
      out.y = -sy + (b[12] ? 1 : 0) - (b[13] ? 1 : 0);
      // A gentle push aims finely: square the deflection.
      const rm = Math.hypot(rx, ry);
      out.lx = rx * rm * 2.6 * dt;
      out.ly = ry * rm * 1.8 * dt;
      out.jump = !!b[0];
      out.action = !!b[2] || !!b[1] || !!b[7];
      out.slide = !!b[3] || !!b[5] || !!b[6];
      if (edge(9)) this.onUi('pause');
      if (edge(0)) this.onUi('confirm');
      if (edge(1)) this.onUi('back');
      if (edge(12)) this.onUi('up');
      if (edge(13)) this.onUi('down');
      if (edge(14)) this.onUi('left');
      if (edge(15)) this.onUi('right');
      // The stick walks through menus too, one step per push.
      const ui = this.padStickUi;
      ui.t -= dt;
      const dx = Math.abs(sx) > 0.6 ? Math.sign(sx) : 0;
      const dy = Math.abs(sy) > 0.6 ? Math.sign(sy) : 0;
      if ((dx !== ui.x || dy !== ui.y || ui.t <= 0) && (dx || dy)) {
        if (dy) this.onUi(dy < 0 ? 'up' : 'down');
        else this.onUi(dx < 0 ? 'left' : 'right');
        ui.t = dx !== ui.x || dy !== ui.y ? 0.4 : 0.16;
      }
      ui.x = dx;
      ui.y = dy;
    }
    this.padPrev = b;
    return out;
  }

  private padState = { jump: false, action: false, slide: false };

  /** Once a frame: reads the devices. The stick and the look are fresh after this; buttons wait for step(). */
  poll(dt: number) {
    const pad = this.pollPad(dt);
    this.padState.jump = pad.jump;
    this.padState.action = pad.action;
    this.padState.slide = pad.slide;
    let x = 0;
    let y = 0;
    const k = this.keys;
    if (k.has('KeyA') || k.has('ArrowLeft')) x -= 1;
    if (k.has('KeyD') || k.has('ArrowRight')) x += 1;
    if (k.has('KeyW') || k.has('ArrowUp')) y += 1;
    if (k.has('KeyS') || k.has('ArrowDown')) y -= 1;
    x += this.touch.moveX + pad.x;
    y += this.touch.moveY + pad.y;
    if (this.bot) {
      x = this.bot.moveX;
      y = this.bot.moveY;
    }
    const m = Math.hypot(x, y);
    if (m > 1) {
      x /= m;
      y /= m;
    }
    const s = this.sensitivity;
    const inv = this.invertY ? -1 : 1;
    this.lookX = (this.mouseDX * 0.0042 + this.touch.lookX * 0.006) * s + pad.lx * s;
    this.lookY = ((this.mouseDY * 0.0035 + this.touch.lookY * 0.005) * s + pad.ly * s) * inv;
    this.mouseDX = this.mouseDY = 0;
    this.touch.lookX = this.touch.lookY = 0;
    if (this.blocked) {
      this.moveX = this.moveY = 0;
      this.lookX = this.lookY = 0;
    } else {
      this.moveX = x;
      this.moveY = y;
    }
  }

  /**
   * Once per physics step: works out which buttons were pressed or let go. A press is remembered from the moment
   * the key goes down until a step has seen it, so a quick tap between steps is never lost.
   */
  step(dt: number) {
    if (this.blocked) {
      this.jump.step(dt, false);
      this.action.step(dt, false);
      this.slide.step(dt, false);
      this.eatAll();
      return;
    }
    const b = this.bot;
    this.jump.step(dt, b ? b.jump : this.touch.jump || this.padState.jump);
    this.action.step(dt, b ? b.action : this.touch.action || this.padState.action);
    this.slide.step(dt, b ? b.slide : this.touch.slide || this.padState.slide);
  }
}
