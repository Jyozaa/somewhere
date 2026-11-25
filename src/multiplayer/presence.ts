import { PLAYER_PALETTES } from '../config/world';
import type { CharacterAnimation } from '../core/contracts';

export interface RemoteVisitor {
  id: string;
  paletteIndex: number;
  x: number;
  y: number;
  z: number;
  yaw: number;
  speed: number;
  sitting: boolean;
  animation: CharacterAnimation;
  lastSeen: number;
  /** Smoothed render position. */
  renderX: number;
  renderY: number;
  renderZ: number;
  renderYaw: number;
}

interface PresenceMessage {
  t: 'hello' | 'state' | 'bye';
  id: string;
  palette: number;
  x: number;
  z: number;
  y: number;
  yaw: number;
  speed: number;
  sitting: boolean;
  anim: CharacterAnimation;
  at: number;
}

const CHANNEL = 'somewhere.presence.v1';
const SEND_INTERVAL = 1 / 12;
const STALE_MS = 9000;
const ANIMATIONS = new Set(['idle', 'walk', 'run', 'sit', 'wave', 'interact', 'hold', 'stand']);

export interface PresenceLocalState {
  x: number;
  y: number;
  z: number;
  yaw: number;
  speed: number;
  sitting: boolean;
  anim: CharacterAnimation;
}

export interface PresenceSystem {
  update(dt: number, local: PresenceLocalState): void;
  remotes(): RemoteVisitor[];
  count(): number;
  setEnabled(enabled: boolean): void;
  dispose(): void;
}

function valid(msg: unknown): msg is PresenceMessage {
  if (!msg || typeof msg !== 'object') return false;
  const m = msg as Record<string, unknown>;
  return (m.t === 'hello' || m.t === 'state' || m.t === 'bye')
    && typeof m.id === 'string' && m.id.length === 24
    && typeof m.palette === 'number' && Number.isInteger(m.palette) && m.palette >= 0 && m.palette < PLAYER_PALETTES.length
    && typeof m.x === 'number' && Number.isFinite(m.x) && Math.abs(m.x) < 400
    && typeof m.z === 'number' && Number.isFinite(m.z) && Math.abs(m.z) < 400
    && typeof m.y === 'number' && Number.isFinite(m.y)
    && typeof m.yaw === 'number' && Number.isFinite(m.yaw)
    && typeof m.speed === 'number' && Number.isFinite(m.speed)
    && typeof m.sitting === 'boolean'
    && typeof m.anim === 'string' && ANIMATIONS.has(m.anim)
    && typeof m.at === 'number';
}

export function createPresence(visitorId: string, paletteIndex: number): PresenceSystem {
  let channel: BroadcastChannel | null = null;
  let enabled = true;
  let lastSend = 0;
  const visitors = new Map<string, RemoteVisitor>();

  try {
    channel = new BroadcastChannel(CHANNEL);
  } catch {
    channel = null;
  }

  const send = (t: PresenceMessage['t'], local: PresenceLocalState): void => {
    if (!channel || !enabled) return;
    const msg: PresenceMessage = {
      t,
      id: visitorId,
      palette: paletteIndex,
      x: Number(local.x.toFixed(2)),
      y: Number(local.y.toFixed(2)),
      z: Number(local.z.toFixed(2)),
      yaw: Number(local.yaw.toFixed(3)),
      speed: Number(local.speed.toFixed(2)),
      sitting: local.sitting,
      anim: local.anim,
      at: Date.now(),
    };
    channel.postMessage(msg);
  };

  channel?.addEventListener('message', (event: MessageEvent<unknown>) => {
    if (!valid(event.data)) return;
    const msg = event.data;
    if (msg.id === visitorId) return;
    if (!enabled) return;
    if (msg.t === 'bye') {
      visitors.delete(msg.id);
      return;
    }
    const existing = visitors.get(msg.id);
    if (!existing) {
      visitors.set(msg.id, {
        id: msg.id,
        paletteIndex: msg.palette,
        x: msg.x, y: msg.y, z: msg.z, yaw: msg.yaw,
        speed: 0,
        sitting: msg.sitting,
        animation: msg.anim,
        lastSeen: Date.now(),
        renderX: msg.x, renderY: msg.y, renderZ: msg.z, renderYaw: msg.yaw,
      });
      if (msg.t === 'hello') send('hello', { x: msg.x, y: msg.y, z: msg.z, yaw: msg.yaw, speed: 0, sitting: msg.sitting, anim: msg.anim });
      return;
    }
    existing.paletteIndex = msg.palette;
    existing.x = msg.x;
    existing.z = msg.z;
    existing.y = msg.y;
    existing.yaw = msg.yaw;
    existing.speed = msg.speed;
    existing.sitting = msg.sitting;
    existing.animation = msg.anim;
    existing.lastSeen = Date.now();
  });

  window.addEventListener('pagehide', () => {
    const last = visitors.values().next();
    void last;
    send('bye', { x: 0, y: 0, z: 0, yaw: 0, speed: 0, sitting: false, anim: 'idle' });
  });

  let elapsed = 0;
  let lastLocal: PresenceLocalState = { x: 0, y: 0, z: 0, yaw: 0, speed: 0, sitting: false, anim: 'idle' };
  return {
    update(dt, local) {
      if (!enabled) return;
      lastLocal = local;
      elapsed += dt;
      if (elapsed - lastSend >= SEND_INTERVAL) {
        lastSend = elapsed;
        send('state', local);
      }
      const now = Date.now();
      for (const [id, v] of visitors) {
        if (now - v.lastSeen > STALE_MS) visitors.delete(id);
      }
    },
    remotes: () => [...visitors.values()],
    count: () => visitors.size,
    setEnabled(value) {
      enabled = value;
      if (!value) {
        visitors.clear();
        return;
      }
      send('hello', lastLocal);
    },
    dispose() {
      send('bye', lastLocal);
      channel?.close();
      channel = null;
      visitors.clear();
    },
  };
}
