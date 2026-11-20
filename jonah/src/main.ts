import './ui/style.css';
import { Game } from './game/game';
import { REGISTRY } from './levels';

const canvas = document.getElementById('view') as HTMLCanvasElement;
const game = new Game(canvas, REGISTRY);
(window as unknown as { __jonah: Game }).__jonah = game;
game.boot().catch((err) => {
  console.error(err);
  const boot = document.getElementById('boot');
  if (boot) boot.querySelector('.boot-sub')!.textContent = 'This device could not start the game';
});
