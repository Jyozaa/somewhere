import type { InputState } from '../core/contracts';

const MOVEMENT_KEYS = new Set([
  'KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight',
]);

export interface InputManager {
  state: InputState;
  /** Pointer parallax in -1..1. */
  pointerX: number;
  pointerY: number;
  consumeInteract(): boolean;
  consumeWave(): boolean;
  consumeLeave(): boolean;
  consumeEscape(): boolean;
  dispose(): void;
}

export function createInput(target: HTMLElement): InputManager {
  const held = new Set<string>();
  const state: InputState = { forward: 0, right: 0, run: false, jump: false };
  let interact = false;
  let wave = false;
  let leave = false;
  let escape = false;

  const input: InputManager = {
    state,
    pointerX: 0,
    pointerY: 0,
    consumeInteract: () => { const v = interact; interact = false; return v; },
    consumeWave: () => { const v = wave; wave = false; return v; },
    consumeLeave: () => { const v = leave; leave = false; return v; },
    consumeEscape: () => { const v = escape; escape = false; return v; },
    dispose: () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      target.removeEventListener('pointermove', onPointerMove);
    },
  };

  function onKeyDown(e: KeyboardEvent): void {
    if (e.repeat) return;
    if (MOVEMENT_KEYS.has(e.code) || e.code === 'Space') e.preventDefault();
    held.add(e.code);
    if (e.code === 'KeyE' || e.code === 'Enter') interact = true;
    if (e.code === 'KeyQ') wave = true;
    if (e.code === 'KeyL') leave = true;
    if (e.code === 'Escape') escape = true;
    if (e.code === 'Space') state.jump = true;
  }

  function onKeyUp(e: KeyboardEvent): void {
    held.delete(e.code);
    if (e.code === 'Space') state.jump = false;
  }

  function onBlur(): void {
    held.clear();
    state.jump = false;
  }

  function onPointerMove(e: PointerEvent): void {
    input.pointerX = (e.clientX / window.innerWidth) * 2 - 1;
    input.pointerY = (e.clientY / window.innerHeight) * 2 - 1;
  }

  // The controller reads this every frame. Recompute from the held-key set so
  // multiple keys can be held at once without key-repeat gaps.
  Object.defineProperties(state, {
    forward: { get: () => (held.has('KeyW') || held.has('ArrowUp') ? 1 : 0) - (held.has('KeyS') || held.has('ArrowDown') ? 1 : 0) },
    right: { get: () => (held.has('KeyD') || held.has('ArrowRight') ? 1 : 0) - (held.has('KeyA') || held.has('ArrowLeft') ? 1 : 0) },
    run: { get: () => held.has('ShiftLeft') || held.has('ShiftRight') },
  });

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);
  target.addEventListener('pointermove', onPointerMove);

  return input;
}
