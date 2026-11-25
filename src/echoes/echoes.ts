import type { EchoRecord, PersistedWorld } from '../persistence/adapter';

const WORD_NUMBERS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];

export function relativeTime(then: number, now = Date.now()): string {
  const seconds = Math.max(0, Math.floor((now - then) / 1000));
  if (seconds < 45) return 'moments ago';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return minutes === 1 ? 'a minute ago' : `${minutes} minutes ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return hours === 1 ? 'an hour ago' : `${hours} hours ago`;
  const days = Math.floor(hours / 24);
  if (days <= 10) return `${WORD_NUMBERS[days] ?? days} ${days === 1 ? 'day' : 'days'} ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return weeks === 1 ? 'a week ago' : `${weeks} weeks ago`;
  const months = Math.floor(days / 30);
  return months <= 1 ? 'a month ago' : `${months} months ago`;
}

export interface EchoManager {
  forAnchor(anchorId: string): EchoRecord | undefined;
  create(anchorId: string, paletteIndex: number, gesture: EchoRecord['gesture']): EchoRecord;
  ownAt(anchorId: string): EchoRecord | undefined;
  all(): EchoRecord[];
  remove(id: string): void;
  label(echo: EchoRecord): { text: string; sub?: string };
}

export function createEchoManager(world: PersistedWorld, visitorId: string): EchoManager {
  const manager: EchoManager = {
    forAnchor(anchorId) {
      const candidates = world.echoes
        .filter((e) => e.anchorId === anchorId && e.contributorId !== visitorId)
        .sort((a, b) => b.createdAt - a.createdAt);
      return candidates[0];
    },
    create(anchorId, paletteIndex, gesture) {
      const echo: EchoRecord = {
        id: `echo_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
        contributorId: visitorId,
        anchorId,
        createdAt: Date.now(),
        paletteIndex,
        gesture,
        durationMs: 24_000,
        authored: false,
      };
      world.echoes.push(echo);
      // Keep the local world bounded.
      const excess = world.echoes.length - 40;
      if (excess > 0) world.echoes.splice(0, excess);
      world.ownContributions.push(echo.id);
      return echo;
    },
    ownAt(anchorId) {
      return world.echoes.find((e) => e.anchorId === anchorId && e.contributorId === visitorId);
    },
    all: () => world.echoes.slice(),
    remove(id) {
      world.echoes = world.echoes.filter((e) => e.id !== id);
    },
    label(echo) {
      const time = relativeTime(echo.createdAt);
      if (echo.authored) {
        return { text: 'An authored memory rests here.', sub: 'A demonstration — not a real visitor' };
      }
      return {
        text: `Someone sat here ${time}.`,
        sub: echo.message ? echo.message : 'A moment left by another visitor',
      };
    },
  };
  return manager;
}
