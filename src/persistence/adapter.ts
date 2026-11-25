/** Local persistence adapter with validation. Used until a moderated backend is configured. */

export interface EchoRecord {
  id: string;
  contributorId: string;
  anchorId: string;
  createdAt: number;
  paletteIndex: number;
  gesture: 'look' | 'wave' | 'shiver' | 'breathe';
  durationMs: number;
  /** Authored demonstration content must stay clearly labelled. */
  authored: boolean;
  message?: string;
}

export interface BottleRecord {
  id: string;
  contributorId: string;
  createdAt: number;
  text: string;
  releasedAt: number;
  foundAt?: number;
  reports: number;
}

export interface FlowerContribution {
  id: string;
  contributorId: string;
  slot: number;
  createdAt: number;
  color: number;
}

export interface PersistedWorld {
  echoes: EchoRecord[];
  bottles: BottleRecord[];
  flowers: FlowerContribution[];
  ownContributions: string[];
  visits: number;
  lastVisit: number;
}

const KEY = 'somewhere.world.v1';
const IDENTITY_KEY = 'somewhere.visitor.v1';

export function createVisitorId(): string {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export function getVisitorId(): string {
  try {
    const existing = localStorage.getItem(IDENTITY_KEY);
    if (existing && /^[a-f0-9]{24}$/.test(existing)) return existing;
    const id = createVisitorId();
    localStorage.setItem(IDENTITY_KEY, id);
    return id;
  } catch {
    return createVisitorId();
  }
}

export function loadWorld(): PersistedWorld {
  const empty: PersistedWorld = { echoes: [], bottles: [], flowers: [], ownContributions: [], visits: 0, lastVisit: 0 };
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return empty;
    const parsed = JSON.parse(raw) as Partial<PersistedWorld>;
    return {
      echoes: Array.isArray(parsed.echoes) ? parsed.echoes.filter(isEcho) : [],
      bottles: Array.isArray(parsed.bottles) ? parsed.bottles.filter(isBottle) : [],
      flowers: Array.isArray(parsed.flowers) ? parsed.flowers.filter(isFlower) : [],
      ownContributions: Array.isArray(parsed.ownContributions) ? parsed.ownContributions.filter((v) => typeof v === 'string') : [],
      visits: typeof parsed.visits === 'number' ? parsed.visits : 0,
      lastVisit: typeof parsed.lastVisit === 'number' ? parsed.lastVisit : 0,
    };
  } catch {
    return empty;
  }
}

export function saveWorld(world: PersistedWorld): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(world));
  } catch {
    // Storage can be unavailable in private browsing; the experience must still run.
  }
}

export function isEcho(v: unknown): v is EchoRecord {
  if (!v || typeof v !== 'object') return false;
  const e = v as Record<string, unknown>;
  return typeof e.id === 'string' && typeof e.anchorId === 'string' && typeof e.createdAt === 'number'
    && typeof e.paletteIndex === 'number' && typeof e.durationMs === 'number' && typeof e.authored === 'boolean'
    && (e.message === undefined || (typeof e.message === 'string' && e.message.length <= 140));
}

export function isBottle(v: unknown): v is BottleRecord {
  if (!v || typeof v !== 'object') return false;
  const b = v as Record<string, unknown>;
  return typeof b.id === 'string' && typeof b.text === 'string' && b.text.length > 0 && b.text.length <= 180
    && typeof b.createdAt === 'number' && typeof b.releasedAt === 'number';
}

export function isFlower(v: unknown): v is FlowerContribution {
  if (!v || typeof v !== 'object') return false;
  const f = v as Record<string, unknown>;
  return typeof f.id === 'string' && typeof f.slot === 'number' && typeof f.createdAt === 'number' && typeof f.color === 'number';
}
