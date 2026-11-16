// Touch controls: a joystick under the left thumb that appears where the thumb lands, and Jump, Action and
// (where a chapter uses it) Slide under the right. Dragging anywhere else turns the camera.
import type { Input } from '../core/input';
import { h } from './hud';

export class TouchControls {
  private root: HTMLElement;
  private base: HTMLDivElement;
  private knob: HTMLDivElement;
  private jump: HTMLDivElement;
  private action: HTMLDivElement;
  private slide: HTMLDivElement;
  private stickId: number | null = null;
  private lookId: number | null = null;
  private origin = { x: 0, y: 0 };
  private last = { x: 0, y: 0 };
  private actionLabel = '';
  private readonly radius = 54;
  enabled = false;

  constructor(private input: Input, canvas: HTMLCanvasElement) {
    this.root = document.getElementById('touch')!;
    this.base = h('div', 'stick-base');
    this.knob = h('div', 'stick-knob');
    this.base.append(this.knob);
    this.jump = h('div', 'tbtn jump', 'Jump');
    this.action = h('div', 'tbtn action', 'Use');
    this.slide = h('div', 'tbtn slide off', 'Slide');
    this.root.append(this.base, this.slide, this.action, this.jump);

    const bind = (el: HTMLElement, key: 'jump' | 'action' | 'slide') => {
      const down = (e: PointerEvent) => {
        e.preventDefault();
        e.stopPropagation();
        el.setPointerCapture(e.pointerId);
        el.classList.add('down');
        this.input.touch[key] = true;
        this.input.touched();
      };
      const up = (e: PointerEvent) => {
        e.preventDefault();
        el.classList.remove('down');
        this.input.touch[key] = false;
      };
      el.addEventListener('pointerdown', down);
      el.addEventListener('pointerup', up);
      el.addEventListener('pointercancel', up);
      el.addEventListener('lostpointercapture', up);
    };
    bind(this.jump, 'jump');
    bind(this.action, 'action');
    bind(this.slide, 'slide');

    canvas.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse') return;
      this.show(true);
      this.input.touched();
      const w = canvas.clientWidth;
      if (this.stickId === null && e.clientX < w * 0.46) {
        this.stickId = e.pointerId;
        this.origin.x = e.clientX;
        this.origin.y = e.clientY;
        this.base.style.left = `${e.clientX}px`;
        this.base.style.top = `${e.clientY}px`;
        this.base.style.bottom = 'auto';
        this.base.classList.add('live');
        canvas.setPointerCapture(e.pointerId);
      } else if (this.lookId === null) {
        this.lookId = e.pointerId;
        this.last.x = e.clientX;
        this.last.y = e.clientY;
        canvas.setPointerCapture(e.pointerId);
      }
    });
    canvas.addEventListener('pointermove', (e) => {
      if (e.pointerId === this.stickId) {
        let dx = e.clientX - this.origin.x;
        let dy = e.clientY - this.origin.y;
        const m = Math.hypot(dx, dy);
        if (m > this.radius) {
          // the base follows a thumb that drags past its edge
          this.origin.x += (dx / m) * (m - this.radius);
          this.origin.y += (dy / m) * (m - this.radius);
          this.base.style.left = `${this.origin.x}px`;
          this.base.style.top = `${this.origin.y}px`;
          dx = (dx / m) * this.radius;
          dy = (dy / m) * this.radius;
        }
        this.knob.style.transform = `translate(${dx}px, ${dy}px)`;
        const nx = dx / this.radius;
        const ny = dy / this.radius;
        const nm = Math.hypot(nx, ny);
        const dead = 0.14;
        if (nm < dead) {
          this.input.touch.moveX = 0;
          this.input.touch.moveY = 0;
        } else {
          const k = Math.min(1, (nm - dead) / (0.86 - dead)) / nm;
          this.input.touch.moveX = nx * k;
          this.input.touch.moveY = -ny * k;
        }
      } else if (e.pointerId === this.lookId) {
        this.input.touch.lookX += e.clientX - this.last.x;
        this.input.touch.lookY += e.clientY - this.last.y;
        this.last.x = e.clientX;
        this.last.y = e.clientY;
      }
    });
    const end = (e: PointerEvent) => {
      if (e.pointerId === this.stickId) {
        this.stickId = null;
        this.input.touch.moveX = 0;
        this.input.touch.moveY = 0;
        this.knob.style.transform = '';
        this.base.classList.remove('live');
        this.base.style.left = '';
        this.base.style.top = '';
        this.base.style.bottom = '';
      } else if (e.pointerId === this.lookId) this.lookId = null;
    };
    canvas.addEventListener('pointerup', end);
    canvas.addEventListener('pointercancel', end);
  }

  show(on: boolean) {
    if (on === this.enabled) return;
    this.enabled = on;
    this.root.classList.toggle('on', on);
  }

  /** Whether the Slide button is offered (only chapters that slide). */
  setSlide(on: boolean, label = 'Slide') {
    this.slide.classList.toggle('off', !on);
    this.slide.textContent = label;
  }

  setJump(label: string) {
    this.jump.textContent = label;
  }

  /** The Action button's word and whether there is something to use. */
  setAction(label: string | null, progress = 0) {
    const text = label ?? 'Use';
    if (text !== this.actionLabel) {
      this.actionLabel = text;
      // keep it to a word or two: the button is small
      this.action.textContent = text.split(' · ')[0];
    }
    this.action.classList.toggle('lit', label !== null);
    this.action.style.setProperty('--p', String(progress));
  }

  /** Lets go of everything (a menu opened). */
  release() {
    this.input.touch.moveX = this.input.touch.moveY = 0;
    this.input.touch.jump = this.input.touch.action = this.input.touch.slide = false;
    this.stickId = this.lookId = null;
    this.knob.style.transform = '';
    for (const b of [this.jump, this.action, this.slide]) b.classList.remove('down');
  }
}
