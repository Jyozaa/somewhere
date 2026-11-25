import {
  ACESFilmicToneMapping,
  BoxGeometry,
  Color,
  CylinderGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  Scene,
  SphereGeometry,
  SRGBColorSpace,
  Vector3,
  WebGLRenderer,
} from 'three';
import type { Object3D } from 'three';
import type {
  CameraMode,
  CharacterAnimation,
  CharacterSystem,
  EnvironmentSample,
  InputState,
  LandmarkSystem,
  OceanSystem,
  SkySystem,
  AtmosphereSystem,
  TerrainSystem,
  VegetationSystem,
  WorldAnchor,
  CameraSystem,
  PlayerController,
} from '../core/contracts';
import { PLAYER_PALETTES, WORLD } from '../config/world';
import { createTerrain } from '../world/terrain';
import { createVegetation } from '../world/vegetation';
import { createLandmarks } from '../world/landmarks';
import { createOcean } from '../rendering/ocean';
import { createSky } from '../rendering/sky';
import { createAtmosphere } from '../rendering/atmosphere';
import { createCharacter } from '../character/character';
import { createPlayerController } from '../character/controller';
import { createCameraSystem } from '../camera/cameraController';
import { createInput, type InputManager } from '../input/input';
import { sampleEnvironment } from '../environment/environment';
import { UI } from '../ui/ui';
import { loadSettings, saveSettings, type UISettings } from '../ui/settings';
import {
  getVisitorId,
  loadWorld,
  saveWorld,
  type BottleRecord,
  type PersistedWorld,
} from '../persistence/adapter';
import { createEchoManager, relativeTime, type EchoManager } from '../echoes/echoes';
import { createAudio, type AudioSystem } from '../audio/audio';
import { createPresence, type PresenceSystem, type RemoteVisitor } from '../multiplayer/presence';

const ZERO_INPUT: InputState = { forward: 0, right: 0, run: false, jump: false };

interface TempAnimation {
  group: Group;
  from: Vector3;
  mid: Vector3;
  to: Vector3;
  age: number;
  duration: number;
  spin: number;
}

export class SomewhereApp {
  private readonly canvas: HTMLCanvasElement;
  private readonly renderer: WebGLRenderer;
  private readonly scene = new Scene();
  private readonly ui: UI;
  private readonly terrain: TerrainSystem;
  private readonly vegetation: VegetationSystem;
  private readonly landmarks: LandmarkSystem;
  private readonly ocean: OceanSystem;
  private readonly sky: SkySystem;
  private readonly atmosphere: AtmosphereSystem;
  private readonly cameraSystem: CameraSystem;
  private readonly player: PlayerController;
  private readonly character: CharacterSystem;
  private readonly input: InputManager;
  private readonly audio: AudioSystem;
  private readonly presence: PresenceSystem;
  private readonly visitorId: string;
  private readonly paletteIndex: number;
  private readonly world: PersistedWorld;
  private readonly echoes: EchoManager;
  private readonly anchors: WorldAnchor[];
  private readonly contributions = new Group();
  private readonly remoteCharacters = new Map<string, CharacterSystem>();

  private settings: UISettings;
  private environment: EnvironmentSample;
  private echoGhost: CharacterSystem | null = null;
  private ghostAge = 0;
  private ghostFade = 0;
  private sittingAnchor: WorldAnchor | null = null;
  private sittingSince = 0;
  private echoRevealed = false;
  private viewpointUntil = 0;
  private waveUntil = 0;
  private arrivalUntil = 0;
  private started = false;
  private time = 0;
  private lastFrame = 0;
  private lastEnvSample = 0;
  private lastPresenceUi = 0;
  private stride = 0;
  private tempAnimation: TempAnimation | null = null;
  private readonly reduceMotionQuery: MediaQueryList;
  private recentVisits = 0;
  private readonly onVisibility = (): void => { this.lastFrame = performance.now(); };

  constructor() {
    const canvas = document.getElementById('scene');
    if (!(canvas instanceof HTMLCanvasElement)) throw new Error('Scene canvas not found');
    const uiRoot = document.getElementById('ui');
    if (!uiRoot) throw new Error('UI root not found');
    this.canvas = canvas;
    this.ui = new UI(uiRoot);
    this.visitorId = getVisitorId();
    this.paletteIndex = parseInt(this.visitorId.slice(0, 6), 16) % PLAYER_PALETTES.length;
    this.world = loadWorld();
    this.recentVisits = this.world.visits;
    this.echoes = createEchoManager(this.world, this.visitorId);
    this.settings = loadSettings();
    this.environment = sampleEnvironment();
    this.reduceMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    this.renderer = new WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: 'high-performance',
      alpha: false,
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight, false);
    this.renderer.setPixelRatio(this.pixelRatioFor(this.settings.quality));
    this.renderer.shadowMap.enabled = true;
    this.renderer.outputColorSpace = SRGBColorSpace;
    this.renderer.toneMapping = ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = this.environment.exposure;

    this.terrain = createTerrain();
    this.scene.add(this.terrain.mesh);
    this.vegetation = createVegetation(this.terrain);
    this.scene.add(this.vegetation.group);
    this.landmarks = createLandmarks(this.terrain);
    this.scene.add(this.landmarks.group);
    this.sky = createSky();
    this.scene.add(this.sky.mesh);
    this.atmosphere = createAtmosphere(this.scene);
    this.ocean = createOcean({ heightAt: (x, z) => this.terrain.heightAt(x, z) });
    this.scene.add(this.ocean.mesh);
    this.scene.add(this.contributions);

    this.cameraSystem = createCameraSystem(this.terrain, window.innerWidth / window.innerHeight);
    this.player = createPlayerController(this.terrain, WORLD.start.x, WORLD.start.z);
    this.player.state.yaw = WORLD.start.yaw;
    this.character = createCharacter(PLAYER_PALETTES[this.paletteIndex] ?? PLAYER_PALETTES[0]!);
    this.scene.add(this.character.object);
    this.audio = createAudio();
    this.presence = createPresence(this.visitorId, this.paletteIndex);
    this.input = createInput(this.canvas);
    this.anchors = this.buildAnchors();

    this.applyEnvironment();
    this.rebuildContributions();
    this.wireEvents();

    const demo = new URLSearchParams(window.location.search).has('demo');
    if (demo) this.seedDemonstration();
  }

  private pixelRatioFor(quality: UISettings['quality']): number {
    const dpr = window.devicePixelRatio || 1;
    if (quality === 'low') return Math.min(1, dpr);
    if (quality === 'medium') return Math.min(1.4, dpr);
    return Math.min(2, dpr);
  }

  async init(): Promise<void> {
    this.ui.setLoadingProgress(0.35);
    this.ui.wireSettings(
      this.settings,
      (s) => this.applySettings(s),
      () => this.eraseContributions(),
    );
    this.ui.setControlHint(false);

    // Render one frame behind the arrival veil so the reveal is instantaneous.
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    this.ui.setLoadingProgress(0.8);
    this.render();
    this.ui.setLoadingProgress(1);
    this.ui.ready(() => this.enter());
    this.lastFrame = performance.now();
    requestAnimationFrame(this.frame);
  }

  private enter(): void {
    this.started = true;
    this.audio.start();
    this.applyAudioVolumes();
    this.arrivalUntil = this.time + 7;
    this.player.teleport(WORLD.start.x, WORLD.start.z);
    this.player.state.yaw = WORLD.start.yaw;
    this.cameraSystem.snap();
    const firstVisit = this.recentVisits === 0;
    this.world.visits += 1;
    this.world.lastVisit = Date.now();
    saveWorld(this.world);
    this.ui.setControlHint(true);
    window.setTimeout(() => this.ui.setControlHint(false), 22_000);
    window.setTimeout(() => {
      this.ui.showCaption(
        firstVisit
          ? 'You have arrived. The island keeps its own time.'
          : 'You are back. The island remembers.',
        8000,
      );
    }, 1600);
    this.audio.softTone(392);
    this.ui.setPresence(false);
  }

  private wireEvents(): void {
    window.addEventListener('resize', this.onResize);
    this.canvas.addEventListener('pointerdown', () => this.canvas.focus());
    this.canvas.tabIndex = 0;
    document.addEventListener('visibilitychange', this.onVisibility);
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
  }

  private readonly onResize = (): void => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.renderer.setPixelRatio(this.pixelRatioFor(this.settings.quality));
    this.renderer.setSize(width, height, false);
  };

  private readonly onKeyDown = (e: KeyboardEvent): void => {
    if (e.code === 'Escape') {
      if (this.ui.modalOpen) this.ui.closeAll();
      else this.ui.toggleSettings();
    }
    if (this.ui.modalOpen) return;
    if (e.code === 'KeyQ' && !e.repeat) this.waveUntil = this.time + 2.2;
    if (e.code === 'KeyL' && !e.repeat) void this.leaveMoment();
  };

  private readonly onKeyUp = (_e: KeyboardEvent): void => {
    // Movement state is owned by the input manager.
  };

  private applySettings(s: UISettings): void {
    this.settings = s;
    saveSettings(s);
    this.ui.applyAccessibility(s);
    this.applyAudioVolumes();
    this.renderer.setPixelRatio(this.pixelRatioFor(s.quality));
    this.renderer.setSize(window.innerWidth, window.innerHeight, false);
  }

  private applyAudioVolumes(): void {
    this.audio.setVolumes({ master: this.settings.master, music: this.settings.music, ambience: this.settings.ambience });
  }

  private applyEnvironment(): void {
    this.sky.update(this.environment);
    this.atmosphere.update(this.environment, 0);
    this.ocean.update(0, this.time, this.environment, this.cameraSystem.camera);
    this.renderer.toneMappingExposure = this.environment.exposure;
  }

  private buildAnchors(): WorldAnchor[] {
    const anchors = this.landmarks.anchors.slice();
    const ensure = (id: string, anchor: WorldAnchor): void => {
      if (!anchors.some((a) => a.id === id)) anchors.push(anchor);
    };
    const y = (x: number, z: number): number => this.terrain.heightAt(x, z);
    ensure('pierEnd', {
      id: 'pierEnd',
      kind: 'view',
      label: 'Watch the water',
      position: new Vector3(WORLD.landmarks.pierEnd.x, y(WORLD.landmarks.pierEnd.x, WORLD.landmarks.pierEnd.z), WORLD.landmarks.pierEnd.z),
      radius: 6,
    });
    ensure('arrival', {
      id: 'arrival',
      kind: 'view',
      label: 'Look back',
      position: new Vector3(WORLD.landmarks.arrival.x, y(WORLD.landmarks.arrival.x, WORLD.landmarks.arrival.z), WORLD.landmarks.arrival.z),
      radius: 5,
    });
    return anchors;
  }

  private frame = (now: number): void => {
    const raw = (now - this.lastFrame) / 1000;
    this.lastFrame = now;
    const dt = Math.min(0.05, Math.max(0.0001, raw));
    this.time += dt;

    if (now - this.lastEnvSample > 1200) {
      this.lastEnvSample = now;
      this.environment = sampleEnvironment();
      this.applyEnvironment();
    }

    this.update(dt);
    this.render();
    requestAnimationFrame(this.frame);
  };

  private update(dt: number): void {
    const active = this.started && !this.ui.modalOpen;
    const movement = active ? this.input.state : ZERO_INPUT;
    const mode = this.cameraMode();
    const look = this.cameraSystem.camera.getWorldDirection(new Vector3());
    const cameraYaw = Math.atan2(look.x, look.z);

    this.player.update(dt, movement, cameraYaw);
    this.character.object.position.copy(this.player.state.position);
    this.character.object.rotation.y = this.player.state.yaw;
    const animation = this.characterAnimation();
    this.character.update(dt, animation, this.player.state.speed, this.time);
    this.cameraSystem.update(dt, {
      player: this.player.state,
      mode,
      reducedMotion: this.settings.reducedMotion || this.reduceMotionQuery.matches,
      manualYawOffset: this.input.pointerX,
      viewportAspect: window.innerWidth / Math.max(1, window.innerHeight),
    });

    this.vegetation.update(this.time, this.environment.windStrength);
    this.landmarks.update(dt, this.time, this.environment);
    this.ocean.update(dt, this.time, this.environment, this.cameraSystem.camera);
    this.sky.update(this.environment);
    this.atmosphere.update(this.environment, dt);

    if (this.started) {
      this.audio.update(dt, this.environment, this.player.state.position);
      this.updateFootsteps(dt);
      this.presence.update(dt, {
        x: this.player.state.position.x,
        y: this.player.state.position.y,
        z: this.player.state.position.z,
        yaw: this.player.state.yaw,
        speed: this.player.state.speed,
        sitting: this.player.state.sitting,
        anim: animation,
      });
      this.updateRemotes(dt);
      this.updateGhost(dt);
      this.updateInteractions();
      this.updateTempAnimation(dt);
      if (this.time - this.lastPresenceUi > 1) {
        this.lastPresenceUi = this.time;
        this.ui.setPresence(this.presence.count() > 0);
      }
      if (this.viewpointUntil > 0 && this.time > this.viewpointUntil) this.viewpointUntil = 0;
    } else {
      this.character.update(dt, 'idle', 0, this.time);
    }
  }

  private cameraMode(): CameraMode {
    if (this.sittingAnchor) return 'bench';
    if (this.viewpointUntil > this.time) return 'viewpoint';
    if (this.started && this.time < this.arrivalUntil) return 'arrival';
    return 'explore';
  }

  private characterAnimation(): CharacterAnimation {
    if (this.sittingAnchor) return 'sit';
    if (this.time < this.waveUntil) return 'wave';
    if (this.tempAnimation) return 'hold';
    const speed = this.player.state.speed;
    if (speed > 4.6) return 'run';
    if (speed > 0.25) return 'walk';
    return 'idle';
  }

  private updateFootsteps(dt: number): void {
    const speed = this.player.state.speed;
    if (!this.player.state.grounded || speed < 0.3) {
      this.stride = 0;
      return;
    }
    this.stride += speed * dt;
    const threshold = speed > 4.6 ? 2.3 : 1.75;
    if (this.stride > threshold) {
      this.stride = 0;
      this.audio.footstep(speed > 4.6);
    }
  }

  private nearestAnchor(): WorldAnchor | null {
    let best: WorldAnchor | null = null;
    let bestD = Infinity;
    for (const anchor of this.anchors) {
      const dx = this.player.state.position.x - anchor.position.x;
      const dz = this.player.state.position.z - anchor.position.z;
      const d = Math.hypot(dx, dz);
      if (d < anchor.radius && d < bestD) {
        best = anchor;
        bestD = d;
      }
    }
    return best;
  }

  private updateInteractions(): void {
    if (!this.started) return;
    if (this.ui.modalOpen) {
      this.ui.setPrompt(null);
      return;
    }
    if (this.sittingAnchor) {
      this.ui.setPrompt('Stand up');
      if (this.input.consumeInteract()) this.stand();
      return;
    }
    if (this.viewpointUntil > this.time) {
      this.ui.setPrompt('Return');
      if (this.input.consumeInteract()) {
        this.viewpointUntil = 0;
        this.ui.setPrompt(null);
      }
      return;
    }
    const anchor = this.nearestAnchor();
    this.ui.setPrompt(anchor ? anchor.label : null);
    const interact = this.input.consumeInteract();
    const wave = this.input.consumeWave();
    const leave = this.input.consumeLeave();
    void leave;
    if (interact && anchor) void this.activate(anchor);
    if (wave && !anchor) this.waveUntil = this.time + 2.4;
  }

  private async activate(anchor: WorldAnchor): Promise<void> {
    switch (anchor.id) {
      case 'bench':
        this.sit(anchor);
        return;
      case 'grove':
        this.leaveFlower();
        return;
      case 'bottleBeach':
        await this.bottleInteraction();
        return;
      case 'overlook':
        this.viewpointUntil = this.time + 16;
        this.audio.chime(2);
        this.ui.toast('The horizon holds still for a moment.');
        return;
      case 'lighthouse':
        this.audio.softTone(196);
        this.ui.toast(this.presence.count() > 0
          ? 'The lamp turns for everyone here.'
          : 'The lamp keeps its own company.');
        return;
      case 'cottage':
        this.audio.softTone(261.63);
        this.ui.toast('A kettle. A chair. A window left open.');
        return;
      case 'pierEnd':
        this.audio.chime(1);
        this.ui.toast('The water keeps arriving.');
        return;
      case 'arrival':
        this.ui.showCaption('Everything here was already waiting.', 5000);
        return;
      default:
        this.audio.softTone(330);
    }
  }

  private sit(anchor: WorldAnchor): void {
    this.sittingAnchor = anchor;
    this.sittingSince = this.time;
    this.echoRevealed = false;
    const seat = new Vector3(anchor.position.x, anchor.position.y + 0.42, anchor.position.z);
    this.player.setSitting(true, seat, anchor.facing ?? 0);
    this.audio.setIntimate(true);
    this.audio.softTone(261.63);
    this.waveUntil = 0;
    this.ui.setPrompt('Stand up');
  }

  private stand(): void {
    this.sittingAnchor = null;
    this.player.setSitting(false);
    this.removeGhost();
    this.ui.hideEcho();
    this.audio.setIntimate(false);
    this.ui.setPrompt(null);
  }

  private revealEcho(): void {
    if (!this.sittingAnchor) return;
    const echo = this.echoes.forAnchor('bench');
    if (echo) {
      const palette = PLAYER_PALETTES[echo.paletteIndex % PLAYER_PALETTES.length] ?? PLAYER_PALETTES[0]!;
      const ghost = createCharacter(palette);
      ghost.setGhost(true);
      const side = new Vector3(Math.cos(this.sittingAnchor.facing ?? 0), 0, -Math.sin(this.sittingAnchor.facing ?? 0));
      ghost.object.position.copy(this.player.state.position).addScaledVector(side, 0.86);
      ghost.object.position.y = this.player.state.position.y;
      ghost.object.rotation.y = this.player.state.yaw;
      this.echoGhost = ghost;
      this.ghostAge = 0;
      this.ghostFade = 0;
      this.scene.add(ghost.object);
      this.ui.showEcho(this.echoes.label(echo).text, this.echoes.label(echo).sub);
      this.audio.softTone(329.63);
      return;
    }
    const own = this.echoes.ownAt('bench');
    if (own) {
      this.ui.showEcho('Your moment is still here.', `Left by you ${relativeTime(own.createdAt)}`);
      return;
    }
    this.ui.showEcho('No one has sat here yet.', 'Press L to leave this moment for whoever comes next.');
  }

  private removeGhost(): void {
    if (!this.echoGhost) return;
    this.scene.remove(this.echoGhost.object);
    this.echoGhost.dispose();
    this.echoGhost = null;
  }

  private updateGhost(dt: number): void {
    if (!this.sittingAnchor) return;
    if (!this.echoRevealed && this.time - this.sittingSince > 1.8) {
      this.echoRevealed = true;
      this.revealEcho();
    }
    if (!this.echoGhost) return;
    this.ghostAge += dt;
    const fadeIn = Math.min(1, this.ghostAge / 2.2);
    const fadeOut = Math.max(0, Math.min(1, (24 - this.ghostAge) / 4));
    this.ghostFade = Math.min(fadeIn, fadeOut);
    this.echoGhost.setOpacity(this.ghostFade);
    this.echoGhost.update(dt, this.ghostAge > 8 && this.ghostAge < 11 ? 'wave' : 'sit', 0, this.time + 30);
    if (this.ghostAge > 24) this.removeGhost();
  }

  private async leaveMoment(): Promise<void> {
    if (!this.sittingAnchor || this.ui.modalOpen) return;
    if (this.echoes.ownAt('bench')) {
      this.ui.toast('A moment of yours already rests here.');
      return;
    }
    this.echoes.create('bench', this.paletteIndex, 'look');
    saveWorld(this.world);
    this.ui.showEcho('This moment will stay here.', 'Left by you, just now');
    this.audio.chime(3);
    this.ui.toast('Anyone who sits here after you may feel it.');
  }

  private leaveFlower(): void {
    const ownFlowers = this.world.flowers.filter((f) => f.contributorId === this.visitorId);
    if (ownFlowers.length >= 3) {
      this.ui.toast('You have already left three flowers here.');
      return;
    }
    const used = new Set(this.world.flowers.map((f) => f.slot));
    let slot = 0;
    while (used.has(slot) && slot < 24) slot += 1;
    const colors = [0xd9a0a8, 0xe8d5a3, 0xb7c6d6, 0xd7b4c6, 0xefe3c8];
    this.world.flowers.push({
      id: `flower_${Date.now().toString(36)}`,
      contributorId: this.visitorId,
      slot,
      createdAt: Date.now(),
      color: colors[slot % colors.length]!,
    });
    this.world.ownContributions.push(`flower_${slot}`);
    saveWorld(this.world);
    this.rebuildContributions();
    this.audio.chime(slot);
    this.ui.toast('A flower for whoever comes next.');
  }

  private async bottleInteraction(): Promise<void> {
    const now = Date.now();
    const candidate = this.world.bottles
      .filter((b) => !b.foundAt && b.contributorId !== this.visitorId && b.reports < 2 && b.releasedAt < now - 20_000)
      .sort((a, b) => a.releasedAt - b.releasedAt)[0];
    if (candidate) {
      this.audio.softTone(293.66);
      const choice = await this.ui.readBottle(
        candidate.text,
        `Washed ashore · ${relativeTime(candidate.releasedAt)}`,
        [
          { label: 'Keep it', value: 'keep' },
          { label: 'Set it back', value: 'release' },
          { label: 'Report', value: 'report' },
        ],
      );
      if (choice === 'keep') {
        candidate.foundAt = Date.now();
        this.ui.toast('You kept the message. It is out of the water now.');
      } else if (choice === 'release') {
        candidate.releasedAt = Date.now();
        candidate.foundAt = undefined;
        this.ui.toast('You set it back into the tide.');
      } else if (choice === 'report') {
        candidate.reports += 1;
        candidate.foundAt = Date.now();
        this.ui.toast('Thank you. The message has been put away.');
      }
      saveWorld(this.world);
      this.rebuildContributions();
      return;
    }

    const own = this.world.bottles.filter((b) => b.contributorId === this.visitorId && !b.foundAt);
    if (own.length >= 3) {
      this.ui.toast('The tide already carries enough of your words.');
      return;
    }
    await this.ui.compose({
      title: 'A message in a bottle',
      hint: 'It will drift for a while, then find another shore.',
      maxLength: 180,
      submitLabel: 'Release',
      onSubmit: (text) => this.releaseBottle(text),
      onCancel: () => undefined,
    });
  }

  private releaseBottle(text: string): void {
    const now = Date.now();
    const record: BottleRecord = {
      id: `bottle_${now.toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      contributorId: this.visitorId,
      createdAt: now,
      text,
      releasedAt: now,
      reports: 0,
    };
    this.world.bottles.push(record);
    this.world.ownContributions.push(record.id);
    const excess = this.world.bottles.length - 20;
    if (excess > 0) this.world.bottles.splice(0, excess);
    saveWorld(this.world);
    this.animateBottleRelease();
    this.rebuildContributions();
    this.audio.softTone(392);
    this.ui.toast('The tide takes it.');
  }

  private animateBottleRelease(): void {
    const bottle = this.makeBottleMesh(new Color(0x8fb8a8));
    const from = this.player.state.position.clone().add(new Vector3(0, 1.0, 0));
    const outward = new Vector3(this.player.state.position.x, 0, this.player.state.position.z).normalize();
    if (outward.lengthSq() < 0.1) outward.set(0, 0, 1);
    const mid = from.clone().addScaledVector(outward, 3.5);
    mid.y += 2.2;
    const to = from.clone().addScaledVector(outward, 16);
    to.y = 0.25;
    bottle.position.copy(from);
    this.scene.add(bottle);
    this.tempAnimation = { group: bottle, from, mid, to, age: 0, duration: 4.2, spin: 0 };
    window.setTimeout(() => { this.waveUntil = this.time + 1.2; }, 150);
  }

  private updateTempAnimation(dt: number): void {
    const anim = this.tempAnimation;
    if (!anim) return;
    anim.age += dt;
    const t = Math.min(1, anim.age / anim.duration);
    const e = t * t * (3 - 2 * t);
    const a = anim.from.clone().lerp(anim.mid, e);
    const b = anim.mid.clone().lerp(anim.to, e);
    anim.group.position.copy(a.lerp(b, e));
    anim.spin += dt * (1.5 + t * 3);
    anim.group.rotation.set(anim.spin * 0.6, anim.spin, Math.sin(anim.spin) * 0.4);
    if (t >= 1) {
      this.scene.remove(anim.group);
      disposeObject(anim.group);
      this.tempAnimation = null;
    }
  }

  private makeBottleMesh(glass: Color): Group {
    const group = new Group();
    const glassMat = new MeshStandardMaterial({
      color: glass,
      roughness: 0.18,
      metalness: 0.05,
      transparent: true,
      opacity: 0.82,
    });
    const body = new Mesh(new CylinderGeometry(0.11, 0.13, 0.42, 10), glassMat);
    const shoulder = new Mesh(new CylinderGeometry(0.05, 0.11, 0.1, 10), glassMat);
    shoulder.position.y = 0.26;
    const neck = new Mesh(new CylinderGeometry(0.045, 0.045, 0.14, 8), glassMat);
    neck.position.y = 0.37;
    const cork = new Mesh(new CylinderGeometry(0.047, 0.05, 0.06, 8), new MeshStandardMaterial({ color: 0x9c7a52, roughness: 1 }));
    cork.position.y = 0.46;
    group.add(body, shoulder, neck, cork);
    const paper = new Mesh(new BoxGeometry(0.11, 0.2, 0.02), new MeshStandardMaterial({ color: 0xefe2c8, roughness: 1 }));
    paper.position.y = 0.02;
    paper.rotation.z = 0.15;
    group.add(paper);
    return group;
  }

  private rebuildContributions(): void {
    for (const child of [...this.contributions.children]) {
      this.contributions.remove(child);
      disposeObject(child);
    }
    const grove = WORLD.landmarks.grove;
    this.world.flowers.slice(-24).forEach((flower, index) => {
      const angle = (flower.slot / 12) * Math.PI * 2 + 0.3;
      const radius = 3.2 + (flower.slot % 3) * 1.1;
      const x = grove.x + Math.cos(angle) * radius;
      const z = grove.z + Math.sin(angle) * radius;
      const group = new Group();
      const stem = new Mesh(new CylinderGeometry(0.02, 0.03, 0.45, 5), new MeshStandardMaterial({ color: 0x66805f, roughness: 1 }));
      stem.position.y = 0.22;
      const head = new Mesh(new SphereGeometry(0.1, 8, 6), new MeshStandardMaterial({ color: flower.color, roughness: 0.9 }));
      head.position.y = 0.5;
      head.scale.y = 0.8;
      group.add(stem, head);
      group.position.set(x, this.terrain.heightAt(x, z), z);
      group.rotation.y = angle + index;
      this.contributions.add(group);
    });

    const beach = WORLD.landmarks.bottleBeach;
    const now = Date.now();
    const visible = this.world.bottles
      .filter((b) => !b.foundAt && b.reports < 2 && b.releasedAt < now - 20_000)
      .slice(-5);
    visible.forEach((bottle, index) => {
      const angle = bottleBeachAngle(index);
      const radius = 3 + index * 1.6;
      const x = beach.x + Math.cos(angle) * radius;
      const z = beach.z + Math.sin(angle) * radius;
      const mesh = this.makeBottleMesh(new Color(index % 2 === 0 ? 0x91b7a6 : 0xb0b9a1));
      mesh.position.set(x, Math.max(this.terrain.heightAt(x, z) + 0.12, 0.16), z);
      mesh.rotation.z = Math.PI / 2.2;
      mesh.rotation.y = angle + 1.2;
      mesh.scale.setScalar(1.15);
      this.contributions.add(mesh);
    });
  }

  private updateRemotes(dt: number): void {
    const locals = this.presence.remotes();
    for (const remote of locals) {
      let character = this.remoteCharacters.get(remote.id);
      if (!character) {
        character = createCharacter(PLAYER_PALETTES[remote.paletteIndex % PLAYER_PALETTES.length] ?? PLAYER_PALETTES[0]!);
        character.object.position.set(remote.x, remote.y, remote.z);
        this.scene.add(character.object);
        this.remoteCharacters.set(remote.id, character);
        this.interpolateRemote(remote, dt, true);
      } else {
        this.interpolateRemote(remote, dt, false);
      }
      character.object.position.set(remote.renderX, remote.renderY, remote.renderZ);
      character.object.rotation.y = remote.renderYaw;
      character.update(dt, remote.animation, remote.speed, this.time + remote.paletteIndex);
    }
    const ids = new Set(locals.map((v) => v.id));
    for (const [id, character] of this.remoteCharacters) {
      if (!ids.has(id)) {
        this.scene.remove(character.object);
        character.dispose();
        this.remoteCharacters.delete(id);
      }
    }
  }

  private interpolateRemote(remote: RemoteVisitor, dt: number, snap: boolean): void {
    if (snap) {
      remote.renderX = remote.x;
      remote.renderY = remote.y;
      remote.renderZ = remote.z;
      remote.renderYaw = remote.yaw;
      return;
    }
    const k = 1 - Math.exp(-10 * dt);
    remote.renderX += (remote.x - remote.renderX) * k;
    remote.renderZ += (remote.z - remote.renderZ) * k;
    remote.renderY += (remote.y - remote.renderY) * k;
    let delta = ((remote.yaw - remote.renderYaw + Math.PI) % (Math.PI * 2)) - Math.PI;
    if (delta < -Math.PI) delta += Math.PI * 2;
    remote.renderYaw += delta * k;
  }

  private eraseContributions(): void {
    this.world.echoes = [];
    this.world.bottles = [];
    this.world.flowers = [];
    this.world.ownContributions = [];
    saveWorld(this.world);
    this.rebuildContributions();
    this.removeGhost();
    this.ui.hideEcho();
  }

  private seedDemonstration(): void {
    const day = 86_400_000;
    if (!this.world.echoes.some((e) => e.authored)) {
      this.world.echoes.push({
        id: 'demo_echo_bench',
        contributorId: 'authored-demo',
        anchorId: 'bench',
        createdAt: Date.now() - day * 3,
        paletteIndex: 3,
        gesture: 'look',
        durationMs: 24_000,
        authored: true,
        message: 'I hope the water is still this colour.',
      });
    }
    if (!this.world.bottles.some((b) => b.contributorId === 'authored-demo')) {
      this.world.bottles.push({
        id: 'demo_bottle',
        contributorId: 'authored-demo',
        createdAt: Date.now() - day * 5,
        text: 'If you find this, the sun was warm and the gulls were loud. I hope you are alright.',
        releasedAt: Date.now() - day * 4,
        reports: 0,
      });
    }
    saveWorld(this.world);
    this.ui.toast('Demonstration content enabled. Authored, not from a real visitor.', 7000);
  }

  private render(): void {
    this.renderer.render(this.scene, this.cameraSystem.camera);
  }
}

function bottleBeachAngle(index: number): number {
  return WORLD.landmarks.bottleBeach.yaw + (index - 2) * 0.45;
}

function disposeObject(object: Object3D): void {
  object.traverse((child) => {
    if (child instanceof Mesh) {
      child.geometry.dispose();
      const material = child.material;
      if (Array.isArray(material)) material.forEach((m) => m.dispose());
      else material.dispose();
    }
  });
}

