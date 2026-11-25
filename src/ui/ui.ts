import type { UISettings } from './settings';
import './styles.css';

export interface ReadingAction {
  label: string;
  value: string;
}

export interface ComposerOptions {
  title: string;
  hint: string;
  maxLength: number;
  submitLabel: string;
  onSubmit: (text: string) => void;
  onCancel: () => void;
}

export class UI {
  private readonly root: HTMLElement;
  private readonly loading: HTMLElement;
  private readonly bar: HTMLElement;
  private readonly enterButton: HTMLButtonElement;
  private readonly promptEl: HTMLElement;
  private readonly promptKey: HTMLElement;
  private readonly promptText: HTMLElement;
  private readonly echoLabel: HTMLElement;
  private readonly toastEl: HTMLElement;
  private readonly presenceEl: HTMLElement;
  private readonly captionEl: HTMLElement;
  private readonly hintEl: HTMLElement;
  private readonly settingsPanel: HTMLElement;
  private readonly readingPanel: HTMLElement;
  private readonly composerPanel: HTMLElement;
  private readonly live: HTMLElement;
  private toastTimer = 0;
  private captionTimer = 0;
  private settingsOpen = false;
  private composerOpen = false;
  private readingOpen = false;
  private lastPrompt = '';

  constructor(root: HTMLElement) {
    this.root = root;
    root.innerHTML = `
      <div class="loading">
        <div class="loading__inner">
          <h1>somewhere<span>.</span></h1>
          <p class="loading__line">Someone, somewhere, is experiencing life at the same time as you.</p>
          <div class="loading__bar"><i></i></div>
          <p class="loading__hint">Best with sound · headphones recommended</p>
          <button class="enter" hidden>Enter the island</button>
        </div>
      </div>
      <div class="grain" aria-hidden="true"></div>
      <div class="hud">
        <button class="settings-btn" aria-label="Open settings" title="Settings">◌</button>
        <p class="presence" aria-live="polite"></p>
        <div class="prompt"><kbd>E</kbd><span></span></div>
        <div class="echo-label" role="status"></div>
        <p class="toast" role="status"></p>
        <p class="control-hint">WASD move · E interact · Q wave · Shift walk faster · Esc menu</p>
        <p class="caption"></p>
      </div>
      <section class="panel settings" hidden aria-label="Settings">
        <button class="close-btn" aria-label="Close settings">×</button>
        <h2>Settings</h2>
        <p class="sub">A quiet place, on your terms</p>
        <div class="field"><label>Master volume <output data-out="master"></output></label><input type="range" data-audio="master" min="0" max="1" step="0.01" /></div>
        <div class="field"><label>Ambience <output data-out="ambience"></output></label><input type="range" data-audio="ambience" min="0" max="1" step="0.01" /></div>
        <div class="field"><label>Music <output data-out="music"></output></label><input type="range" data-audio="music" min="0" max="1" step="0.01" /></div>
        <div class="toggle"><span>Reduced motion</span><button data-toggle="reducedMotion" aria-pressed="false">Off</button></div>
        <div class="toggle"><span>High-contrast text</span><button data-toggle="highContrast" aria-pressed="false">Off</button></div>
        <div class="field" style="margin-top:18px"><label>Graphics quality</label><div class="segmented" data-quality><button data-q="low">Low</button><button data-q="medium">Medium</button><button data-q="high">High</button></div></div>
        <div class="toggle"><span>Erase my contributions</span><button data-erase>Erase</button></div>
        <p class="fine">Your messages and moments are stored on this device only. This build has no public messaging backend and no moderation service, so free-text sharing stays local. Never enter personal information.</p>
      </section>
      <section class="panel reading" hidden aria-label="A message in a bottle">
        <blockquote></blockquote>
        <p class="meta"></p>
        <div class="actions"></div>
      </section>
      <section class="panel composer" hidden aria-label="Write a message">
        <h2></h2>
        <p></p>
        <textarea maxlength="180" aria-label="Your message"></textarea>
        <div class="row"><span class="count"></span><div class="actions"><button data-cancel>Cancel</button><button class="primary" data-send></button></div></div>
      </section>
    `;
    const q = <T extends HTMLElement>(selector: string): T => {
      const el = root.querySelector<T>(selector);
      if (!el) throw new Error(`UI element missing: ${selector}`);
      return el;
    };
    this.loading = q('.loading');
    this.bar = q('.loading__bar i');
    this.enterButton = q('.enter');
    this.promptEl = q('.prompt');
    this.promptKey = q('.prompt kbd');
    this.promptText = q('.prompt span');
    this.echoLabel = q('.echo-label');
    this.toastEl = q('.toast');
    this.presenceEl = q('.presence');
    this.captionEl = q('.caption');
    this.hintEl = q('.control-hint');
    this.settingsPanel = q('.settings');
    this.readingPanel = q('.reading');
    this.composerPanel = q('.composer');
    this.live = document.getElementById('a11y-live') ?? this.root;

    q('.settings-btn').addEventListener('click', () => {
      if (this.settingsOpen) this.closeSettings();
      else this.openSettings(this.currentSettings, this.settingsHandler);
    });
    q('.settings .close-btn').addEventListener('click', () => this.closeSettings());
    q('[data-erase]').addEventListener('click', () => {
      this.eraseHandler?.();
      this.toast('Your contributions have been erased from this device.');
    });

    this.settingsPanel.querySelectorAll<HTMLInputElement>('[data-audio]').forEach((input) => {
      input.addEventListener('input', () => {
        const key = input.dataset.audio as 'master' | 'ambience' | 'music';
        this.currentSettings = { ...this.currentSettings, [key]: Number(input.value) };
        this.renderSettings();
        this.settingsHandler?.(this.currentSettings);
      });
    });
    this.settingsPanel.querySelectorAll<HTMLButtonElement>('[data-toggle]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const key = btn.dataset.toggle as 'reducedMotion' | 'highContrast';
        this.currentSettings = { ...this.currentSettings, [key]: !this.currentSettings[key] };
        this.renderSettings();
        this.settingsHandler?.(this.currentSettings);
      });
    });
    this.settingsPanel.querySelectorAll<HTMLButtonElement>('[data-q]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const quality = btn.dataset.q as UISettings['quality'];
        this.currentSettings = { ...this.currentSettings, quality };
        this.renderSettings();
        this.settingsHandler?.(this.currentSettings);
      });
    });
  }

  private currentSettings: UISettings = { master: 0.8, music: 0.6, ambience: 0.8, reducedMotion: false, quality: 'high', highContrast: false };
  private settingsHandler?: (s: UISettings) => void;
  private eraseHandler?: () => void;

  wireSettings(settings: UISettings, onChange: (s: UISettings) => void, onErase: () => void): void {
    this.currentSettings = settings;
    this.settingsHandler = onChange;
    this.eraseHandler = onErase;
    this.renderSettings();
    this.applyAccessibility(settings);
  }

  setLoadingProgress(fraction: number): void {
    this.bar.style.width = `${Math.round(Math.min(1, Math.max(0, fraction)) * 100)}%`;
  }

  ready(onEnter: () => void): void {
    this.setLoadingProgress(1);
    this.enterButton.hidden = false;
    this.enterButton.addEventListener('click', () => {
      this.enterButton.disabled = true;
      this.loading.classList.add('is-out');
      window.setTimeout(() => { this.loading.style.display = 'none'; }, 1800);
      onEnter();
    }, { once: true });
    this.enterButton.focus({ preventScroll: true });
  }

  showCaption(text: string, ms = 9000): void {
    window.clearTimeout(this.captionTimer);
    this.captionEl.textContent = text;
    this.captionEl.classList.add('is-on');
    this.captionTimer = window.setTimeout(() => this.captionEl.classList.remove('is-on'), ms);
  }

  setPrompt(text: string | null, key = 'E'): void {
    if (text === this.lastPrompt) return;
    this.lastPrompt = text ?? '';
    if (!text) {
      this.promptEl.classList.remove('is-on');
      return;
    }
    this.promptKey.textContent = key;
    this.promptText.textContent = text;
    this.promptEl.classList.add('is-on');
  }

  showEcho(text: string, sub?: string): void {
    this.echoLabel.replaceChildren();
    const main = document.createElement('span');
    main.textContent = text;
    this.echoLabel.append(main);
    if (sub) {
      const small = document.createElement('small');
      small.textContent = sub;
      this.echoLabel.append(small);
    }
    this.echoLabel.classList.add('is-on');
  }

  hideEcho(): void {
    this.echoLabel.classList.remove('is-on');
  }

  toast(text: string, ms = 4600): void {
    window.clearTimeout(this.toastTimer);
    this.toastEl.textContent = text;
    this.toastEl.classList.add('is-on');
    this.live.textContent = text;
    this.toastTimer = window.setTimeout(() => this.toastEl.classList.remove('is-on'), ms);
  }

  setPresence(present: boolean): void {
    this.presenceEl.textContent = present ? 'someone else is here' : '';
    this.presenceEl.classList.toggle('is-on', present);
  }

  setControlHint(visible: boolean): void {
    this.hintEl.classList.toggle('is-hidden', !visible);
  }

  get modalOpen(): boolean {
    return this.settingsOpen || this.composerOpen || this.readingOpen;
  }

  openSettings(settings: UISettings, onChange?: (s: UISettings) => void): void {
    if (onChange) this.settingsHandler = onChange;
    this.currentSettings = settings;
    this.renderSettings();
    this.settingsPanel.hidden = false;
    this.settingsOpen = true;
    this.promptEl.classList.remove('is-on');
    this.settingsPanel.querySelector<HTMLElement>('.settings-btn');
    (this.settingsPanel.querySelector('.close-btn') as HTMLElement | null)?.focus();
  }

  closeSettings(): void {
    this.settingsPanel.hidden = true;
    this.settingsOpen = false;
  }

  toggleSettings(): void {
    if (this.settingsOpen) this.closeSettings();
    else this.openSettings(this.currentSettings, this.settingsHandler);
  }

  closeAll(): void {
    this.closeSettings();
    this.readingPanel.hidden = true;
    this.readingOpen = false;
    this.composerPanel.hidden = true;
    this.composerOpen = false;
  }

  private renderSettings(): void {
    const s = this.currentSettings;
    this.settingsPanel.querySelectorAll<HTMLInputElement>('[data-audio]').forEach((input) => {
      const key = input.dataset.audio as 'master' | 'ambience' | 'music';
      input.value = String(s[key]);
      const out = this.settingsPanel.querySelector<HTMLOutputElement>(`[data-out="${key}"]`);
      if (out) out.textContent = `${Math.round(s[key] * 100)}%`;
    });
    this.settingsPanel.querySelectorAll<HTMLButtonElement>('[data-toggle]').forEach((btn) => {
      const key = btn.dataset.toggle as 'reducedMotion' | 'highContrast';
      btn.setAttribute('aria-pressed', String(s[key]));
      btn.textContent = s[key] ? 'On' : 'Off';
    });
    this.settingsPanel.querySelectorAll<HTMLButtonElement>('[data-q]').forEach((btn) => {
      btn.setAttribute('aria-pressed', String(btn.dataset.q === s.quality));
    });
    this.applyAccessibility(s);
  }

  applyAccessibility(s: UISettings): void {
    document.documentElement.classList.toggle('reduced-motion', s.reducedMotion);
    document.documentElement.classList.toggle('high-contrast', s.highContrast);
  }

  async compose(options: ComposerOptions): Promise<void> {
    this.composerOpen = true;
    this.composerPanel.hidden = false;
    this.setPrompt(null);
    const h2 = this.composerPanel.querySelector('h2')!;
    const p = this.composerPanel.querySelector('p')!;
    const textarea = this.composerPanel.querySelector('textarea')!;
    const count = this.composerPanel.querySelector('.count')!;
    const send = this.composerPanel.querySelector<HTMLButtonElement>('[data-send]')!;
    const cancel = this.composerPanel.querySelector<HTMLButtonElement>('[data-cancel]')!;
    h2.textContent = options.title;
    p.textContent = options.hint;
    textarea.value = '';
    textarea.maxLength = options.maxLength;
    send.textContent = options.submitLabel;
    send.disabled = true;
    count.textContent = `0 / ${options.maxLength}`;
    const update = (): void => {
      const length = textarea.value.trim().length;
      count.textContent = `${textarea.value.length} / ${options.maxLength}`;
      send.disabled = length < 2;
    };
    textarea.addEventListener('input', update);
    const close = (): void => {
      this.composerPanel.hidden = true;
      this.composerOpen = false;
      textarea.removeEventListener('input', update);
      send.onclick = null;
      cancel.onclick = null;
    };
    cancel.onclick = () => { close(); options.onCancel(); };
    send.onclick = () => {
      const text = textarea.value.trim();
      if (text.length < 2) return;
      close();
      options.onSubmit(text.slice(0, options.maxLength));
    };
    textarea.focus();
  }

  readBottle(text: string, meta: string, actions: ReadingAction[]): Promise<string> {
    this.readingOpen = true;
    this.readingPanel.hidden = false;
    this.setPrompt(null);
    this.readingPanel.querySelector('blockquote')!.textContent = text;
    this.readingPanel.querySelector('.meta')!.textContent = meta;
    const actionRow = this.readingPanel.querySelector('.actions')!;
    actionRow.replaceChildren();
    return new Promise((resolve) => {
      for (const action of actions) {
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = action.label;
        button.addEventListener('click', () => {
          this.readingPanel.hidden = true;
          this.readingOpen = false;
          resolve(action.value);
        });
        actionRow.append(button);
      }
      (actionRow.querySelector('button') as HTMLButtonElement | null)?.focus();
    });
  }

  get hasOpenPanel(): boolean {
    return this.modalOpen;
  }
}
