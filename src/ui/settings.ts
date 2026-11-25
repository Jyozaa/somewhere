export interface UISettings {
  master: number;
  music: number;
  ambience: number;
  reducedMotion: boolean;
  quality: 'low' | 'medium' | 'high';
  highContrast: boolean;
}

export function loadSettings(): UISettings {
  const defaults: UISettings = { master: 0.8, music: 0.6, ambience: 0.8, reducedMotion: false, quality: 'high', highContrast: false };
  try {
    const raw = localStorage.getItem('somewhere.settings.v1');
    if (!raw) return defaults;
    return { ...defaults, ...(JSON.parse(raw) as Partial<UISettings>) };
  } catch {
    return defaults;
  }
}

export function saveSettings(settings: UISettings): void {
  try {
    localStorage.setItem('somewhere.settings.v1', JSON.stringify(settings));
  } catch {
    // Non-fatal.
  }
}
