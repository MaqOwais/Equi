import { create } from 'zustand';
import Constants from 'expo-constants';

// expo-av requires a native dev build — not available in Expo Go.
// We lazy-require it so the store and screen load without crashing.
const IS_EXPO_GO = Constants.executionEnvironment === 'storeClient';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let ExpoAV: any = null;
if (!IS_EXPO_GO) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    ExpoAV = require('expo-av');
  } catch {
    // expo-av not installed — safe fallback
  }
}

// ─── Scene definitions ────────────────────────────────────────────────────────

export interface AmbientScene {
  id: string;
  label: string;
  icon: string;
  description: string;
  bgFrom: string;
  bgTo: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  asset: any; // require() result — replaced with null if file not yet added
}

export const SCENES: AmbientScene[] = [
  {
    id: 'beach',
    label: 'Beach',
    icon: '🏖️',
    description: 'Waves, salt air, gentle tide',
    bgFrom: '#89B4CC',
    bgTo: '#E8DCC8',
    asset: null, // replace with: require('../assets/sounds/beach.mp3')
  },
  {
    id: 'mountains',
    label: 'Mountains',
    icon: '⛰️',
    description: 'Wind through pines, open sky',
    bgFrom: '#A8C5A0',
    bgTo: '#3D3935',
    asset: null, // replace with: require('../assets/sounds/mountains.mp3')
  },
  {
    id: 'forest',
    label: 'Forest',
    icon: '🌲',
    description: 'Birdsong, rustling leaves',
    bgFrom: '#6B9E7A',
    bgTo: '#A8C5A0',
    asset: null, // replace with: require('../assets/sounds/forest.mp3')
  },
  {
    id: 'fireplace',
    label: 'Fireplace',
    icon: '🔥',
    description: 'Crackling wood, warm glow',
    bgFrom: '#C9A84C',
    bgTo: '#3D3935',
    asset: null, // replace with: require('../assets/sounds/fireplace.mp3')
  },
  {
    id: 'rain',
    label: 'Rain',
    icon: '🌧️',
    description: 'Steady rain on a window',
    bgFrom: '#7A96B0',
    bgTo: '#89B4CC',
    asset: null, // replace with: require('../assets/sounds/rain.mp3')
  },
  {
    id: 'nightsky',
    label: 'Night Sky',
    icon: '🌙',
    description: 'Crickets, still air, deep quiet',
    bgFrom: '#2E3A52',
    bgTo: '#3D3935',
    asset: null, // replace with: require('../assets/sounds/nightsky.mp3')
  },
];

// ─── Module-level Sound instance (non-serializable, lives outside Zustand) ───

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _sound: any = null;

async function _unloadCurrent() {
  if (_sound) {
    try {
      await _sound.stopAsync();
      await _sound.unloadAsync();
    } catch (_) { /* ignore */ }
    _sound = null;
  }
}

// ─── Store ────────────────────────────────────────────────────────────────────

interface AmbientStore {
  activeSceneId: string | null;
  volume: number;        // 0.0 – 1.0
  isPlaying: boolean;
  loadError: boolean;
  /** true when running inside Expo Go (audio unavailable) */
  isExpoGo: boolean;

  selectScene: (id: string) => Promise<void>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  stop: () => Promise<void>;
  setVolume: (v: number) => Promise<void>;
}

export const useAmbientStore = create<AmbientStore>((set, get) => ({
  activeSceneId: null,
  volume: 0.7,
  isPlaying: false,
  loadError: false,
  isExpoGo: IS_EXPO_GO,

  selectScene: async (id) => {
    const scene = SCENES.find((s) => s.id === id);
    if (!scene) return;

    // In Expo Go: just mark selected, no audio
    if (IS_EXPO_GO || !ExpoAV) {
      set({ activeSceneId: id, isPlaying: false, loadError: false });
      return;
    }

    await _unloadCurrent();
    set({ activeSceneId: id, isPlaying: false, loadError: false });

    if (!scene.asset) {
      // Audio file not yet added — UI shows a placeholder state
      set({ loadError: true });
      return;
    }

    try {
      await ExpoAV.Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
      });

      const { sound } = await ExpoAV.Audio.Sound.createAsync(scene.asset, {
        isLooping: true,
        volume: get().volume,
        shouldPlay: true,
      });

      _sound = sound;
      set({ isPlaying: true });
    } catch (e) {
      console.warn('[Ambient] Failed to load audio:', e);
      set({ loadError: true });
    }
  },

  pause: async () => {
    if (_sound) {
      try { await _sound.pauseAsync(); } catch (_) { /* ignore */ }
    }
    set({ isPlaying: false });
  },

  resume: async () => {
    if (_sound) {
      try { await _sound.playAsync(); } catch (_) { /* ignore */ }
      set({ isPlaying: true });
    } else {
      const { activeSceneId, selectScene } = get();
      if (activeSceneId) await selectScene(activeSceneId);
    }
  },

  stop: async () => {
    await _unloadCurrent();
    set({ activeSceneId: null, isPlaying: false, loadError: false });
  },

  setVolume: async (v) => {
    set({ volume: v });
    if (_sound) {
      try { await _sound.setVolumeAsync(v); } catch (_) { /* ignore */ }
    }
  },
}));

// ─── Convenience hook for screens to consume scene accent colors ─────────────

const DARK_SCENE_IDS = new Set(['fireplace', 'nightsky']);

export function useAmbientTheme() {
  const { activeSceneId, isPlaying } = useAmbientStore();
  const activeScene = SCENES.find(s => s.id === activeSceneId);
  const accent = activeScene?.bgFrom ?? '#A8C5A0';
  const isDark = !!activeSceneId && DARK_SCENE_IDS.has(activeSceneId);

  // Cartoon-style card surface: fully white + vivid scene-coloured shadow + accent border.
  // The scene is visible AROUND cards (transparent header/gaps), NOT through them.
  const cardSurface = activeScene
    ? {
        backgroundColor: isDark ? 'rgba(28,16,8,0.85)' : '#FFFFFF',
        shadowColor: accent,
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.28,
        shadowRadius: 14,
        elevation: 7,
        borderColor: accent + '70',
        borderWidth: 1.5,
      }
    : {
        backgroundColor: '#FFFFFF',
        shadowColor: '#3D3935',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
      };

  // Section label style: bold accent colour, no faded opacity
  const sectionLabelStyle = activeScene
    ? { color: accent, opacity: 1 as const, fontWeight: '800' as const }
    : { opacity: 0.35 as const };

  return {
    accent,
    // Keep cardBg for backwards-compat; cardSurface is the full elevated style
    cardBg:          activeScene ? (isDark ? 'rgba(28,16,8,0.85)' : '#FFFFFF') : '#FFFFFF',
    cardBgStrong:    activeScene ? (isDark ? 'rgba(40,24,12,0.92)' : '#FFFFFF') : '#FFFFFF',
    cardSurface,
    sectionLabelStyle,
    cardBorder:      activeScene ? accent + '70' : '#EBEBEB',
    cardBorderLight: activeScene ? accent + '44' : '#EBEBEB',
    // Text — dark on white cards; white on dark-scene cards
    textPrimary:   isDark ? '#FFFFFF'                   : '#3D3935',
    textSecondary: isDark ? 'rgba(255,255,255,0.70)'    : 'rgba(61,57,53,0.55)',
    // Utility
    accentBg:    accent + '22',
    accentBgMid: accent + '44',
    isDark,
    isActive: !!activeScene,
    isPlaying,
    activeScene,
  };
}
